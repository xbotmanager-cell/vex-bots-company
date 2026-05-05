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
import express from "express";
import http from "http";
import { Server } from "socket.io";
import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";

// CORE IMPORTS
import router from "./core/router.js";
import cache from "./core/cache.js";

// PATH FIX FOR ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ================= GLOBAL CONFIG =================
global.prefix = ".";
global.activeStyle = "normal";

// ================= STORAGE =================
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

// ================= LOADERS (DYNAMIC ESM) =================
async function loadCommands() {
    commands.clear();
    aliases.clear();
    if (!fs.existsSync(pluginPath)) fs.mkdirSync(pluginPath);
    const files = fs.readdirSync(pluginPath).filter(f => f.endsWith(".js"));

    for (const file of files) {
        try {
            const filePath = path.join(pluginPath, file);
            // Dynamic import with cache busting
            const plugin = (await import(`file://${filePath}?update=${Date.now()}`)).default;
            const name = plugin.command || file.replace(".js", "");
            commands.set(name, plugin);
            if (Array.isArray(plugin.alias)) {
                for (const a of plugin.alias) aliases.set(a, name);
            }
        } catch (e) { console.error(`Error loading command ${file}:`, e.message); }
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
            const obs = (await import(`file://${filePath}?update=${Date.now()}`)).default;
            if (obs.onMessage) observers.push(obs);
        } catch (e) { console.error(`Error loading observer ${file}:`, e.message); }
    }
    console.log(`👁️ Observers Loaded: ${observers.length}`);
}

// ================= SUPABASE SYNC (LIVE) =================
async function syncSettings() {
    try {
        // Initial Fetch
        const { data } = await supabase.from("vex_settings").select("*");
        if (data) {
            data.forEach(s => {
                if (s.setting_name === "prefix") global.prefix = s.extra_data?.current || ".";
                if (s.setting_name === "style") global.activeStyle = s.extra_data?.current || "normal";
            });
        }

        // Live Realtime Listener
        supabase.channel("vex_live_updates")
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "vex_settings" }, payload => {
                const { setting_name, extra_data } = payload.new;
                if (setting_name === "prefix") global.prefix = extra_data.current;
                if (setting_name === "style") global.activeStyle = extra_data.current;
                console.log(`📡 [LIVE UPDATE] ${setting_name.toUpperCase()} changed to: ${extra_data.current}`);
            })
            .subscribe();
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
        const { data } = await supabase.from("vex_session").select("data").eq("id", "v1_session").single();
        if (data) {
            const decoded = Buffer.from(data.data, "base64").toString("utf-8");
            if (!fs.existsSync("./session")) fs.mkdirSync("./session");
            fs.writeFileSync("./session/creds.json", decoded);
            console.log("☁️ Session Restored");
        }
    } catch {}
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
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
        },
        browser: ["VEX CORE", "Chrome", "5.0"]
    });

    app.use(express.json());

    // Pairing Logic
    app.post("/pair", async (req, res) => {
        try {
            const number = req.body.number?.replace(/\D/g, "");
            if (!number) return res.json({ error: "Invalid number" });
            const code = await sock.requestPairingCode(number + "@s.whatsapp.net");
            const expiry = Date.now() + 90000;
            activePairings.set(number, { code, expiry });
            io.emit("pairing", { number, code, expiry });
            res.json({ code, expiry });
        } catch (e) { res.json({ error: e.message }); }
    });

    // Message Handling
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m || !m.message) return;

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
                    obs.onMessage(m, sock, { supabase, cache, userSettings: cache.getUser(m.sender) });
                }
            } catch {}
        }

        // Run Router & Commands
        try {
            const route = await router(m, {
                body, commands, aliases, observers, cache, supabase, prefix: global.prefix
            });

            if (route && route.type === "command") {
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
            if (shouldReconnect) startVex();
        }

        if (connection === "open") {
            io.emit("connected");
            await syncSessionToCloud(state.creds);
            
            // Startup Report Message
            const statusReport = `🚀 *VEX SYSTEM ACTIVE*\n\n` +
                                `📡 *Prefix:* ${global.prefix}\n` +
                                `🛠️ *Commands:* ${commands.size}\n` +
                                `👁️ *Observers:* ${observers.length}\n` +
                                `🎨 *Active Style:* ${global.activeStyle}\n` +
                                `📱 *Device:* SUPER VEX`;
            
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
            body { margin:0; height:100vh; display:flex; justify-content:center; align-items:center; background:#000; color:#00ffe1; font-family:monospace; }
            .card { padding:30px; border-radius:20px; backdrop-filter:blur(15px); background:rgba(255,255,255,0.05); box-shadow:0 0 25px #00ffe1; text-align:center; }
            img { margin-top:15px; border-radius:10px; border: 2px solid #00ffe1; }
        </style>
    </head>
    <body>
        <div class="card">
            <h2>VEX CORE SYSTEM</h2>
            <img id="qr" width="250" src=""/>
            <p id="status">Waiting for QR...</p>
        </div>
        <script>
            const socket = io();
            const qrImg = document.getElementById("qr");
            const status = document.getElementById("status");
            socket.on("qr", d => { qrImg.src = d; status.innerText = "Scan QR to login"; });
            socket.on("connected", () => { qrImg.style.display="none"; status.innerText = "BOT CONNECTED ✅"; });
        </script>
    </body>
    </html>
    `);
});

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
startVex();

// SILENT ERRORS
process.on("uncaughtException", (err) => console.error("Uncaught:", err.message));
process.on("unhandledRejection", (err) => console.error("Unhandled:", err.message));
