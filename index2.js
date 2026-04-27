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
const { createClient } = require('@supabase/supabase-js');

// 1. INITIALIZATION
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const PORT = process.env.PORT || 10000;

const botInstances = new Map(); // To manage all online sub-bots
const commands = new Map();
const cmdPath = path.join(__dirname, 'vex');

// 2. SUPABASE CLOUD SYNC FOR MULTI-SESSION
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

// 3. CORE BOT ENGINE (INSTANCING)
async function startVexInstance(jid, usePairing = false, phoneNumber = null) {
    if (botInstances.has(jid)) return;

    const sessionDir = `./sessions/${jid.split('@')[0]}`;
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    
    // Restore creds if available in cloud
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

    // Handle Pairing Code
    if (usePairing && phoneNumber && !sock.authState.creds.registered) {
        setTimeout(async () => {
            let code = await sock.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join('-') || code;
            console.log(`📲 [PAIRING CODE FOR ${phoneNumber}]: ${code}`);
            io.emit('pairing_code', { jid, code });
        }, 3000);
    }

    botInstances.set(jid, sock);

    sock.ev.on('creds.update', async () => {
        await saveCreds();
        await syncToCloud(jid, state.creds);
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) io.emit('qr', { jid, qr });

        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            if (code !== DisconnectReason.loggedOut) {
                startVexInstance(jid);
            } else {
                botInstances.delete(jid);
                console.log(`🔌 [LOGGED OUT]: ${jid}`);
            }
        } else if (connection === 'open') {
            console.log(`✅ [VEX ONLINE]: ${jid}`);
            await syncToCloud(jid, state.creds);
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        const m = chatUpdate.messages[0];
        if (!m.message || m.key.fromMe) return;

        // COMMAND HANDLER LOGIC
        const type = getContentType(m.message);
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : '';

        if (!body || !body.startsWith('.')) return;

        const args = body.slice(1).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        
        // Lazy Loading check
        const cmd = commands.get(cmdName);
        if (cmd) {
            // Check User Status from Supabase before executing
            const { data: user } = await supabase.from('users_bots').select('*').eq('user_jid', jid).single();
            if (user && user.is_active) {
                try {
                    await cmd.execute(m, sock, { args, user });
                    await supabase.rpc('increment_command_count', { row_id: jid });
                } catch (e) { console.error(e); }
            }
        }
    });

    return sock;
}

// 4. ADMIN REALTIME CONTROLLER
supabase.channel('admin_control')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users_bots' }, (payload) => {
    const { user_jid, is_active } = payload.new;
    if (!is_active && botInstances.has(user_jid)) {
        botInstances.get(user_jid).logout();
        botInstances.delete(user_jid);
        console.log(`🚫 [TERMINATED BY ADMIN]: ${user_jid}`);
    }
  }).subscribe();

// Start Server & Initial Load
httpServer.listen(PORT, async () => {
    console.log(`🚀 [VEX SYSTEM] Running on port ${PORT}`);
    // Load existing bots from DB on startup
    const { data: bots } = await supabase.from('users_bots').select('user_jid').eq('is_active', true);
    if (bots) {
        for (const bot of bots) {
            await startVexInstance(bot.user_jid);
            await delay(5000); // Avoid spamming WhatsApp servers
        }
    }
});
