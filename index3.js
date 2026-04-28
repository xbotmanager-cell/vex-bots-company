/**
 * VEX MINI BOT - ULTIMATE CLOUD SYNC (V3.5 PRO MAX)
 * Features: Folder Switcher, Realtime Supabase Sync, Silent Mode, Web QR Dashboard
 * Fixed: JID Decode, Public Access, Session Persistence, Socket.io QR Sync
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
    jidDecode,
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

// 1. SUPABASE & SERVER INITIALIZATION
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;

let commands = new Map();
let currentPath = path.join(__dirname, 'plugins');
let lastQR = null;
let isConnected = false;

// Settings Cache
let vexSettings = {
    mode: 'normal',
    path: 'plugins',
    message: 'on',
    autostatus_like: false,
    autoreact: false
};

// JID Decoder (Anti-Undefined Logic)
const decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return decode.user && decode.server && decode.user + '@' + decode.server || jid;
    } else return jid;
};

// 2. CLOUD SESSION & SETTINGS LOGIC (SUPABASE)
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
    } catch (e) { console.log('ℹ️ [VEX]: Starting fresh (No cloud session).'); }
}

async function loadVexSettings() {
    try {
        const { data } = await supabase.from('vex_settings').select('*');
        if (data) {
            data.forEach(s => { vexSettings[s.setting_name] = s.value; });
            currentPath = path.join(__dirname, vexSettings['path'] || 'plugins');
        }
    } catch (e) { console.error('⚙️ [SETTINGS LOAD ERROR]:', e.message); }
}

// REAL-TIME SETTINGS SYNC (No Restart Required)
supabase.channel('settings_changes').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vex_settings' }, (payload) => {
    const updated = payload.new;
    vexSettings[updated.setting_name] = updated.value;
    if (updated.setting_name === 'path') {
        currentPath = path.join(__dirname, updated.value);
        loadCommands();
    }
    console.log(`🔄 [REALTIME]: ${updated.setting_name} set to ${updated.value}`);
}).subscribe();

// 3. COMMAND LOADER
function loadCommands() {
    commands.clear();
    if (!fs.existsSync(currentPath)) fs.mkdirSync(currentPath);
    fs.readdirSync(currentPath).filter(f => f.endsWith('.js')).forEach(file => {
        try {
            const fullPath = path.join(currentPath, file);
            delete require.cache[require.resolve(fullPath)];
            const cmd = require(fullPath);
            commands.set(cmd.command || file.split('.')[0], cmd);
        } catch (e) { console.error(`🔥 [LOAD ERROR] ${file}:`, e.message); }
    });
    console.log(`📁 [VEX]: ${commands.size} commands loaded from /${path.basename(currentPath)}`);
}

// 4. MAIN BOT ENGINE
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
        browser: ["VEX-CORE", "Safari", "1.0.0"]
    });

    // Message Handler
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        const m = chatUpdate.messages[0];
        if (!m.message) return;
        
        const remoteJid = m.key.remoteJid;
        const type = getContentType(m.message);
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? m.message.imageMessage.caption : 
                     (type === 'videoMessage') ? m.message.videoMessage.caption : '';

        // Inject Custom Properties
        m.chat = remoteJid;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = decodeJid(m.isGroup ? m.key.participant : m.chat);
        
        // --- AUTOMATIONS ---
        if (vexSettings['autostatus_like'] === true && remoteJid === 'status@broadcast') {
            await sock.readMessages([m.key]);
            await sock.sendMessage('status@broadcast', { react: { text: '💜', key: m.key } }, { statusJidList: [m.key.participant] });
        }

        if (vexSettings['autoreact'] === true && !m.key.fromMe) {
            await sock.sendMessage(remoteJid, { react: { text: '✨', key: m.key } });
        }

        // --- VEX CONTROLLER ---
        if (body.startsWith('.vex')) {
            const args = body.slice(5).trim().split(/ +/);
            const subCmd = args[0]?.toLowerCase();
            const value = args[1]?.toLowerCase();

            if (!subCmd) {
                const menu = `╭━━━〔 *VEX CONTROL* 〕━━━╮\n`
                           + `┃ 📁 *Path:* ${path.basename(currentPath)}\n`
                           + `┃ 🎭 *Mode:* ${vexSettings['mode']}\n`
                           + `┃ 🔇 *Msg:* ${vexSettings['message']}\n`
                           + `┃ 💜 *AutoStatus:* ${vexSettings['autostatus_like']}\n`
                           + `┃ ⚡ *AutoReact:* ${vexSettings['autoreact']}\n`
                           + `╰━━━━━━━━━━━━━━━━━━━━╯`;
                return await sock.sendMessage(remoteJid, { text: menu }, { quoted: m });
            }

            if (['plugins', 'vex'].includes(subCmd)) {
                await supabase.from('vex_settings').upsert({ setting_name: 'path', value: subCmd });
                return m.reply(`✅ Path Switched: ${subCmd}`);
            }
            if (['harsh', 'normal', 'girl'].includes(value) && subCmd === 'mode') {
                await supabase.from('vex_settings').upsert({ setting_name: 'mode', value: value });
                return m.reply(`🎭 Soul Mode: ${value.toUpperCase()}`);
            }
            if (['on', 'off'].includes(value)) {
                const settingMap = { autostatus: 'autostatus_like', autoreact: 'autoreact', message: 'message' };
                const dbKey = settingMap[subCmd] || subCmd;
                const dbValue = (value === 'on' ? true : false);
                await supabase.from('vex_settings').upsert({ setting_name: dbKey, value: dbValue });
                return m.reply(`⚙️ ${subCmd.toUpperCase()} is now ${value}`);
            }
        }

        // --- DYNAMIC MENU SELECTION ---
        if (m.message.extendedTextMessage?.contextInfo?.quotedMessage?.conversation?.includes("VEX") && !isNaN(body)) {
            const selectedNumber = parseInt(body) - 1;
            const files = fs.readdirSync(currentPath).filter(file => file.endsWith('.js'));
            let categories = [];
            let plugins = [];
            files.forEach(file => {
                const p = require(path.join(currentPath, file));
                plugins.push(p);
                if (p.category && !categories.includes(p.category)) categories.push(p.category);
            });
            categories.sort();
            if (categories[selectedNumber]) {
                const selectedCat = categories[selectedNumber];
                const filtered = plugins.filter(p => p.category === selectedCat);
                let responseText = `✨ *CATEGORY: ${selectedCat.toUpperCase()}* ✨\n\n`;
                filtered.forEach(cmd => { responseText += `❯❯ .${cmd.command}\n`; });
                return await sock.sendMessage(remoteJid, { text: responseText }, { quoted: m });
            }
        }

        // --- COMMAND ENGINE (PUBLIC ACCESS) ---
        if (!body.startsWith('.')) return;
        const args = body.slice(1).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const cmd = commands.get(cmdName);

        if (cmd) {
            const userSettings = { style: vexSettings['mode'], silent: (vexSettings['message'] === false || vexSettings['message'] === 'off') };
            m.reply = async (txt) => {
                if (userSettings.silent) return;
                return sock.sendMessage(remoteJid, { text: txt }, { quoted: m });
            };
            try { await cmd.execute(m, sock, { args, userSettings }); } 
            catch (err) { if (!userSettings.silent) m.reply(`🛑 [VEX ERROR]: ${err.message}`); }
        }
    });

    // Connection Events
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            lastQR = await QRCode.toDataURL(qr);
            io.emit('qr', lastQR);
            isConnected = false;
        }
        if (connection === 'close') {
            isConnected = false;
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startVex();
        } else if (connection === 'open') {
            isConnected = true;
            lastQR = null;
            io.emit('connected', true);
            console.log('✅ VEX CORE ONLINE');
            await syncSessionToCloud(state.creds);
            await sock.sendMessage(sock.user.id, { text: `*VEX SYSTEM ACTIVATED*\n\n🎭 Mode: ${vexSettings['mode']}\n📁 Path: /${path.basename(currentPath)}` });
        }
    });

    sock.ev.on('creds.update', async () => {
        await saveCreds();
        await syncSessionToCloud(state.creds); 
    });
}

// 5. WEB DASHBOARD (HTML/CSS/SOCKET.IO)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>VEX CORE | Dashboard</title>
            <script src="/socket.io/socket.io.js"></script>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap');
                body { background: #020617; color: #f8fafc; font-family: 'Orbitron', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; overflow: hidden; }
                .container { background: #0f172a; padding: 40px; border-radius: 20px; box-shadow: 0 0 50px rgba(99, 102, 241, 0.2); border: 1px solid #1e293b; text-align: center; max-width: 400px; width: 90%; }
                h1 { color: #818cf8; margin-bottom: 10px; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
                .status-box { margin: 20px 0; padding: 15px; border-radius: 10px; background: #1e293b; font-size: 14px; }
                .qr-frame { background: white; padding: 15px; border-radius: 15px; display: inline-block; margin-top: 20px; box-shadow: 0 0 20px rgba(255,255,255,0.1); }
                .connected-msg { color: #10b981; font-weight: bold; font-size: 18px; animation: pulse 2s infinite; }
                @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
                .footer { margin-top: 30px; font-size: 10px; color: #64748b; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Vex Core V2</h1>
                <div class="status-box" id="status-text">Initializing System...</div>
                <div id="qr-container"></div>
                <div class="footer">Developed by Lupin Starnley</div>
            </div>
            <script>
                const socket = io();
                const statusText = document.getElementById('status-text');
                const qrContainer = document.getElementById('qr-container');

                socket.on('qr', (qrUrl) => {
                    statusText.innerText = 'Scan the QR code below';
                    statusText.style.color = '#fbbf24';
                    qrContainer.innerHTML = '<div class="qr-frame"><img src="' + qrUrl + '" width="250"></div>';
                });

                socket.on('connected', (data) => {
                    statusText.innerHTML = '<span class="connected-msg">● SYSTEM ONLINE</span>';
                    qrContainer.innerHTML = '<div style="font-size: 50px; margin-top: 20px;">⚡</div><p>Bot is linked successfully!</p>';
                });
            </script>
        </body>
        </html>
    `);
});

// Start Server
server.listen(PORT, () => {
    console.log(`🚀 Server listening on port ${PORT}`);
    startVex();
});
