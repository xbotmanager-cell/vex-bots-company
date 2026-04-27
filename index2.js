/**
 * VEX MULTI-DEVICE MASTER SYSTEM - ULTIMATE SAAS & CLOUD SYNC
 * Feature: Multi-Instance, Pairing Code, Lazy Loading, Realtime Supabase,
 * Organic Auto-Typing, Purple Status Like, Self-Healing, Anti-Crash.
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

// Real-time Settings Cache for Organic Features
let vexSettings = {};

// ==========================================
// 2. SUPABASE CLOUD SYNC & SETTINGS
// ==========================================
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
        if (data && data.session_data) {
            return JSON.parse(Buffer.from(data.session_data, 'base64').toString('utf-8'));
        }
    } catch (e) { return null; }
    return null;
}

async function loadVexSettings() {
    try {
        const { data } = await supabase.from('vex_settings').select('*');
        if (data) {
            data.forEach(s => {
                vexSettings[s.setting_name] = { value: s.value, extra: s.extra_data };
            });
        }
    } catch (e) { console.error('⚙️ [SETTINGS LOAD ERROR]:', e.message); }
}

// Global Function to Update Settings via WhatsApp Commands
global.updateVexSetting = async (settingName, value, extraData = null) => {
    try {
        // Update Cache Immediately
        vexSettings[settingName] = { value: value, extra: extraData };
        // Sync to Supabase
        await supabase.from('vex_settings').upsert({
            setting_name: settingName,
            value: value,
            extra_data: extraData
        });
        return true;
    } catch (e) {
        console.error(`❌ [SETTING UPDATE FAILED]:`, e.message);
        return false;
    }
};

// REAL-TIME SETTINGS LISTENER
supabase.channel('settings_changes')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'vex_settings' }, (payload) => {
    const updated = payload.new;
    vexSettings[updated.setting_name] = { value: updated.value, extra: updated.extra_data };
    console.log(`🔄 [REALTIME]: ${updated.setting_name} dynamically updated.`);
  }).subscribe();

// ==========================================
// 3. COMMAND LOADER
// ==========================================
function loadCommands() {
    if (fs.existsSync(cmdPath)) {
        const files = fs.readdirSync(cmdPath).filter(f => f.endsWith('.js'));
        for (const file of files) {
            try {
                // Clear cache to allow real-time command updates if needed
                delete require.cache[require.resolve(path.join(cmdPath, file))];
                const cmd = require(path.join(cmdPath, file));
                commands.set(cmd.vex || file.split('.')[0], cmd);
            } catch (e) { console.error(`🔥 [LOAD ERROR] ${file}:`, e.message); }
        }
        console.log(`📁 [VEX]: ${commands.size} Commands Loaded Successfully.`);
    }
}

// ==========================================
// 4. CORE BOT ENGINE (SAAS MULTI-DEVICE)
// ==========================================
async function startVexInstance(jid, usePairing = false, phoneNumber = null, m = null) {
    if (botInstances.has(jid)) return botInstances.get(jid);

    const sessionDir = `./sessions/${jid.split('@')[0]}`;
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const cloudCreds = await getSession(jid);
    
    // Restore session from cloud if local is missing/unregistered
    if (cloudCreds && (!state.creds || !state.creds.registered)) {
        state.creds = cloudCreds;
        console.log(`☁️ [RESTORED FROM CLOUD]: ${jid}`);
    }

    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    // The Ultimate WASocket Configuration
    const sock = makeWASocket({
        version,
        logger: pino({ level: "fatal" }), // Keep console clean
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
        },
        browser: ["VEX-MASTER", "MacOS", "3.0.0"], // Fixed browser spoofing to bypass bans
        syncFullHistory: false, // Save memory
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true
    });

    // --- PAIRING CODE LOGIC (For Subbots) ---
    if (usePairing && phoneNumber && !sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(`📲 [PAIRING CODE] ${phoneNumber}: ${code}`);
                
                if (m) {
                    const adminSock = botInstances.get(process.env.ADMIN_JID);
                    if (adminSock) {
                        await adminSock.sendMessage(m.key.remoteJid, { 
                            text: `✅ *VEX PAIRING CODE GENERATED*\n\nNumber: ${phoneNumber}\nCode: *${code}*\n\nPlease input this in WhatsApp -> Linked Devices -> Link with Phone Number.` 
                        });
                    }
                }
                io.emit('pairing_code', { jid, code });
            } catch (err) { console.error("Pairing Request Error:", err.message); }
        }, 3500); // Slight delay ensures connection is ready
    }

    botInstances.set(jid, sock);

    // --- EVENT LISTENERS ---
    sock.ev.on('creds.update', async () => {
        await saveCreds();
        await syncToCloud(jid, state.creds);
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // Broadcast QR code to web UI (Admin only)
        if (qr && jid === process.env.ADMIN_JID) {
            try {
                const qrImage = await QRCode.toDataURL(qr);
                io.emit('qr', { jid, qr: qrImage });
            } catch (err) { console.error("QR Generation Error:", err.message); }
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`⚠️ [DISCONNECTED] ${jid} - Code: ${statusCode}`);
            
            if (statusCode !== DisconnectReason.loggedOut) {
                // Connection Self-Healing Mechanism
                console.log(`🔄 Reconnecting ${jid} in 5 seconds...`);
                botInstances.delete(jid);
                setTimeout(() => startVexInstance(jid), 5000);
            } else {
                // Logged out completely
                console.log(`❌ [LOGGED OUT] ${jid}. Clearing session...`);
                botInstances.delete(jid);
                if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
                await supabase.from('users_bots').update({ is_active: false }).eq('user_jid', jid);
            }
        } else if (connection === 'open') {
            console.log(`✅ [SYSTEM ONLINE]: ${jid}`);
            io.emit('connected', { jid });
            await syncToCloud(jid, state.creds);
            await supabase.from('users_bots').upsert({ user_jid: jid, is_active: true });

            // Always Online Feature
            if (vexSettings['always_online']?.value) {
                await sock.sendPresenceUpdate('available');
            }

            // Branding Startup Message
            setTimeout(async () => {
                const imgPath = path.join(__dirname, 'assets', 'images', 'vex.png');
                const statusMsg = `*VEX SYSTEM ACTIVATED*\n\n✨ *Status:* Online & Stable\n🤖 *Instance:* ${jid.split('@')[0]}\n📁 *Arsenal:* ${commands.size} Commands\n🛡️ *Security:* Vex-Shield Active`;
                
                try {
                    if (fs.existsSync(imgPath)) {
                        await sock.sendMessage(sock.user.id, { image: fs.readFileSync(imgPath), caption: statusMsg });
                    } else {
                        await sock.sendMessage(sock.user.id, { text: statusMsg });
                    }
                } catch (err) { console.log("Failed to send branding message."); }
            }, 6000);
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0];
            // STRICT ANTI-LOOP: Never respond to our own messages or system messages
            if (!m.message || m.key.fromMe || m.message.protocolMessage) return;

            const remoteJid = m.key.remoteJid;
            const type = getContentType(m.message);
            const isGroup = remoteJid.endsWith('@g.us');
            const sender = isGroup ? m.key.participant : remoteJid;

            // Safe body extraction
            const body = (type === 'conversation') ? m.message.conversation : 
                         (type === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                         (type === 'imageMessage') ? m.message.imageMessage.caption : 
                         (type === 'videoMessage') ? m.message.videoMessage.caption : '';

            // --- FEATURE: PURPLE STATUS LIKER ---
            if (vexSettings['autostatus_like']?.value && remoteJid === 'status@broadcast') {
                try {
                    await sock.readMessages([m.key]);
                    await sock.sendMessage('status@broadcast', { 
                        react: { text: '💜', key: m.key } 
                    }, { statusJidList: [sender] });
                } catch (e) { /* Ignore gone statuses */ }
                return; // Stop processing status messages further
            }

            // --- FEATURE: ORGANIC AUTO-TYPING ---
            if (vexSettings['autotyping']?.value && body.length > 0) {
                // Non-blocking background typing simulation
                (async () => {
                    await sock.sendPresenceUpdate('composing', remoteJid);
                    const typeDelay = Math.floor(Math.random() * (12000 - 5000 + 1) + 5000);
                    await delay(typeDelay);
                    await sock.sendPresenceUpdate('paused', remoteJid);
                })(); 
            }

            // --- COMMAND LOGIC EXECUTION ---
            if (!body || !body.startsWith('.')) return;

            const args = body.slice(1).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();
            const cmd = commands.get(cmdName);

            if (cmd) {
                // Check if user is active in DB before executing
                const { data: user } = await supabase.from('users_bots').select('is_active').eq('user_jid', jid).single();
                
                if (user && user.is_active) {
                    console.log(`📡 [COMMAND] .${cmdName} | From: ${sender} | Bot: ${jid.split('@')[0]}`);
                    
                    // Normalize 'm' object for subbots/commands
                    m.text = body;
                    m.chat = remoteJid;
                    m.isGroup = isGroup;
                    m.sender = sender;
                    m.reply = (txt) => sock.sendMessage(remoteJid, { text: txt }, { quoted: m });

                    try {
                        // Execute command securely
                        await cmd.execute(m, sock, { args, user, commands });
                        
                        // Async stats update
                        supabase.rpc('increment_command_count', { row_id: jid }).catch(()=>null);
                    } catch (cmdError) { 
                        console.error(`🛑 [CMD FAIL] .${cmdName}:`, cmdError.message);
                        m.reply(`❌ Error executing command: ${cmdError.message}`);
                    }
                }
            }
        } catch (globalMsgError) {
            console.error("Critical Message Error:", globalMsgError);
        }
    });

    return sock;
}

// Expose globally for subbot.js to utilize
global.startNewInstance = startVexInstance;

// ==========================================
// 5. ADMIN REALTIME CONTROLLER (KILLS INACTIVE)
// ==========================================
supabase.channel('admin_control')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users_bots' }, (payload) => {
    const { user_jid, is_active } = payload.new;
    if (!is_active && botInstances.has(user_jid)) {
        console.log(`🛑 [ADMIN KILL] Shutting down instance: ${user_jid}`);
        const deadSock = botInstances.get(user_jid);
        deadSock.logout();
        botInstances.delete(user_jid);
    }
  }).subscribe();

// ==========================================
// 6. WEB INTERFACE (QR & STATUS)
// ==========================================
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>VEX MASTER TERMINAL</title>
        <style>
            body { background: #050505; color: #00ffcc; font-family: 'Courier New', monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            #qr-container { border: 2px solid #00ffcc; padding: 20px; background: #fff; border-radius: 10px; display: none; }
            h1 { letter-spacing: 5px; text-shadow: 0 0 10px #00ffcc; }
            .loader { color: #00ffcc; font-size: 20px; }
        </style>
    </head>
    <body>
        <h1>VEX SYSTEM</h1>
        <div id="qr-container"><img id="qr-img" src="" style="width: 250px;"></div>
        <div class="loader" id="status">INITIALIZING CORE...</div>
        
        <script src="/socket.io/socket.io.js"></script>
        <script>
            const socket = io();
            const qrContainer = document.getElementById('qr-container');
            const qrImg = document.getElementById('qr-img');
            const status = document.getElementById('status');
            
            socket.on('qr', (data) => {
                qrImg.src = data.qr;
                qrContainer.style.display = 'block';
                status.innerText = 'SCAN QR CODE TO ACTIVATE ADMIN';
            });
            
            socket.on('connected', () => {
                qrContainer.style.display = 'none';
                status.innerText = 'VEX MASTER ONLINE ✅';
                status.style.color = '#00ff00';
            });
        </script>
    </body>
    </html>
    `);
});

// ==========================================
// 7. SERVER BOOTSTRAP & LAZY LOADING
// ==========================================
httpServer.listen(PORT, async () => {
    console.log(`🚀 [VEX MASTER] Terminal listening on Port: ${PORT}`);
    
    // 1. Load settings and commands first
    await loadVexSettings(); 
    loadCommands();

    // 2. Boot Admin Instance instantly
    if (process.env.ADMIN_JID) {
        console.log("⚡ Booting Admin Core...");
        await startVexInstance(process.env.ADMIN_JID);
    }

    // 3. Lazy Load Subbots (Staggered Startup to save RAM)
    try {
        const { data: bots } = await supabase.from('users_bots').select('user_jid').eq('is_active', true);
        if (bots && bots.length > 0) {
            console.log(`⏳ Lazy Loading ${bots.length - (process.env.ADMIN_JID ? 1 : 0)} Subbot Instances...`);
            for (const bot of bots) {
                if (bot.user_jid !== process.env.ADMIN_JID) {
                    await startVexInstance(bot.user_jid);
                    await delay(6000); // 6 Seconds delay between boots
                }
            }
        }
    } catch (e) { console.error("Lazy Load Database Error:", e.message); }
});

// ==========================================
// 8. GLOBAL ERROR HANDLING (ANTI-CRASH)
// ==========================================
process.on('uncaughtException', (err) => {
    console.error('🛡️ [CRASH PREVENTED - UNCAUGHT]:', err.message);
});

process.on('unhandledRejection', (err) => {
    console.error('🛡️ [CRASH PREVENTED - PROMISE]:', err.message);
});
