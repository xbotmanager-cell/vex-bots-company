/**
 * VEX MINI BOT - ULTIMATE CLOUD SYNC (V3.5 PRO MAX)
 * Fixed: Bad MAC Errors, Message Looping, SQL Text Casting
 * Features: Realtime Supabase TEXT Sync, Anti-Restart Logic, AutoStatus 💜
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

// 1. INITIALIZATION
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;

let commands = new Map();
let currentPath = path.join(__dirname, 'plugins');
let isConnected = false;

// Settings Cache (Initial Defaults)
let vexSettings = {
    mode: 'normal',
    path: 'plugins',
    message: 'on',
    autostatus_like: 'true', // Inasoma kama TEXT kutoka SQL
    autoreact: 'false'
};

const decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return decode.user && decode.server && decode.user + '@' + decode.server || jid;
    } else return jid;
};

// 2. SUPABASE CLOUD LOGIC (ANTI-BAD MAC)
async function syncSessionToCloud(creds) {
    try {
        const base64Data = Buffer.from(JSON.stringify(creds)).toString('base64');
        await supabase.from('vex_session').upsert({ id: 'v1_session', data: base64Data });
    } catch (e) { console.error('☁️ [SYNC ERROR]:', e.message); }
}

async function loadSessionFromCloud() {
    try {
        const { data } = await supabase.from('vex_session').select('data').eq('id', 'v1_session').single();
        if (data) {
            const decoded = Buffer.from(data.data, 'base64').toString('utf-8');
            if (!fs.existsSync('./session')) fs.mkdirSync('./session');
            fs.writeFileSync('./session/creds.json', decoded);
            console.log('✅ [VEX]: Session Restored from Cloud.');
        }
    } catch (e) { console.log('ℹ️ [VEX]: Starting Fresh Session.'); }
}

async function loadVexSettings() {
    try {
        const { data } = await supabase.from('vex_settings').select('setting_name, value');
        if (data) {
            data.forEach(s => { vexSettings[s.setting_name] = s.value; });
            currentPath = path.join(__dirname, vexSettings['path'] || 'plugins');
        }
    } catch (e) { console.error('⚙️ [SETTINGS ERROR]:', e.message); }
}

// REALTIME SETTINGS LISTENER
supabase.channel('settings_changes').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vex_settings' }, (payload) => {
    const updated = payload.new;
    vexSettings[updated.setting_name] = updated.value;
    if (updated.setting_name === 'path') {
        currentPath = path.join(__dirname, updated.value);
        loadCommands();
    }
    console.log(`🔄 [REALTIME]: ${updated.setting_name} updated to ${updated.value}`);
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
    console.log(`📁 [VEX]: ${commands.size} commands ready in /${path.basename(currentPath)}`);
}

// 4. MAIN ENGINE
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
        browser: ["VEX-CORE", "Chrome", "1.0.0"],
        markOnlineOnConnect: true // Kaa Online muda mrefu
    });

    // --- MESSAGE HANDLER (ANTI-LOOP) ---
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        const m = chatUpdate.messages[0];
        if (!m.message || m.key.fromMe) return;

        // ANTI-LOOP: Mark as Read immediately
        await sock.readMessages([m.key]);
        
        const remoteJid = m.key.remoteJid;
        const type = getContentType(m.message);
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? m.message.imageMessage.caption : 
                     (type === 'videoMessage') ? m.message.videoMessage.caption : '';

        m.chat = remoteJid;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = decodeJid(m.isGroup ? m.key.participant : m.chat);

        // --- AUTOMATIONS ---
        if (vexSettings['autostatus_like'] === 'true' && remoteJid === 'status@broadcast') {
            await sock.sendMessage('status@broadcast', { react: { text: '💜', key: m.key } }, { statusJidList: [m.key.participant] });
        }

        if (vexSettings['autoreact'] === 'true') {
            await sock.sendMessage(remoteJid, { react: { text: '✨', key: m.key } });
        }

        // --- VEX CONTROLLER (.vex) ---
        if (body.startsWith('.vex')) {
            const args = body.slice(5).trim().split(/ +/);
            const subCmd = args[0]?.toLowerCase();
            const val = args[1]?.toLowerCase();

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

            // Update Database with TEXT values
            if (['plugins', 'vex'].includes(subCmd)) {
                await supabase.from('vex_settings').upsert({ setting_name: 'path', value: subCmd });
                return sock.sendMessage(remoteJid, { text: `✅ Path switched to: ${subCmd}` }, { quoted: m });
            }
            if (['on', 'off', 'true', 'false', 'normal', 'harsh', 'girl'].includes(val)) {
                const map = { autostatus: 'autostatus_like', autoreact: 'autoreact', message: 'message', mode: 'mode' };
                const dbKey = map[subCmd] || subCmd;
                await supabase.from('vex_settings').upsert({ setting_name: dbKey, value: val });
                return sock.sendMessage(remoteJid, { text: `⚙️ ${dbKey.toUpperCase()} set to ${val}` }, { quoted: m });
            }
        }

        // --- COMMAND ENGINE ---
        if (!body.startsWith('.')) return;
        const args = body.slice(1).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const cmd = commands.get(cmdName);

        if (cmd) {
            const userSettings = { style: vexSettings['mode'], silent: (vexSettings['message'] === 'off') };
            m.reply = async (txt) => {
                if (userSettings.silent) return;
                return sock.sendMessage(remoteJid, { text: txt }, { quoted: m });
            };
            try { await cmd.execute(m, sock, { args, userSettings }); } 
            catch (err) { if (!userSettings.silent) m.reply(`🛑 [VEX ERROR]: ${err.message}`); }
        }
    });

    // CONNECTION MONITOR
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            const lastQR = await QRCode.toDataURL(qr);
            io.emit('qr', lastQR);
            isConnected = false;
        }
        if (connection === 'close') {
            isConnected = false;
            const shouldRestart = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldRestart) {
                console.log('🔄 [RECONNECTING]: Restarting Engine...');
                setTimeout(() => startVex(), 3000); // Delay kidogo kuzuia spamming restarts
            }
        } else if (connection === 'open') {
            isConnected = true;
            io.emit('connected', true);
            console.log('✅ VEX CORE ONLINE - STABLE MODE');
            await syncSessionToCloud(state.creds);
            await sock.sendMessage(sock.user.id, { text: `*VEX SYSTEM ACTIVATED*\n\n🎭 Mode: ${vexSettings['mode']}\n📁 Path: /${path.basename(currentPath)}\n\n_System is now stable and sync with Supabase TEXT logic._` });
        }
    });

    sock.ev.on('creds.update', async () => {
        await saveCreds();
        await delay(2000); // Wait for file system before cloud sync
        await syncSessionToCloud(state.creds); 
    });
}

// 5. DASHBOARD
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>VEX CORE DASHBOARD</title>
            <script src="/socket.io/socket.io.js"></script>
            <style>
                body { background: #020617; color: #818cf8; font-family: sans-serif; text-align: center; padding-top: 50px; }
                .card { background: #0f172a; display: inline-block; padding: 30px; border-radius: 15px; border: 1px solid #1e293b; }
                #status { font-weight: bold; margin-bottom: 20px; }
                img { border: 10px solid white; border-radius: 10px; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>VEX CORE V3.5</h1>
                <div id="status">Initializing...</div>
                <div id="qr"></div>
            </div>
            <script>
                const socket = io();
                socket.on('qr', url => {
                    document.getElementById('status').innerText = 'SCAN QR CODE';
                    document.getElementById('qr').innerHTML = '<img src="'+url+'" width="250">';
                });
                socket.on('connected', () => {
                    document.getElementById('status').innerText = 'SYSTEM ONLINE ✅';
                    document.getElementById('qr').innerHTML = '<h2 style="color:#10b981">Linked Successfully!</h2>';
                });
            </script>
        </body>
        </html>
    `);
});

server.listen(PORT, () => {
    console.log(`🚀 VEX Server running on port ${PORT}`);
    startVex();
});
