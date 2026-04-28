/**
 * VEX MINI BOT - ULTIMATE CLOUD SYNC (V2 ENGINE - FIXED)
 * Feature: Folder Switcher, Realtime Modes, Silent Mode, Auto-Automation
 * Fixed: JID Decoding Error & Public Access
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
    jidDecode, // Imeongezwa hapa
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

let commands = new Map();
let currentPath = path.join(__dirname, 'plugins');

// JID Decoder Function (Fixes "Cannot destructure property user" error)
const decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return decode.user && decode.server && decode.user + '@' + decode.server || jid;
    } else return jid;
};

let vexSettings = {
    mode: 'normal',
    path: 'plugins',
    message: 'on',
    autostatus_like: false,
    autoreact: false
};

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
    } catch (e) { console.log('ℹ️ [VEX]: No cloud session found.'); }
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

// REAL-TIME LISTENER
supabase
  .channel('settings_changes')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vex_settings' }, (payload) => {
    const updated = payload.new;
    vexSettings[updated.setting_name] = updated.value;
    if (updated.setting_name === 'path') {
        currentPath = path.join(__dirname, updated.value);
        loadCommands();
    }
    console.log(`🔄 [REALTIME]: ${updated.setting_name} updated.`);
  })
  .subscribe();

// 3. CORE LOGIC
function loadCommands() {
    commands.clear();
    if (fs.existsSync(currentPath)) {
        fs.readdirSync(currentPath).filter(f => f.endsWith('.js')).forEach(file => {
            try {
                delete require.cache[require.resolve(path.join(currentPath, file))];
                const cmd = require(path.join(currentPath, file));
                commands.set(cmd.command || file.split('.')[0], cmd);
            } catch (e) { console.error(`🔥 [LOAD ERROR] ${file}:`, e.message); }
        });
        console.log(`📁 [VEX]: Loaded commands from /${path.basename(currentPath)}`);
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
        browser: ["VEX-CORE", "Chrome", "3.0.0"]
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        const m = chatUpdate.messages[0];
        if (!m.message) return;
        
        const remoteJid = m.key.remoteJid;
        const type = getContentType(m.message);
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? m.message.imageMessage.caption : 
                     (type === 'videoMessage') ? m.message.videoMessage.caption : '';

        // PUBLIC ACCESS LOGIC (Inakubali kote kote)
        m.chat = remoteJid;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = decodeJid(m.isGroup ? m.key.participant : m.chat);

        // 1. AUTO STATUS LIKE
        if (vexSettings['autostatus_like'] === true && remoteJid === 'status@broadcast') {
            await sock.readMessages([m.key]);
            await sock.sendMessage('status@broadcast', { react: { text: '💜', key: m.key } }, { statusJidList: [m.key.participant] });
        }

        // 2. AUTO REACT
        if (vexSettings['autoreact'] === true && !m.key.fromMe) {
            await sock.sendMessage(remoteJid, { react: { text: '✨', key: m.key } });
        }

        // 3. VEX CORE CONTROLLER
        if (body.startsWith('.vex')) {
            const args = body.slice(5).trim().split(/ +/);
            const subCmd = args[0]?.toLowerCase();
            const value = args[1]?.toLowerCase();

            if (!subCmd) {
                const menu = `╭━━━〔 *VEX CONTROL* 〕━━━╮\n┃ 📁 *Path:* ${path.basename(currentPath)}\n┃ 🎭 *Mode:* ${vexSettings['mode']}\n┃ 🔇 *Msg:* ${vexSettings['message']}\n┃ 💜 *AutoStatus:* ${vexSettings['autostatus_like']}\n┃ ⚡ *AutoReact:* ${vexSettings['autoreact']}\n╰━━━━━━━━━━━━━━━━━━━━╯`;
                return await sock.sendMessage(remoteJid, { text: menu }, { quoted: m });
            }

            if (['plugins', 'vex'].includes(subCmd)) {
                await supabase.from('vex_settings').upsert({ setting_name: 'path', value: subCmd });
                return m.reply(`✅ Path: ${subCmd}`);
            }
            if (['harsh', 'normal', 'girl'].includes(value) && subCmd === 'mode') {
                await supabase.from('vex_settings').upsert({ setting_name: 'mode', value: value });
                return m.reply(`🎭 Soul: ${value.toUpperCase()}`);
            }
            if (['on', 'off'].includes(value)) {
                const settingMap = { autostatus: 'autostatus_like', autoreact: 'autoreact', message: 'message' };
                const dbKey = settingMap[subCmd] || subCmd;
                const dbValue = (value === 'on' ? true : (value === 'off' ? false : value));
                await supabase.from('vex_settings').upsert({ setting_name: dbKey, value: dbValue });
                return m.reply(`⚙️ ${subCmd.toUpperCase()}: ${value}`);
            }
        }

        // 4. MENU SELECTION
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

        // 5. COMMAND EXECUTION
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
            try {
                await cmd.execute(m, sock, { args, userSettings });
            } catch (err) { 
                if (!userSettings.silent) m.reply(`🛑 [ERROR]: ${err.message}`);
            }
        }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) io.emit('qr', await QRCode.toDataURL(qr));
        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startVex();
        } else if (connection === 'open') {
            console.log('VEX CORE ONLINE ✅');
            await syncSessionToCloud(state.creds);
            const statusMsg = `*VEX SYSTEM ACTIVATED*\n\n🎭 *Mode:* ${vexSettings['mode']}\n📁 *Active Path:* /${path.basename(currentPath)}`;
            await sock.sendMessage(sock.user.id, { text: statusMsg });
        }
    });

    sock.ev.on('creds.update', async () => {
        await saveCreds();
        await syncSessionToCloud(state.creds); 
    });
}

app.get('/', (req, res) => { res.send('VEX SYSTEM RUNNING...'); });
server.listen(PORT, () => startVex());
