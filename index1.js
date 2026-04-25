/**
 * VEX MINI BOT - DIAGNOSTIC OVERLOAD (FINAL)
 * Feature: Auto-Test + Asset Check + Universal Handler
 * Dev: Lupin Starnley
 */

require('dotenv').config();
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore,
    getContentType
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const path = require("path");
const fs = require("fs");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>VEX CORE CONTROL</title><script src="/socket.io/socket.io.js"></script><style>body { background: #050505; color: #00ffcc; font-family: 'Courier New', monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; } #qr-container { border: 2px solid #00ffcc; padding: 20px; background: #fff; border-radius: 10px; } h1 { letter-spacing: 5px; text-shadow: 0 0 10px #00ffcc; }</style></head><body><h1>VEX SYSTEM</h1><div id="qr-container"><img id="qr-img" src="" style="display:none; width: 250px;"><div id="loader" style="color:#000">LINKING CORE...</div></div><div class="status" id="status" style="margin-top:20px;font-weight:bold;">STANDBY</div><script>const socket = io(); const qrImg = document.getElementById('qr-img'); const loader = document.getElementById('loader'); const status = document.getElementById('status'); socket.on('qr', (url) => { qrImg.src = url; qrImg.style.display = 'block'; loader.style.display = 'none'; status.innerText = 'SCAN TO ACTIVATE'; }); socket.on('connected', () => { qrImg.style.display = 'none'; loader.innerText = 'VEX ONLINE ✅'; loader.style.display = 'block'; status.innerText = 'SYSTEM SYNCED'; status.style.color = '#00ff00'; });</script></body></html>`);
});

const commands = new Map();
const cmdPath = path.join(__dirname, 'vex');

function loadCommands() {
    if (fs.existsSync(cmdPath)) {
        console.log('--- SCANNING VEX ARSENAL ---');
        fs.readdirSync(cmdPath).filter(f => f.endsWith('.js')).forEach(file => {
            try {
                const cmd = require(path.join(cmdPath, file));
                const cmdName = cmd.vex || file.split('.')[0]; 
                commands.set(cmdName, cmd);
                console.log(`📡 [ACTIVE]: .${cmdName}`);
            } catch (e) { console.error(`🔥 [LOAD ERROR] ${file}:`, e.message); }
        });
    }
}

async function startVex() {
    loadCommands();
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "fatal" }),
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
        },
        browser: ["VEX-CORE", "Chrome", "3.0.0"]
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
            
            const imgPath = path.join(__dirname, 'assets/images/vex.png');
            const statusMsg = `*VEX SYSTEM ACTIVATED*\n\n✨ *Status:* Online\n📁 *Arsenal:* ${commands.size} Commands Loaded\n\n_System is monitoring all nodes._`;
            
            if (fs.existsSync(imgPath)) {
                await sock.sendMessage(sock.user.id, { image: { url: imgPath }, caption: statusMsg });
            } else {
                await sock.sendMessage(sock.user.id, { text: statusMsg });
                console.log('⚠️ [ASSET MISSING]: vex.png not found in assets/images/');
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        const m = chatUpdate.messages[0];
        if (!m.message) return;

        const type = getContentType(m.message);
        const body = (type === 'conversation') ? m.message.conversation : 
                     (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                     (type === 'imageMessage') ? m.message.imageMessage.caption : 
                     (type === 'videoMessage') ? m.message.videoMessage.caption : '';

        if (!body.startsWith('.')) return;

        const args = body.slice(1).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const cmd = commands.get(cmdName);

        // DIAGNOSTIC LOG
        console.log(`[INCOMING]: .${cmdName} | From: ${m.key.remoteJid} | Found: ${!!cmd}`);

        if (cmd) {
            m.text = body;
            m.chat = m.key.remoteJid;
            m.isGroup = m.chat.endsWith('@g.us');
            m.sender = m.isGroup ? m.key.participant : m.chat;
            
            const quoted = m.message.extendedTextMessage?.contextInfo;
            if (quoted && quoted.quotedMessage) {
                m.quoted = {
                    sender: quoted.participant,
                    text: quoted.quotedMessage.conversation || quoted.quotedMessage.extendedTextMessage?.text || "",
                    key: { remoteJid: m.chat, id: quoted.stanzaId }
                };
            } else { m.quoted = null; }

            m.reply = (txt) => sock.sendMessage(m.chat, { text: txt }, { quoted: m });

            try {
                // Tunatest kama execute ipo na kuikimbiza
                if (typeof cmd.execute === 'function') {
                    await cmd.execute(m, sock, commands);
                } else {
                    console.error(`❌ [FORMAT ERROR]: .${cmdName} has no execute function!`);
                }
            } catch (err) {
                console.error(`🛑 [EXECUTION FAIL] .${cmdName}:`, err);
            }
        }
    });
}

server.listen(PORT, () => startVex());

process.on('uncaughtException', (err) => console.error('CORE CRITICAL:', err));
process.on('unhandledRejection', (err) => console.error('PROMISE CRITICAL:', err));
