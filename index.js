/**
 * VEX MINI BOT - ULTIMATE CLOUD SYNC (RELOADED)
 * Feature: Supabase Realtime Sync + Organic Auto-Typing + Self-Response Enabled
 * Dev: Lupin Starnley
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
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require('qrcode');
const { createClient } = require('@supabase/supabase-js');

// 1. SUPABASE INITIALIZATION
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;

const commands = new Map();
const cmdPath = path.join(__dirname, 'vex');

// Real-time Settings Cache
let vexSettings = {};

// 2. SUPABASE SYNC LOGIC
async function syncSessionToCloud(creds) {
    try {
        const base64Data = Buffer.from(JSON.stringify(creds)).toString('base64');
        await supabase.from('vex_session').upsert({ id: 'v1_session', data: base64Data });
    } catch (e) { console.error('☁️ [SUPABASE SAVE ERROR]:', e.message); }
}

async function loadSessionFromCloud() {
    try {
        const { data } = await supabase.from('vex_session').select('data').eq('id', 'v1_session').single();
        if (data) {
            const decoded = Buffer.from(data.data, 'base64').toString('utf-8');
            if (!fs.existsSync('./session')) fs.mkdirSync('./session');
            fs.writeFileSync('./session/creds.json', decoded);
            console.log('✅ [VEX]: Cloud Session Restored.');
        }
    } catch (e) { console.log('ℹ️ [VEX]: No cloud session found, starting fresh.'); }
}

async function loadVexSettings() {
    try {
        const { data } = await supabase.from('vex_settings').select('*');
        if (data) {
            data.forEach(s => vexSettings[s.setting_name] = { value: s.value, extra: s.extra_data });
        }
    } catch (e) { console.error('⚙️ [SETTINGS LOAD ERROR]:', e.message); }
}

// REAL-TIME LISTENER
supabase
  .channel('settings_changes')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vex_settings' }, (payload) => {
    const updated = payload.new;
    vexSettings[updated.setting_name] = { value: updated.value, extra: updated.extra_data };
    console.log(`🔄 [REALTIME]: ${updated.setting_name} updated to ${updated.value}`);
  })
  .subscribe();

// 3. CORE LOGIC
function loadCommands() {
    if (fs.existsSync(cmdPath)) {
        fs.readdirSync(cmdPath).filter(f => f.endsWith('.js')).forEach(file => {
            try {
                const cmd = require(path.join(cmdPath, file));
                commands.set(cmd.vex || file.split('.')[0], cmd);
            } catch (e) { console.error(`🔥 [LOAD ERROR] ${file}:`, e.message); }
        });
    }
}

async function startVex() {
    await loadVexSettings();
    await loadSessionFromCloud();
    loadCommands();

    const { state, saveCreds } = await useMultiFileAuthState('session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "fatal" }),
        printQRInTerminal: false, 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
        },
        browser: ["VEX-CORE", "Chrome", "3.0.0"],
        syncFullHistory: false
    });

    // --- AUTO STATUS LIKE ENGINE ---
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        if (vexSettings['autostatus_like']?.value) {
            const m = chatUpdate.messages[0];
            if (m.key && m.key.remoteJid === 'status@broadcast') {
                await sock.readMessages([m.key]);
                await sock.sendMessage('status@broadcast', { 
                    react: { text: '💜', key: m.key } 
                }, { statusJidList: [m.key.participant] });
            }
        }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) io.emit('qr', await QRCode.toDataURL(qr));
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`⚠️ Connection closed. Reconnecting: ${shouldReconnect}`);
            if (shouldReconnect) startVex();
        } else if (connection === 'open') {
            io.emit('connected');
            console.log('VEX CORE ONLINE ✅');
            
            await syncSessionToCloud(state.creds);

            if (vexSettings['always_online']?.value) {
                await sock.sendPresenceUpdate('available');
            }

            // Asset Sender
            setTimeout(async () => {
                const imgPath = path.join(__dirname, 'assets/images/vex.png');
                const statusMsg = `*VEX SYSTEM ACTIVATED*\n\n✨ *Status:* Online\n📁 *Arsenal:* ${commands.size} Commands Loaded`;
                try {
                    if (fs.existsSync(imgPath)) {
                        await sock.sendMessage(sock.user.id, { image: { url: imgPath }, caption: statusMsg });
                    } else {
                        await sock.sendMessage(sock.user.id, { text: statusMsg });
                    }
                } catch (e) { console.error('Failed to send startup message'); }
            }, 5000);
        }
    });

    sock.ev.on('creds.update', async () => {
        await saveCreds();
        await syncSessionToCloud(state.creds); 
    });

    // --- MESSAGE HANDLER (CLEANED & OPTIMIZED) ---
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        const m = chatUpdate.messages[0];
        if (!m.message) return; 

        const remoteJid = m.key.remoteJid;
        const type = getContentType(m.message);
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? m.message.imageMessage.caption : 
                     (type === 'videoMessage') ? m.message.videoMessage.caption : '';

        // 1. Organic Auto-Typing (RUNS IN BACKGROUND)
        if (vexSettings['autotyping']?.value && !m.key.fromMe) {
            (async () => {
                await sock.sendPresenceUpdate('composing', remoteJid);
                const typeDelay = Math.floor(Math.random() * (30000 - 20000 + 1) + 20000);
                await delay(typeDelay);
                await sock.sendPresenceUpdate('paused', remoteJid);
            })(); 
        }

        // 2. Auto-React Logic
        if (vexSettings['autoreact']?.value && !m.key.fromMe) {
            const reacts = vexSettings['autoreact'].extra;
            if (reacts && reacts.length > 0) {
                const randomEmoji = reacts[Math.floor(Math.random() * reacts.length)];
                await sock.sendMessage(remoteJid, { react: { text: randomEmoji, key: m.key } });
            }
        }

        // 3. Command Logic (NO fromMe CHECK)
        if (!body.startsWith('.')) return;

        const args = body.slice(1).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const cmd = commands.get(cmdName);

        if (cmd) {
            console.log(`📡 [EXECUTING]: .${cmdName} from ${remoteJid}`);
            m.text = body;
            m.chat = remoteJid;
            m.isGroup = m.chat.endsWith('@g.us');
            m.sender = m.isGroup ? m.key.participant : m.chat;
            m.reply = (txt) => sock.sendMessage(m.chat, { text: txt }, { quoted: m });

            try {
                await cmd.execute(m, sock, commands);
            } catch (err) { console.error(`🛑 [EXECUTION FAIL] .${cmdName}:`, err); }
        }
    });
}

// Web Controller
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>VEX CORE</title><style>body { background: #050505; color: #00ffcc; font-family: 'Courier New', monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; } h1 { letter-spacing: 5px; text-shadow: 0 0 10px #00ffcc; }</style></head><body><h1>VEX SYSTEM ACTIVE ✅</h1></body></html>`);
});

server.listen(PORT, () => startVex());

process.on('uncaughtException', (err) => console.error('CRITICAL:', err));
process.on('unhandledRejection', (err) => console.error('PROMISE CRITICAL:', err));
