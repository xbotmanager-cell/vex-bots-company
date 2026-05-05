import "dotenv/config";
import makeWASocket, { 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore 
} from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module"; // FIXED: Bridge for CommonJS
import express from "express";
import http from "http";
import { Server } from "socket.io";
import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";

// CORE IMPORTS
import router from "./core/router.js";
import cache from "./core/cache.js";

// PATH & REQUIRE FIX
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url); // FIXED: Allows loading .js plugins in ESM

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ================= GLOBAL CONFIG =================
global.prefix = ".";
global.activeStyle = "normal";

const commands = new Map();
const aliases = new Map();
const observers = [];
const activePairings = new Map();

const pluginPath = path.join(__dirname, "plugins");
const observerPath = path.join(__dirname, "observers");

// ================= SERVER SETUP =================
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;

// ================= LOADERS (FIXED FOR PLUGINS) =================
async function loadCommands() {
    commands.clear();
    aliases.clear();
    if (!fs.existsSync(pluginPath)) fs.mkdirSync(pluginPath);
    const files = fs.readdirSync(pluginPath).filter(f => f.endsWith(".js"));

    for (const file of files) {
        try {
            const filePath = path.join(pluginPath, file);
            // FIXED: Using require() instead of import() to support CJS plugins "hewani hewani"
            delete require.cache[require.resolve(filePath)]; 
            const plugin = require(filePath); 
            
            const name = plugin.command || file.replace(".js", "");
            commands.set(name, plugin);
            if (Array.isArray(plugin.alias)) {
                for (const a of plugin.alias) aliases.set(a, name);
            }
        } catch (e) { console.error(`❌ Command Error [${file}]:`, e.message); }
    }
    console.log(`✅ Commands Loaded: ${commands.size}`);
}

async function loadObservers() {
    observers.length = 0;
    if (!fs.existsSync(observerPath)) fs.mkdirSync(observerPath);
    const files = fs.readdirSync(observerPath).filter(f => f.endsWith(".js"));

    for (const file of files) {
        try {
            const filePath = path.join(observerPath, file);
            delete require.cache[require.resolve(filePath)];
            const obs = require(filePath);
            if (obs.onMessage) observers.push(obs);
        } catch (e) { console.error(`❌ Observer Error [${file}]:`, e.message); }
    }
    console.log(`👁️ Observers Loaded: ${observers.length}`);
}

// ================= SUPABASE SYNC (FIXED ERROR) =================
async function syncSettings() {
    try {
        const { data } = await supabase.from("vex_settings").select("*");
        if (data) {
            data.forEach(s => {
                if (s.setting_name === "prefix") global.prefix = s.extra_data?.current || ".";
                if (s.setting_name === "style") global.activeStyle = s.extra_data?.current || "normal";
            });
        }

        // FIXED: Subscription logic to prevent "cannot add after subscribe" error
        const channel = supabase.channel("vex_live_updates");
        channel
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "vex_settings" }, payload => {
                const { setting_name, extra_data } = payload.new;
                if (setting_name === "prefix") global.prefix = extra_data.current;
                if (setting_name === "style") global.activeStyle = extra_data.current;
                console.log(`📡 [LIVE] ${setting_name.toUpperCase()} -> ${extra_data.current}`);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') console.log("🌐 Realtime Sync Active");
            });
    } catch (e) { console.error("Sync Error:", e.message); }
}

// ================= SESSION LOGIC =================
async function syncSessionToCloud(creds) {
    try {
        const base64 = Buffer.from(JSON.stringify(creds)).toString("base64");
        await supabase.from("vex_session").upsert({ id: "v1_session", data: base64 });
    } catch {}
}

async function loadSessionFromCloud() {
    try {
        const { data } = await supabase.from("vex_session").select("data").eq("id", "v1_session").maybeSingle();
        if (data) {
            const decoded = Buffer.from(data.data, "base64").toString("utf-8");
            if (!fs.existsSync("./session")) fs.mkdirSync("./session");
            fs.writeFileSync("./session/creds.json", decoded);
            console.log("☁️ Cloud Session Restored");
        }
    } catch (e) { console.log("ℹ️ Starting fresh session..."); }
}

// ================= MAIN ENGINE =================
async function startVex() {
    await loadSessionFromCloud();
    await syncSettings();
    await cache.init(supabase);
    await loadCommands();
    await loadObservers();

    const { state, saveCreds } = await useMultiFileAuthState("session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false, // QR is handled via Web UI
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
        },
        browser: ["VEX CORE", "Chrome", "1.0.0"]
    });

    app.use(express.json());

    // Pairing Logic
    app.post("/pair", async (req, res) => {
        try {
            const number = req.body.number?.replace(/\D/g, "");
            if (!number) return res.json({ error: "Invalid number" });
            const code = await sock.requestPairingCode(number);
            const expiry = Date.now() + 90000;
            activePairings.set(number, { code, expiry });
            io.emit("pairing", { number, code, expiry });
            res.json({ code, expiry });
        } catch (e) { res.json({ error: e.message }); }
    });

    // Message Handling
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m || !m.message || m.key.fromMe) return;

        const body = m.message?.conversation || m.message?.extendedTextMessage?.text || 
                     m.message?.imageMessage?.caption || m.message?.videoMessage?.caption || "";

        m.chat = m.key.remoteJid;
        m.sender = m.key.participant || m.chat;
        m.reply = (text) => sock.sendMessage(m.chat, { text }, { quoted: m });

        // Run Observers
        for (const obs of observers) {
            try {
                const triggerResult = typeof obs.trigger === 'function' ? obs.trigger(m) : true;
                if (triggerResult) {
                    await obs.onMessage(m, sock, { supabase, cache, userSettings: cache.getUser(m.sender) });
                }
            } catch (e) { console.error("Observer Exec Error:", e.message); }
        }

        // Run Router
        try {
            const route = await router(m, {
                body, commands, aliases, observers, cache, supabase, prefix: global.prefix
            });
            if (route?.type === "command") {
                await route.command.execute(m, sock, route.context);
            }
        } catch (e) { console.error("Router Error:", e.message); }
    });

    // Connection Updates
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) io.emit("qr", await QRCode.toDataURL(qr));
        
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`🔌 Connection closed. Reconnecting: ${shouldReconnect}`);
            if (shouldReconnect) startVex();
        }

        if (connection === "open") {
            io.emit("connected");
            await syncSessionToCloud(state.creds);
            console.log("✅ VEX CONNECTED SUCCESSFULLY");
            
            const statusReport = `🚀 *VEX SYSTEM ONLINE*\n\n` +
                                `📡 *Prefix:* ${global.prefix}\n` +
                                `🛠️ *Commands:* ${commands.size}\n` +
                                `🎨 *Style:* ${global.activeStyle}`;
            
            setTimeout(() => {
                sock.sendMessage(sock.user.id, { text: statusReport });
            }, 3000);
        }
    });

    sock.ev.on("creds.update", async () => {
        await saveCreds();
        await syncSessionToCloud(state.creds);
    });
}

// ================= WEB UI =================
app.get("/", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>VEX CORE</title>
        <script src="/socket.io/socket.io.js"></script>
        <style>
            body { margin:0; height:100vh; display:flex; justify-content:center; align-items:center; background:#0a0a0a; color:#00ffe1; font-family:sans-serif; }
            .card { padding:40px; border-radius:25px; background:rgba(255,255,255,0.03); border:1px solid #00ffe1; text-align:center; box-shadow: 0 0 30px rgba(0,255,225,0.2); }
            img { margin:20px 0; border:4px solid #fff; border-radius:10px; background:#fff; }
            #status { font-weight:bold; letter-spacing:1px; }
        </style>
    </head>
    <body>
        <div class="card">
            <h1>VEX CORE</h1>
            <img id="qr" width="250" src="https://via.placeholder.com/250?text=Waiting+for+QR"/>
            <p id="status">INITIALIZING SYSTEM...</p>
        </div>
        <script>
            const socket = io();
            socket.on("qr", d => { document.getElementById("qr").src = d; document.getElementById("status").innerText = "SCAN QR CODE"; });
            socket.on("connected", () => { document.getElementById("qr").style.display="none"; document.getElementById("status").innerText = "✅ SYSTEM ACTIVE"; });
        </script>
    </body>
    </html>
    `);
});

server.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
startVex();

// PREVENT CRASHING
process.on("uncaughtException", (err) => console.error("🛑 Critical:", err.message));
process.on("unhandledRejection", (err) => console.error("🛑 Rejection:", err.message));
