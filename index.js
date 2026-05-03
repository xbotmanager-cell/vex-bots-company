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
const fs = require("fs");
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require("qrcode");

// DATABASE
const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// GLOBAL CONFIG (Lupin Dynamic Prefix System)
global.prefix = "."; // Default kama database ikifeli

// CORE SYSTEMS (future-ready)
const router = require("./core/router"); 
const cache = require("./core/cache");   

// PATHS
const pluginPath = path.join(__dirname, "plugins");
const observerPath = path.join(__dirname, "observers");

// STORAGE
const commands = new Map();
const aliases = new Map();
const observers = [];

// SERVER
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;

// ================= LOADERS =================

function loadCommands() {
    commands.clear();
    aliases.clear();

    if (!fs.existsSync(pluginPath)) fs.mkdirSync(pluginPath);

    const files = fs.readdirSync(pluginPath).filter(f => f.endsWith(".js"));

    for (const file of files) {
        const filePath = path.join(pluginPath, file);
        try {
            delete require.cache[require.resolve(filePath)];
            const plugin = require(filePath);

            const name = plugin.command || file.split(".")[0];
            commands.set(name, plugin);

            if (plugin.alias && Array.isArray(plugin.alias)) {
                for (const a of plugin.alias) {
                    aliases.set(a, name);
                }
            }

        } catch (e) {
            console.error(`PLUGIN LOAD ERROR [${file}]:`, e.message);
        }
    }
    console.log(`✅ Loaded ${commands.size} commands`);
}

function loadObservers() {
    observers.length = 0;

    if (!fs.existsSync(observerPath)) fs.mkdirSync(observerPath);

    const files = fs.readdirSync(observerPath).filter(f => f.endsWith(".js"));

    for (const file of files) {
        const filePath = path.join(observerPath, file);
        try {
            delete require.cache[require.resolve(filePath)];
            const obs = require(filePath);

            if (obs.onMessage) {
                observers.push(obs);
            }

        } catch (e) {
            console.error(`OBSERVER LOAD ERROR [${file}]:`, e.message);
        }
    }
    console.log(`👁️ Loaded ${observers.length} observers`);
}

// ================= SESSION RECOVERY (LUPIN LOGIC) =================

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
            if (!fs.existsSync("./session")) fs.mkdirSync("./session");
            fs.writeFileSync("./session/creds.json", decoded);
            console.log('✅ [VEX]: Cloud Session Restored.');
            return true;
        }
    } catch (e) { 
        console.log('ℹ️ [VEX]: No cloud session found, starting fresh.'); 
        return false;
    }
}

// ================= DYNAMIC SETTINGS (SUPER FAST SYNC) =================

async function syncSettings() {
    // 1. Initial Fetch
    const { data } = await supabase.from('vex_settings').select('extra_data').eq('setting_name', 'prefix').single();
    if (data && data.extra_data) {
        global.prefix = data.extra_data.current || ".";
        console.log(`🎯 [VEX]: Prefix loaded: ${global.prefix}`);
    }

    // 2. Realtime Listener (No Restart Needed)
    supabase
        .channel('schema-db-changes')
        .on('postgres_changes', 
            { event: 'UPDATE', schema: 'public', table: 'vex_settings', filter: 'setting_name=eq.prefix' }, 
            (payload) => {
                global.prefix = payload.new.extra_data.current;
                console.log(`⚡ [REALTIME]: Prefix updated to: ${global.prefix}`);
            }
        )
        .subscribe();
}

// ================= MAIN =================

async function startVex() {

    await loadSessionFromCloud();
    await syncSettings(); // Sync prefix kabla ya kila kitu

    loadCommands();
    loadObservers();

    const { state, saveCreds } = await useMultiFileAuthState("session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "fatal" }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
        },
        browser: ["VEX CORE", "Chrome", "5.0"]
    });

    // ================= MESSAGE HANDLER =================

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;

        const remoteJid = m.key.remoteJid;
        const type = getContentType(m.message);

        const body =
            type === "conversation" ? m.message.conversation :
            type === "extendedTextMessage" ? m.message.extendedTextMessage.text :
            type === "imageMessage" ? m.message.imageMessage.caption :
            type === "videoMessage" ? m.message.videoMessage.caption :
            "";

        m.chat = remoteJid;
        m.sender = m.key.participant || remoteJid;
        m.isGroup = remoteJid.endsWith("@g.us");
        m.reply = (text) => sock.sendMessage(m.chat, { text }, { quoted: m });

        try {
            const route = await router(m, {
                body,
                commands,
                aliases,
                observers,
                cache,
                supabase,
                prefix: global.prefix // Pass dynamic prefix to router
            });

            if (!route) return;

            if (route.type === "observer") {
                for (const obs of route.list) {
                    try {
                        await obs.onMessage(m, sock, route.context);
                    } catch (e) { console.error(`Observer Error:`, e.message); }
                }
            }

            if (route.type === "command") {
                const cmd = route.command;
                if (!cmd) return;
                try {
                    await cmd.execute(m, sock, route.context);
                } catch (e) { console.error(`Command Error:`, e.message); }
            }

        } catch (err) { console.error("Router Failure:", err.message); }
    });

    // ================= CONNECTION =================

    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) io.emit("qr", await QRCode.toDataURL(qr));

        if (connection === "close") {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startVex();
        }

        if (connection === "open") {
            io.emit("connected");
            console.log("🚀 VEX CORE ONLINE");

            await syncSessionToCloud(state.creds);

            setTimeout(async () => {
                await sock.sendMessage(sock.user.id, {
                    text: `VEX CORE ACTIVE\nPrefix: ${global.prefix}\nCommands: ${commands.size}\nObservers: ${observers.length}`
                });
            }, 4000);
        }
    });

    sock.ev.on("creds.update", async () => {
        await saveCreds();
        await syncSessionToCloud(state.creds);
    });
}

// ================= WEB (VEX DASHBOARD) =================

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>VEX CORE</title><script src="/socket.io/socket.io.js"></script><style>body { background: #050505; color: #00ffcc; font-family: 'Courier New', monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; } #qr-container { border: 2px solid #00ffcc; padding: 20px; background: #fff; border-radius: 10px; } h1 { letter-spacing: 5px; text-shadow: 0 0 10px #00ffcc; }</style></head><body><h1>VEX SYSTEM</h1><div id="qr-container"><img id="qr-img" src="" style="display:none; width: 250px;"><div id="loader" style="color:#000">LINKING CORE...</div></div><div class="status" id="status" style="margin-top:20px;font-weight:bold;">STANDBY</div><script>const socket = io(); const qrImg = document.getElementById('qr-img'); const loader = document.getElementById('loader'); const status = document.getElementById('status'); socket.on('qr', (url) => { qrImg.src = url; qrImg.style.display = 'block'; loader.style.display = 'none'; status.innerText = 'SCAN TO ACTIVATE'; }); socket.on('connected', () => { qrImg.style.display = 'none'; loader.innerText = 'VEX ONLINE ✅'; loader.style.display = 'block'; status.innerText = 'SYSTEM SYNCED'; status.style.color = '#00ff00'; });</script></body></html>`);
});

server.listen(PORT, () => startVex());

// ================= ERROR HANDLING =================

process.on("uncaughtException", err => console.error("CRITICAL:", err));
process.on("unhandledRejection", err => console.error("PROMISE:", err));
