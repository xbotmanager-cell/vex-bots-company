/**
 * VEX MULTI-DEVICE MASTER SYSTEM - ULTIMATE FAST EDITION
 * Feature: No Admin Restrictions, Super Fast Boot, In-Chat Toggles,
 * Anti-Link, Anti-Bot, Anti-Badwords, Organic Auto-Features.
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
const QRCode = require('qrcode');
const { createClient } = require('@supabase/supabase-js');

// ==========================================
// 1. INITIALIZATION & SERVER SETUP
// ==========================================
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const PORT = process.env.PORT || 10000;

const botInstances = new Map(); 
const commands = new Map();
const cmdPath = path.join(__dirname, 'vex');

// Default Settings (Zote ziko OFF mwanzoni)
let vexSettings = {
    'anti_link': { value: false },
    'anti_bot': { value: false },
    'anti_badwords': { value: false },
    'autoread': { value: false },
    'autotyping': { value: false },
    'autoreact': { value: false, extra: ['🔥','💯','✅','💜'] },
    'autostatus_like': { value: false },
    'always_online': { value: true }
};

const badWordsList = ['bwege', 'mjinga', 'fala', 'pumbavu']; // Ongeza matusi unayotaka kuzuia

// ==========================================
// 2. SUPABASE CLOUD SYNC & SETTINGS
// ==========================================
async function syncToCloud(jid, creds) {
    try {
        const base64Data = Buffer.from(JSON.stringify(creds)).toString('base64');
        await supabase.from('vex_sessions').upsert({ user_jid: jid, session_data: base64Data, last_seen: new Date() });
    } catch (e) { /* Silent ignore for speed */ }
}

async function getSession(jid) {
    try {
        const { data } = await supabase.from('vex_sessions').select('session_data').eq('user_jid', jid).single();
        if (data && data.session_data) return JSON.parse(Buffer.from(data.session_data, 'base64').toString('utf-8'));
    } catch (e) { return null; }
    return null;
}

async function loadVexSettings() {
    try {
        const { data } = await supabase.from('vex_settings').select('*');
        if (data) data.forEach(s => vexSettings[s.setting_name] = { value: s.value, extra: s.extra_data });
    } catch (e) { console.error('⚙️ [SETTINGS LOAD ERROR]:', e.message); }
}

// Global Update Function
global.updateVexSetting = async (settingName, value, extraData = null) => {
    try {
        vexSettings[settingName] = { value: value, extra: extraData || vexSettings[settingName]?.extra };
        await supabase.from('vex_settings').upsert({ setting_name: settingName, value: value, extra_data: extraData });
        return true;
    } catch (e) { return false; }
};

// ==========================================
// 3. COMMAND LOADER
// ==========================================
function loadCommands() {
    if (fs.existsSync(cmdPath)) {
        const files = fs.readdirSync(cmdPath).filter(f => f.endsWith('.js'));
        for (const file of files) {
            try {
                delete require.cache[require.resolve(path.join(cmdPath, file))];
                const cmd = require(path.join(cmdPath, file));
                commands.set(cmd.vex || file.split('.')[0], cmd);
            } catch (e) { console.error(`🔥 [LOAD ERROR] ${file}:`, e.message); }
        }
        console.log(`📁 [VEX]: ${commands.size} Commands Loaded.`);
    }
}

// ==========================================
// 4. CORE BOT ENGINE (SUPER FAST)
// ==========================================
async function startVexInstance(jid = 'default_session', usePairing = false, phoneNumber = null) {
    if (botInstances.has(jid)) return botInstances.get(jid);

    const sessionDir = `./sessions/${jid.split('@')[0]}`;
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const cloudCreds = await getSession(jid);
    
    if (cloudCreds && (!state.creds || !state.creds.registered)) state.creds = cloudCreds;

    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }), // Silent for max speed & clean terminal
        printQRInTerminal: true, // Fallback kwenye terminal
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        browser: ["VEX-CORE", "Chrome", "3.0.0"],
        syncFullHistory: false,
        markOnlineOnConnect: true,
        getMessage: async () => ({ conversation: 'VEX' }) // Anti-crash kwa messages
    });

    // --- PAIRING CODE LOGIC (No Admin Restrictions) ---
    if (usePairing && phoneNumber && !sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(`\n📲 [PAIRING CODE] Namba: ${phoneNumber} | Code yako ni: ${code}\n`);
                io.emit('pairing_code', { jid, code });
            } catch (err) { console.error("Pairing Error:", err.message); }
        }, 2000); 
    }

    botInstances.set(jid, sock);

    sock.ev.on('creds.update', async () => {
        await saveCreds();
        syncToCloud(jid, state.creds); // Non-blocking sync
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) io.emit('qr', { jid, qr: await QRCode.toDataURL(qr) });

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            if (statusCode !== DisconnectReason.loggedOut) {
                botInstances.delete(jid);
                startVexInstance(jid); // Instant Reconnect
            } else {
                botInstances.delete(jid);
                if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
            }
        } else if (connection === 'open') {
            console.log(`✅ [VEX SYSTEM ONLINE]: ${jid}`);
            io.emit('connected', { jid });
            
            if (vexSettings['always_online']?.value) sock.sendPresenceUpdate('available');
            
            // SUPER FAST BOOT MESSAGE (No 6000ms delay)
            const statusMsg = `*VEX SYSTEM ONLINE*\n\n🚀 Bot Ipo Hewani Super Fast!\n📁 Commands: ${commands.size}`;
            sock.sendMessage(sock.user.id, { text: statusMsg });
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0];
            if (!m.message || m.key.fromMe) return;

            // --- 20+ LOGIC CHECKS PREPARATION ---
            const remoteJid = m.key.remoteJid;
            const type = getContentType(m.message);
            const isGroup = remoteJid.endsWith('@g.us');
            const sender = isGroup ? m.key.participant : remoteJid;
            const pushname = m.pushName || "User";
            const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            
            // Extract body safely
            const body = (type === 'conversation') ? m.message.conversation : 
                         (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                         (type === 'imageMessage') ? m.message.imageMessage.caption : 
                         (type === 'videoMessage') ? m.message.videoMessage.caption : '';

            const isCmd = body.startsWith('.');
            
            // Fetch Group Metadata IF in group
            let groupMetadata = null, groupAdmins = [], isBotAdmin = false, isSenderAdmin = false;
            if (isGroup) {
                groupMetadata = await sock.groupMetadata(remoteJid).catch(() => null);
                if (groupMetadata) {
                    groupAdmins = groupMetadata.participants.filter(p => p.admin).map(p => p.id);
                    isBotAdmin = groupAdmins.includes(botNumber);
                    isSenderAdmin = groupAdmins.includes(sender);
                }
            }

            // --- FEATURE 1: AUTO READ ---
            if (vexSettings['autoread']?.value) {
                sock.readMessages([m.key]);
            }

            // --- FEATURE 2: AUTO STATUS LIKE ---
            if (vexSettings['autostatus_like']?.value && remoteJid === 'status@broadcast') {
                sock.readMessages([m.key]);
                sock.sendMessage('status@broadcast', { react: { text: '💜', key: m.key } }, { statusJidList: [sender] });
                return; 
            }

            // --- FEATURE 3: ANTI LINK ---
            if (isGroup && vexSettings['anti_link']?.value && !isSenderAdmin && isBotAdmin) {
                if (/chat\.whatsapp\.com|wa\.me/i.test(body)) {
                    await sock.sendMessage(remoteJid, { delete: m.key });
                    await sock.sendMessage(remoteJid, { text: `🚫 *Anti-Link:*\n@${sender.split('@')[0]} Links haziruhusiwi hapa!`, mentions: [sender] });
                    await sock.groupParticipantsUpdate(remoteJid, [sender], 'remove');
                    return;
                }
            }

            // --- FEATURE 4: ANTI BADWORDS ---
            if (vexSettings['anti_badwords']?.value && isBotAdmin && !isSenderAdmin) {
                const hasBadWord = badWordsList.some(word => body.toLowerCase().includes(word));
                if (hasBadWord) {
                    await sock.sendMessage(remoteJid, { delete: m.key });
                    await sock.sendMessage(remoteJid, { text: `⚠️ Lugha chafu hairuhusiwi @${sender.split('@')[0]}`, mentions: [sender] });
                    return;
                }
            }

            // --- FEATURE 5: ANTI BOT ---
            if (isGroup && vexSettings['anti_bot']?.value && isBotAdmin && !isSenderAdmin) {
                // Kama ujumbe una ID inayoashiria ni bot (Baileys usually starts with BAE5 or 3EB0)
                if (m.key.id.startsWith('BAE5') || m.key.id.startsWith('3EB0') || m.key.id.length === 16) {
                    await sock.sendMessage(remoteJid, { text: `🤖 Bot Mgeni amedetectiwa. Kick inafuata...` });
                    await sock.groupParticipantsUpdate(remoteJid, [sender], 'remove');
                    return;
                }
            }

            // --- FEATURE 6: AUTO TYPING (Non-blocking) ---
            if (vexSettings['autotyping']?.value && body.length > 0 && !isCmd) {
                sock.sendPresenceUpdate('composing', remoteJid);
                setTimeout(() => sock.sendPresenceUpdate('paused', remoteJid), 3000);
            }

            // --- FEATURE 7: AUTO REACT ---
            if (vexSettings['autoreact']?.value && !isCmd) {
                const reacts = vexSettings['autoreact'].extra || ['🔥','💯','✅'];
                const randomEmoji = reacts[Math.floor(Math.random() * reacts.length)];
                sock.sendMessage(remoteJid, { react: { text: randomEmoji, key: m.key } });
            }

            // ==========================================
            // BUILT-IN COMMAND: .vex (Kuwasha/Kuzima settings in-chat)
            // ==========================================
            if (body.startsWith('.vex ')) {
                const args = body.split(' ');
                const settingToChange = args[1]?.toLowerCase();
                const action = args[2]?.toLowerCase(); // 'on' or 'off'

                const validSettings = ['anti_link', 'anti_bot', 'anti_badwords', 'autoread', 'autotyping', 'autoreact', 'autostatus_like', 'always_online'];

                if (validSettings.includes(settingToChange) && (action === 'on' || action === 'off')) {
                    const isTrue = (action === 'on');
                    await global.updateVexSetting(settingToChange, isTrue);
                    sock.sendMessage(remoteJid, { text: `✅ Settings Updated!\n\n⚙️ *${settingToChange}* sasa ipo *${action.toUpperCase()}*` }, { quoted: m });
                } else {
                    sock.sendMessage(remoteJid, { text: `❌ Matumizi Sahihi:\n.vex <setting> on/off\n\n*Settings Zilizopo:*\n${validSettings.join(', ')}` }, { quoted: m });
                }
                return;
            }

            // --- STANDARD COMMAND EXECUTION ---
            if (!isCmd) return;

            const args = body.slice(1).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();
            const cmd = commands.get(cmdName);

            if (cmd) {
                console.log(`📡 [CMD]: .${cmdName} | By: ${pushname}`);
                
                m.text = body;
                m.chat = remoteJid;
                m.isGroup = isGroup;
                m.sender = sender;
                m.pushname = pushname;
                m.reply = (txt) => sock.sendMessage(remoteJid, { text: txt }, { quoted: m });

                try {
                    // Injecting all prepared variables so your external files can use them!
                    await cmd.execute(m, sock, { args, isGroup, sender, groupAdmins, isBotAdmin, isSenderAdmin, pushname, commands });
                } catch (cmdError) { 
                    console.error(`🛑 [CMD ERROR]:`, cmdError.message);
                }
            }
        } catch (err) { /* Silent Catch */ }
    });

    return sock;
}

// ==========================================
// 6. WEB INTERFACE (QR CODE)
// ==========================================
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>VEX MASTER TERMINAL</title>
        <style>
            body { background: #050505; color: #00ffcc; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            #qr-container { border: 2px solid #00ffcc; padding: 20px; background: #fff; border-radius: 10px; display: none; margin-top:20px; }
            h1 { letter-spacing: 5px; text-shadow: 0 0 10px #00ffcc; margin:0;}
        </style>
    </head>
    <body>
        <h1>VEX CORE FAST</h1>
        <div id="status">INASUBIRI...</div>
        <div id="qr-container"><img id="qr-img" src="" style="width: 250px;"></div>
        
        <script src="/socket.io/socket.io.js"></script>
        <script>
            const socket = io();
            const qrContainer = document.getElementById('qr-container');
            const qrImg = document.getElementById('qr-img');
            const status = document.getElementById('status');
            
            socket.on('qr', (data) => {
                qrImg.src = data.qr;
                qrContainer.style.display = 'block';
                status.innerText = 'SCAN QR CODE KWA WHATSAPP YAKO';
            });
            
            socket.on('connected', () => {
                qrContainer.style.display = 'none';
                status.innerText = 'BOT IPO HEWANI TAYARI ✅';
                status.style.color = '#00ff00';
            });
        </script>
    </body>
    </html>
    `);
});

// ==========================================
// 7. SUPER FAST BOOTSTRAP
// ==========================================
httpServer.listen(PORT, async () => {
    console.log(`🚀 [VEX FAST] Terminal listening on Port: ${PORT}`);
    
    await loadVexSettings(); 
    loadCommands();

    // Inawasha direct (Hakuna tena mambo ya ADMIN_JID limits)
    console.log("⚡ Booting VEX Core...");
    startVexInstance('vex_main_session'); // Starts without delays
});

// ==========================================
// 8. GLOBAL ANTI-CRASH
// ==========================================
process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});
