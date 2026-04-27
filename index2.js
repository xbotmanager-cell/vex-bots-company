/**
 * VEX MULTI-DEVICE MASTER SYSTEM - SAAS EDITION
 * Feature: Multi-Instance, Pairing Code, Supabase Realtime, Lazy Loading
 * Dev: Lupin Starnley (Mentor Brian)
 */

require('dotenv').config();
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore,
    getContentType,
    delay
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const path = require("path");
const fs = require("fs");
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const QRCode = require('qrcode'); // Hii ndio akili ya kutengeneza picha
const { createClient } = require('@supabase/supabase-js');

// 1. INITIALIZATION
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const PORT = process.env.PORT || 10000;

const botInstances = new Map(); 
const commands = new Map();
const cmdPath = path.join(__dirname, 'vex');

// 2. SUPABASE CLOUD SYNC
async function syncToCloud(jid, creds) {
    try {
        const base64Data = Buffer.from(JSON.stringify(creds)).toString('base64');
        await supabase.from('vex_sessions').upsert({ 
            user_jid: jid, 
            session_data: base64Data,
            last_seen: new Date()
        });
    } catch (e) { console.error(`☁️ [CLOUD ERROR ${jid}]:`, e.message); }
}

async function getSession(jid) {
    try {
        const { data } = await supabase.from('vex_sessions').select('session_data').eq('user_jid', jid).single();
        if (data) return JSON.parse(Buffer.from(data.session_data, 'base64').toString('utf-8'));
    } catch (e) { return null; }
}

// LOAD COMMANDS
function loadCommands() {
    if (fs.existsSync(cmdPath)) {
        fs.readdirSync(cmdPath).filter(f => f.endsWith('.js')).forEach(file => {
            try {
                const cmd = require(path.join(cmdPath, file));
                commands.set(cmd.vex || file.split('.')[0], cmd);
            } catch (e) { console.error(`🔥 [LOAD ERROR] ${file}:`, e.message); }
        });
        console.log(`📁 [VEX]: ${commands.size} Commands Loaded.`);
    }
}

// 3. CORE BOT ENGINE
async function startVexInstance(jid, usePairing = false, phoneNumber = null, m = null) {
    if (botInstances.has(jid)) return;

    const sessionDir = `./sessions/${jid.split('@')[0]}`;
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const cloudCreds = await getSession(jid);
    
    if (cloudCreds && !state.creds.registered) {
        state.creds = cloudCreds;
    }

    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
        version,
        logger: pino({ level: "fatal" }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
        },
        browser: ["VEX-CORE", "Chrome", "3.0.0"]
    });

    // Handle Pairing Code (Used by subbot.js)
    if (usePairing && phoneNumber && !sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(`📲 [PAIRING CODE FOR ${phoneNumber}]: ${code}`);
                
                if (m) {
                    await botInstances.get(process.env.ADMIN_JID)?.sendMessage(m.key.remoteJid, { 
                        text: `✅ *VEX PAIRING CODE*\n\nCode: *${code}*\n\nLink this in WhatsApp Settings.` 
                    });
                }
                io.emit('pairing_code', { jid, code });
            } catch (err) { console.error("Pairing Error:", err); }
        }, 3000);
    }

    botInstances.set(jid, sock);

    sock.ev.on('creds.update', async () => {
        await saveCreds();
        await syncToCloud(jid, state.creds);
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // QR Logic using Base64 DataURL (Fixed)
        if (qr && jid === process.env.ADMIN_JID) {
            try {
                const qrImage = await QRCode.toDataURL(qr);
                io.emit('qr', { jid, qr: qrImage });
            } catch (err) { console.error("QR Generation Error:", err); }
        }

        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            if (code !== DisconnectReason.loggedOut) {
                startVexInstance(jid);
            } else {
                botInstances.delete(jid);
                await supabase.from('users_bots').update({ is_active: false }).eq('user_jid', jid);
            }
        } else if (connection === 'open') {
            console.log(`✅ [CONNECTED]: ${jid}`);
            io.emit('connected', { jid });
            await syncToCloud(jid, state.creds);
            await supabase.from('users_bots').upsert({ user_jid: jid, is_active: true });
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        const m = chatUpdate.messages[0];
        if (!m.message || m.key.fromMe) return;

        const type = getContentType(m.message);
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : '';

        if (!body || !body.startsWith('.')) return;

        const args = body.slice(1).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const cmd = commands.get(cmdName);

        if (cmd) {
            const { data: user } = await supabase.from('users_bots').select('*').eq('user_jid', jid).single();
            if (user && user.is_active) {
                m.reply = (txt) => sock.sendMessage(m.key.remoteJid, { text: txt }, { quoted: m });
                try {
                    await cmd.execute(m, sock, { args, user, commands });
                    await supabase.rpc('increment_command_count', { row_id: jid });
                } catch (e) { console.error(e); }
            }
        }
    });

    return sock;
}

global.startNewInstance = startVexInstance;

// 4. ADMIN REALTIME CONTROLLER
supabase.channel('admin_control')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users_bots' }, (payload) => {
    const { user_jid, is_active } = payload.new;
    if (!is_active && botInstances.has(user_jid)) {
        botInstances.get(user_jid).logout();
        botInstances.delete(user_jid);
    }
  }).subscribe();

// WEB INTERFACE
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>VEX MASTER</title></head>
    <body style="background:#000; color:#0f0; text-align:center; font-family:monospace; padding-top:50px;">
        <h1>VEX SYSTEM TERMINAL</h1>
        <div id="qr-box"><img id="qr-img" src="" style="display:none; width:300px; border:2px solid #0f0; padding:10px; background:#fff;"></div>
        <h2 id="status">WAITING FOR CORE...</h2>
        <script src="/socket.io/socket.io.js"></script>
        <script>
            const socket = io();
            const qrImg = document.getElementById('qr-img');
            const status = document.getElementById('status');

            socket.on('qr', (data) => {
                qrImg.src = data.qr;
                qrImg.style.display = 'inline';
                status.innerText = 'SCAN TO ACTIVATE ADMIN';
            });
            socket.on('connected', () => {
                qrImg.style.display = 'none';
                status.innerText = 'SYSTEM ONLINE ✅';
                status.style.color = '#00ff00';
            });
        </script>
    </body></html>`);
});

// START SERVER
httpServer.listen(PORT, async () => {
    console.log(`🚀 [VEX MASTER] Port: ${PORT}`);
    loadCommands();

    if (process.env.ADMIN_JID) {
        await startVexInstance(process.env.ADMIN_JID);
    }

    const { data: bots } = await supabase.from('users_bots').select('user_jid').eq('is_active', true);
    if (bots) {
        for (const bot of bots) {
            if (bot.user_jid !== process.env.ADMIN_JID) {
                await startVexInstance(bot.user_jid);
                await delay(5000);
            }
        }
    }
});
