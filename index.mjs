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
import { createRequire } from "module";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";

// CORE UTILS
import router from "./core/router.js";
import cache from "./core/cache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ================= GLOBAL =================
global.prefix = ".";

// ================= PATHS & STORAGE =================
const pluginPath = path.join(__dirname, "plugins");
const observerPath = path.join(__dirname, "observers");
const commands = new Map();
const aliases = new Map();
const observers = [];
const activePairings = new Map();

// ================= SERVER SETUP =================
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;

// ================= OLD STYLE LOADERS (INTEGRATED) =================
function loadCommands() {
    commands.clear();
    aliases.clear();
    if (!fs.existsSync(pluginPath)) fs.mkdirSync(pluginPath);
    
    const files = fs.readdirSync(pluginPath).filter(f => f.endsWith(".js") || f.endsWith(".mjs"));
    for (const file of files) {
        try {
            const filePath = path.join(pluginPath, file);
            // Dynamic import for ESM compatibility
            import(`${filePath}?update=${Date.now()}`).then(plugin => {
                const p = plugin.default || plugin;
                const name = p.command || file.replace(/\.(js|mjs)$/, "");
                commands.set(name, p);
                if (Array.isArray(p.alias)) {
                    for (const a of p.alias) aliases.set(a, name);
                }
            });
        } catch (e) {}
    }
    console.log(`✅ Commands Synced`);
}

function loadObservers() {
    observers.length = 0;
    if (!fs.existsSync(observerPath)) fs.mkdirSync(observerPath);
    
    const files = fs.readdirSync(observerPath).filter(f => f.endsWith(".js") || f.endsWith(".mjs"));
    for (const file of files) {
        try {
            const filePath = path.join(observerPath, file);
            import(`${filePath}?update=${Date.now()}`).then(obs => {
                const o = obs.default || obs;
                if (o.onMessage) observers.push(o);
            });
        } catch (e) {}
    }
    console.log(`👁️ Observers Synced`);
}

// ================= SUPABASE & SESSION SYSTEM =================
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
            if (!fs.existsSync("./session")) fs.mkdirSync("./session");
            fs.writeFileSync("./session/creds.json", Buffer.from(data.data, "base64").toString("utf-8"));
            console.log("☁️ Session Restored");
        }
    } catch {}
}

async function syncSettings() {
    try {
        const { data } = await supabase.from("vex_settings").select("extra_data").eq("setting_name", "prefix").single();
        if (data?.extra_data?.current) global.prefix = data.extra_data.current;
        
        supabase.channel("prefix-live").on("postgres_changes", { 
            event: "UPDATE", schema: "public", table: "vex_settings", filter: "setting_name=eq.prefix" 
        }, payload => {
            global.prefix = payload.new.extra_data.current;
        }).subscribe();
    } catch {}
}

// ================= MAIN ENGINE =================
async function startVex() {
    await loadSessionFromCloud();
    await syncSettings();
    loadCommands();
    loadObservers();

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
        browser: ["Ubuntu", "Chrome", "20.0.04"] 
    });

    app.use(express.json());
    app.post("/pair", async (req, res) => {
        try {
            const num = req.body.number?.replace(/\D/g, "");
            const code = await sock.requestPairingCode(num + "@s.whatsapp.net");
            activePairings.set(num, { code, expiry: Date.now() + 90000 });
            io.emit("pairing", { number: num, code });
            res.json({ code });
        } catch (e) { res.json({ error: e.message }); }
    });

    // MESSAGE HANDLER
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m?.message) return; // Allows bot to read own messages

        let body = m.message?.conversation || m.message?.extendedTextMessage?.text || 
                   m.message?.imageMessage?.caption || m.message?.videoMessage?.caption || "";

        m.chat = m.key.remoteJid;
        m.sender = m.key.participant || m.chat;
        m.reply = (text) => sock.sendMessage(m.chat, { text }, { quoted: m });

        for (const obs of observers) {
            try {
                if (!obs.trigger || obs.trigger(m)) {
                    obs.onMessage(m, sock, { supabase, cache }).catch(() => {});
                }
            } catch {}
        }

        if (!body.startsWith(global.prefix)) return;

        try {
            const route = await router(m, {
                body, commands, aliases, observers, cache, supabase, prefix: global.prefix
            });
            if (route?.type === "command") {
                await route.command.execute(m, sock, route.context).catch(() => {});
            }
        } catch {}
    });

    // CONNECTION HANDLER
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            const qrData = await QRCode.toDataURL(qr);
            io.emit("qr", qrData);
        }
        if (connection === "close") {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startVex();
        }
        if (connection === "open") {
            io.emit("connected");
            await syncSessionToCloud(state.creds);
            setTimeout(() => {
                sock.sendMessage(sock.user.id, { text: `VEX SYSTEM ONLINE\nPrefix: ${global.prefix}` });
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
        .card { padding:30px; border-radius:20px; background:rgba(255,255,255,0.05); border:1px solid #00ffe1; text-align:center; box-shadow:0 0 20px #00ffe1; }
        img { margin-top:15px; border-radius:10px; background:white; padding:5px; }
    </style>
</head>
<body>
    <div class="card">
        <h2>VEX SYSTEM</h2>
        <img id="qr" width="250" src="https://via.placeholder.com/250?text=WAITING+QR"/>
        <p id="status">INITIALIZING...</p>
    </div>
    <script>
        const socket = io();
        socket.on("qr", d => { document.getElementById("qr").src = d; document.getElementById("status").innerText="SCAN QR"; });
        socket.on("connected", () => { document.getElementById("qr").style.display="none"; document.getElementById("status").innerText="CONNECTED ✅"; });
    </script>
</body>
</html>`);
});

server.listen(PORT, () => startVex());

process.on("uncaughtException", () => {});
process.on("unhandledRejection", () => {});
