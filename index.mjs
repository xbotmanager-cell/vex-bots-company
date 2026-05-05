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

// CONFIG & STORAGE
global.prefix = ".";
global.activeStyle = "normal";
const commands = new Map();
const aliases = new Map();
const observers = [];
const activePairings = new Map();

// SERVER SETUP
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;

// DYNAMIC LOADERS
async function loadAssets() {
    commands.clear(); aliases.clear(); observers.length = 0;
    const paths = { plugins: path.join(__dirname, "plugins"), obs: path.join(__dirname, "observers") };
    
    Object.values(paths).forEach(p => { if (!fs.existsSync(p)) fs.mkdirSync(p); });

    fs.readdirSync(paths.plugins).filter(f => f.endsWith(".js")).forEach(file => {
        try {
            const filePath = path.join(paths.plugins, file);
            delete require.cache[require.resolve(filePath)];
            const plugin = require(filePath);
            const name = plugin.command || file.replace(".js", "");
            commands.set(name, plugin);
            if (Array.isArray(plugin.alias)) plugin.alias.forEach(a => aliases.set(a, name));
        } catch (e) { console.error(`Command Error: ${file}`, e.message); }
    });

    fs.readdirSync(paths.obs).filter(f => f.endsWith(".js")).forEach(file => {
        try {
            const filePath = path.join(paths.obs, file);
            delete require.cache[require.resolve(filePath)];
            const obs = require(filePath);
            if (obs.onMessage) observers.push(obs);
        } catch (e) { console.error(`Observer Error: ${file}`, e.message); }
    });

    console.log(`✅ Commands Loaded: ${commands.size}`);
    console.log(`👁️ Observers Loaded: ${observers.length}`);
}

// SUPABASE SYNC
async function syncCloud() {
    try {
        const { data: sess } = await supabase.from("vex_session").select("data").eq("id", "v1_session").maybeSingle();
        if (sess) {
            if (!fs.existsSync("./session")) fs.mkdirSync("./session");
            fs.writeFileSync("./session/creds.json", Buffer.from(sess.data, "base64").toString("utf-8"));
            console.log("☁️ Session Restored from Cloud");
        }
        const { data: sett } = await supabase.from("vex_settings").select("*");
        sett?.forEach(s => {
            if (s.setting_name === "prefix") global.prefix = s.extra_data?.current || ".";
            if (s.setting_name === "style") global.activeStyle = s.extra_data?.current || "normal";
        });
        supabase.channel("vex_updates").on("postgres_changes", { event: "UPDATE", schema: "public", table: "vex_settings" }, p => {
            if (p.new.setting_name === "prefix") global.prefix = p.new.extra_data.current;
            if (p.new.setting_name === "style") global.activeStyle = p.new.extra_data.current;
        }).subscribe();
    } catch (e) { console.error("Cloud Sync Error:", e.message); }
}

async function saveToCloud(creds) {
    try {
        const data = Buffer.from(JSON.stringify(creds)).toString("base64");
        await supabase.from("vex_session").upsert({ id: "v1_session", data });
    } catch {}
}

// MAIN START
async function startVex() {
    await syncCloud();
    await cache.init(supabase);
    await loadAssets();

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
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        syncFullHistory: false,
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0
    });

    app.use(express.json());
    app.post("/pair", async (req, res) => {
        try {
            const num = req.body.number?.replace(/\D/g, "");
            const code = await sock.requestPairingCode(num);
            activePairings.set(num, { code, expiry: Date.now() + 90000 });
            io.emit("pairing", { num, code });
            res.json({ code });
        } catch (e) { res.json({ error: e.message }); }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m?.message) return;

        const body = m.message?.conversation || 
                     m.message?.extendedTextMessage?.text || 
                     m.message?.imageMessage?.caption || 
                     m.message?.videoMessage?.caption || "";

        m.chat = m.key.remoteJid;
        m.sender = m.key.participant || m.chat;
        m.isBot = m.key.fromMe;
        m.reply = (text) => sock.sendMessage(m.chat, { text }, { quoted: m });

        observers.forEach(obs => { 
            try { 
                if (!obs.trigger || obs.trigger(m)) obs.onMessage(m, sock, { supabase, cache }); 
            } catch {} 
        });

        if (!body.startsWith(global.prefix)) return;

        try {
            const route = await router(m, { 
                body, 
                commands, 
                aliases, 
                observers, 
                cache, 
                supabase, 
                prefix: global.prefix 
            });
            if (route?.type === "command") {
                await route.command.execute(m, sock, route.context);
            }
        } catch (e) {
            console.error("Router Exec Error:", e.message);
        }
    });

    sock.ev.on("connection.update", async (u) => {
        const { connection, lastDisconnect, qr } = u;

        if (qr) {
            const qrImage = await QRCode.toDataURL(qr);
            io.emit("qr", qrImage);
        }

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startVex();
        }

        if (connection === "open") {
            io.emit("connected");
            console.log("✅ VEX CONNECTED");
            
            saveToCloud(state.creds).catch(() => {});
            
            const statusReport = `🚀 *VEX SYSTEM ONLINE*\n\n` +
                                `📡 *Prefix:* ${global.prefix}\n` +
                                `🛠️ *Commands:* ${commands.size}\n` +
                                `👁️ *Observers:* ${observers.length}\n` +
                                `🎨 *Style:* ${global.activeStyle}`;
            
            setTimeout(() => {
                sock.sendMessage(sock.user.id, { text: statusReport });
            }, 3000);
        }
    });

    sock.ev.on("creds.update", async () => {
        await saveCreds();
        saveToCloud(state.creds).catch(() => {});
    });
}

// WEB UI
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>VEX CORE</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        body { margin:0; height:100vh; display:flex; justify-content:center; align-items:center; background:#050505; color:#00ffe1; font-family:sans-serif; }
        .card { padding:50px; border-radius:30px; background:rgba(255,255,255,0.03); border:1px solid #00ffe1; text-align:center; box-shadow:0 0 30px rgba(0,255,225,0.3); }
        img { margin:25px 0; border-radius:15px; border:5px solid #fff; background:#fff; transition: all 0.3s ease; }
        #st { font-size: 1.2em; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
        .glow { text-shadow: 0 0 10px #00ffe1; }
    </style>
</head>
<body>
    <div class="card">
        <h1 class="glow">VEX CORE</h1>
        <img id="qr" width="280" src="https://via.placeholder.com/280?text=FETCHING+QR..."/>
        <p id="st">INITIALIZING...</p>
    </div>
    <script>
        const socket = io();
        const qrEl = document.getElementById("qr");
        const stEl = document.getElementById("st");

        socket.on("qr", data => {
            qrEl.src = data;
            stEl.innerText = "SCAN QR CODE (AUTO-REFRESHING)";
            stEl.style.color = "#00ffe1";
        });

        socket.on("connected", () => {
            qrEl.style.display = "none";
            stEl.innerText = "✅ SYSTEM ONLINE & ACTIVE";
            stEl.style.color = "#00ff00";
        });

        setInterval(() => {
            if(stEl.innerText === "INITIALIZING...") {
                window.location.reload();
            }
        }, 15000);
    </script>
</body>
</html>
    `);
});

server.listen(PORT, () => {
    console.log(`🚀 VEX SERVER RUNNING ON PORT ${PORT}`);
    startVex();
});

process.on("uncaughtException", (err) => console.error("CRITICAL ERROR:", err));
process.on("unhandledRejection", (err) => console.error("PROMISE REJECTION:", err));
