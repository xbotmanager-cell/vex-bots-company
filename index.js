/**
 * VEX MINI BOT - ULTIMATE CLOUD SYNC (RELOADED)
 * Feature: Supabase Realtime Sync + Organic Auto-Typing + Auto React Fixed
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
    const { data } = await supabase.from('vex_settings').select('*');
    if (data) {
        data.forEach(s => vexSettings[s.setting_name] = { value: s.value, extra: s.extra_data });
    }
}

// REAL-TIME LISTENER: Hii inahakikisha ukibadilisha Supabase, bot inachukua hapo hapo!
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
        printQRInTerminal: false, // Cleaner for Render/GitHub
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
                    react: { text: '💚', key: m.key } 
                }, { statusJidList: [m.key.participant] });
            }
        }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) io.emit('qr', await QRCode.toDataURL(qr));
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startVex();
        } else if (connection === 'open') {
            io.emit('connected');
            console.log('VEX CORE ONLINE ✅');
            
            // Sync to cloud immediately upon connection
            await syncSessionToCloud(state.creds);

            if (vexSettings['always_online']?.value) {
                await sock.sendPresenceUpdate('available');
            }

            // Asset Sender
            setTimeout(async () => {
                const imgPath = path.join(__dirname, 'assets/images/vex.png');
                const statusMsg = `*VEX SYSTEM ACTIVATED*\n\n✨ *Status:* Online\n📁 *Arsenal:* ${commands.size} Commands Loaded`;
                if (fs.existsSync(imgPath)) {
                    await sock.sendMessage(sock.user.id, { image: { url: imgPath }, caption: statusMsg });
                } else {
                    await sock.sendMessage(sock.user.id, { text: statusMsg });
                }
            }, 5000);
        }
    });

    sock.ev.on('creds.update', async () => {
        await saveCreds();
        await syncSessionToCloud(state.creds); // Keep cloud in sync
    });

    // --- MESSAGE HANDLER ---
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        const m = chatUpdate.messages[0];
        if (!m.message || m.key.fromMe) return; 

        const type = getContentType(m.message);
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? m.message.imageMessage.caption : 
                     (type === 'videoMessage') ? m.message.videoMessage.caption : '';

        // Organic Auto-Typing Logic (Random 20-30 seconds)
        if (vexSettings['autotyping']?.value) {
            await sock.sendPresenceUpdate('composing', m.key.remoteJid);
            // Random delay kati ya 20s (20000ms) na 30s (30000ms)
            const typeDelay = Math.floor(Math.random() * (30000 - 20000 + 1) + 20000);
            await delay(typeDelay);
            await sock.sendPresenceUpdate('paused', m.key.remoteJid);
        }

        // Auto-React Logic (Using the 15 emojis from SQL)
        if (vexSettings['autoreact']?.value) {
            const reacts = vexSettings['autoreact'].extra;
            if (reacts && reacts.length > 0) {
                const randomEmoji = reacts[Math.floor(Math.random() * reacts.length)];
                await sock.sendMessage(m.key.remoteJid, { react: { text: randomEmoji, key: m.key } });
            }
        }

        if (!body.startsWith('.')) return;

        const args = body.slice(1).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const cmd = commands.get(cmdName);

        if (cmd) {
            m.text = body;
            m.chat = m.key.remoteJid;
            m.reply = (txt) => sock.sendMessage(m.chat, { text: txt }, { quoted: m });

            try {
                await cmd.execute(m, sock, commands);
            } catch (err) { console.error(`🛑 [EXECUTION FAIL] .${cmdName}:`, err); }
        }
    });
}

// Web Controller
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>VEX CORE</title><script src="/socket.io/socket.io.js"></script><style>body { background: #050505; color: #00ffcc; font-family: 'Courier New', monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; } #qr-container { border: 2px solid #00ffcc; padding: 20px; background: #fff; border-radius: 10px; } h1 { letter-spacing: 5px; text-shadow: 0 0 10px #00ffcc; }</style></head><body><h1>VEX SYSTEM</h1><div id="qr-container"><img id="qr-img" src="" style="display:none; width: 250px;"><div id="loader" style="color:#000">LINKING CORE...</div></div><div class="status" id="status" style="margin-top:20px;font-weight:bold;">STANDBY</div><script>const socket = io(); const qrImg = document.getElementById('qr-img'); const loader = document.getElementById('loader'); const status = document.getElementById('status'); socket.on('qr', (url) => { qrImg.src = url; qrImg.style.display = 'block'; loader.style.display = 'none'; status.innerText = 'SCAN TO ACTIVATE'; }); socket.on('connected', () => { qrImg.style.display = 'none'; loader.innerText = 'VEX ONLINE ✅'; loader.style.display = 'block'; status.innerText = 'SYSTEM SYNCED'; status.style.color = '#00ff00'; });</script></body></html>`);
});

server.listen(PORT, () => startVex());

process.on('uncaughtException', (err) => console.error('CRITICAL:', err));
process.on('unhandledRejection', (err) => console.error('PROMISE CRITICAL:', err));
