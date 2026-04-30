/**
 * VEX MINI BOT - ULTIMATE CLOUD SYNC (PLUGINS EDITION)
 * Feature: Supabase Realtime Sync + Organic Auto-Typing + Brute Force Status Like
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

// FIX: Separate named export for makeInMemoryStore to prevent TypeError
const { makeInMemoryStore } = require("@whiskeysockets/baileys");

const pino = require("pino");
const path = require("path");
const fs = require("fs");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require('qrcode');
const { createClient } = require('@supabase/supabase-js');

// --- INJECTED: STORE CONFIGURATION ---
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
const storePath = './baileys_store.json';
if (fs.existsSync(storePath)) store.readFromFile(storePath);
setInterval(() => { store.writeToFile(storePath); }, 10000);
// -------------------------------------

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;

const commands = new Map();
const observers = []; // INJECTED: Listener for Observer Plugins
const pluginPath = path.join(__dirname, 'plugins');
global.vexSettings = {};

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
            data.forEach(s => {
                const finalValue = (s.setting_name === 'style') ? s.extra_data : s.value;
                global.vexSettings[s.setting_name] = { value: finalValue, extra: s.extra_data };
            });
            if (!global.vexSettings['style']) global.vexSettings['style'] = { value: 'harsh' };
        }
    } catch (e) { console.error('⚙️ [SETTINGS LOAD ERROR]:', e.message); }
}

supabase
  .channel('settings_changes')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vex_settings' }, (payload) => {
    const updated = payload.new;
    const finalValue = (updated.setting_name === 'style') ? updated.extra_data : updated.value;
    global.vexSettings[updated.setting_name] = { value: finalValue, extra: updated.extra_data };
    console.log(`🔄 [REALTIME]: ${updated.setting_name} sync optimized.`);
  })
  .subscribe();

function loadCommands() {
    if (!fs.existsSync(pluginPath)) fs.mkdirSync(pluginPath);
    observers.length = 0; // Clear observers on reload
    fs.readdirSync(pluginPath).filter(f => f.endsWith('.js')).forEach(file => {
        const fPath = path.join(pluginPath, file);
        try {
            delete require.cache[require.resolve(fPath)];
            const plugin = require(fPath);
            if (plugin.command) {
                commands.set(plugin.command, plugin);
            }
            if (plugin.onMessage) {
                observers.push(plugin); // INJECTED: Load Observer plugins
            }
        } catch (e) { console.error(`🔥 [PLUGIN ERROR] ${file}:`, e.message); }
    });
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
        browser: ["VEX-CORE", "Safari", "3.0.0"],
        syncFullHistory: false
    });

    store.bind(sock.ev); // INJECTED: Bind store to connection

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        const m = chatUpdate.messages[0];
        if (!m.message) return;
        const remoteJid = m.key.remoteJid;

        // --- INJECTED: OBSERVER (ANTIDELETE/EDIT/VIEWONCE) EXECUTION ---
        const currentStyle = global.vexSettings['style']?.value || 'harsh';
        const pluginSettings = { ...global.vexSettings, style: { value: currentStyle } };
        for (const observer of observers) {
            try {
                await observer.onMessage(m, sock, { userSettings: pluginSettings, store });
            } catch (e) { console.error(`Observer Error [${observer.name}]:`, e); }
        }

        // --- BRUTE FORCE AUTO STATUS LIKE (ULTIMATE SYNC) ---
        if (global.vexSettings['autostatus_like']?.value === true && !m.key.fromMe) {
            if (remoteJid === 'status@broadcast') {
                try {
                    const participant = m.key.participant || m.key.remoteJid;
                    await sock.readMessages([m.key]);
                    await delay(1000); 
                    await sock.sendMessage('status@broadcast', { 
                        react: { text: '💜', key: m.key } 
                    }, { statusJidList: [participant] });
                } catch (e) { console.error('Status Brute Error:', e.message); }
            }
        }

        const type = getContentType(m.message);
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? m.message.imageMessage.caption : 
                     (type === 'videoMessage') ? m.message.videoMessage.caption : '';

        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quoted?.imageMessage?.caption || quoted?.conversation || "";

        // --- VEX SELECTION LISTENER (MASIKIO) ---
        if (quotedText.includes("VEX VIDEO SELECTION") || quotedText.includes("VEX SYSTEM SELECTION")) {
            if (!isNaN(body) && body.trim() !== "") {
                const cmdName = quotedText.includes("VIDEO") ? "video" : "song";
                const command = commands.get(cmdName); 
                if (command) {
                    console.log(`🎯 [SELECTION TRIGGERED]: ${body} for ${cmdName}`);
                    const fakeArgs = [body.trim()];
                    return command.execute(m, sock, { args: fakeArgs, commands, userSettings: pluginSettings });
                }
            }
        }

        if (global.vexSettings['autotyping']?.value === true && !m.key.fromMe) {
            (async () => {
                await sock.sendPresenceUpdate('composing', remoteJid);
                await delay(5000);
                await sock.sendPresenceUpdate('paused', remoteJid);
            })(); 
        }

        if (global.vexSettings['autoreact']?.value === true && !m.key.fromMe) {
            const reacts = global.vexSettings['autoreact'].extra;
            if (Array.isArray(reacts) && reacts.length > 0) {
                const randomEmoji = reacts[Math.floor(Math.random() * reacts.length)];
                await sock.sendMessage(remoteJid, { react: { text: randomEmoji, key: m.key } });
            }
        }

        if (m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation?.includes("VEX") && !isNaN(body) && !quotedText.includes("SELECTION")) {
            const selectedNumber = parseInt(body) - 1;
            const files = fs.readdirSync(pluginPath).filter(file => file.endsWith('.js'));
            let categories = [];
            let pluginsList = [];
            files.forEach(file => {
                const p = require(path.join(pluginPath, file));
                pluginsList.push(p);
                if (p.category && !categories.includes(p.category)) categories.push(p.category);
            });
            categories.sort();
            if (categories[selectedNumber]) {
                const selectedCat = categories[selectedNumber];
                const filtered = pluginsList.filter(p => p.category === selectedCat);
                let responseText = `✨ *CATEGORY: ${selectedCat.toUpperCase()}* ✨\n\n`;
                filtered.forEach(cmd => { responseText += `| ◈ .${cmd.command}\n`; });
                return await sock.sendMessage(remoteJid, { text: responseText }, { quoted: m });
            }
        }

        if (!body || typeof body !== 'string' || !body.startsWith('.')) return;
        const args = body.slice(1).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const cmd = commands.get(cmdName) || [...commands.values()].find(p => p.alias && p.alias.includes(cmdName));

        if (cmd) {
            m.text = body;
            m.chat = remoteJid;
            m.isGroup = m.chat.endsWith('@g.us');
            m.sender = m.isGroup ? m.key.participant : m.chat;
            m.reply = (txt) => sock.sendMessage(m.chat, { text: txt }, { quoted: m });
            try {
                await cmd.execute(m, sock, { args, commands, userSettings: pluginSettings });
            } catch (err) { console.error(`🛑 [EXECUTION FAIL] .${cmdName}:`, err); }
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
            await syncSessionToCloud(state.creds);
            if (global.vexSettings['always_online']?.value === true) await sock.sendPresenceUpdate('available');
            setTimeout(async () => {
                const statusMsg = `*VEX SYSTEM ACTIVATED*\n\n✨ *Status:* Online\n📁 *Arsenal:* ${commands.size} Plugins Loaded`;
                await sock.sendMessage(sock.user.id, { text: statusMsg });
            }, 5000);
        }
    });

    sock.ev.on('creds.update', async () => {
        await saveCreds();
        await syncSessionToCloud(state.creds); 
    });
}

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>VEX CORE</title><script src="/socket.io/socket.io.js"></script><style>body { background: #050505; color: #00ffcc; font-family: 'Courier New', monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; } #qr-container { border: 2px solid #00ffcc; padding: 20px; background: #fff; border-radius: 10px; } h1 { letter-spacing: 5px; text-shadow: 0 0 10px #00ffcc; }</style></head><body><h1>VEX SYSTEM</h1><div id="qr-container"><img id="qr-img" src="" style="display:none; width: 250px;"><div id="loader" style="color:#000">LINKING CORE...</div></div><div class="status" id="status" style="margin-top:20px;font-weight:bold;">STANDBY</div><script>const socket = io(); const qrImg = document.getElementById('qr-img'); const loader = document.getElementById('loader'); const status = document.getElementById('status'); socket.on('qr', (url) => { qrImg.src = url; qrImg.style.display = 'block'; loader.style.display = 'none'; status.innerText = 'SCAN TO ACTIVATE'; }); socket.on('connected', () => { qrImg.style.display = 'none'; loader.innerText = 'VEX ONLINE ✅'; loader.style.display = 'block'; status.innerText = 'SYSTEM SYNCED'; status.style.color = '#00ff00'; });</script></body></html>`);
});

server.listen(PORT, () => startVex());
process.on('uncaughtException', (err) => console.error('CRITICAL ERROR:', err));
process.on('unhandledRejection', (err) => console.error('PROMISE ERROR:', err));
