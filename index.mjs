import "dotenv/config";
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    delay
} from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";

// UTILS & CORE
import router from "./core/router.js";
import cache from "./core/cache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// GLOBAL CONFIG
global.prefix = ".";
let commands = new Map();
let observers = [];

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;

// ================= ASSET LOADERS (FIXED MEMORY LEAK) =================
async function loadAssets() {
    commands.clear();
    observers = [];

    const pPath = path.join(__dirname, "plugins");
    const oPath = path.join(__dirname, "observers");
    
    if (!fs.existsSync(pPath)) fs.mkdirSync(pPath);
    if (!fs.existsSync(oPath)) fs.mkdirSync(oPath);

    const pFiles = fs.readdirSync(pPath).filter(f => f.endsWith(".js"));
    for (const file of pFiles) {
        try {
            const plugin = require(path.join(pPath, file));
            commands.set(plugin.command || file.replace(".js", ""), plugin);
        } catch (e) {}
    }

    const oFiles = fs.readdirSync(oPath).filter(f => f.endsWith(".js"));
    for (const file of oFiles) {
        try {
            const obs = require(path.join(oPath, file));
            if (obs.onMessage) observers.push(obs);
        } catch (e) {}
    }
    console.log(`✅ Assets Loaded: ${commands.size} Cmds, ${observers.length} Obs`);
}

// ================= SUPABASE LOGIC =================
async function syncCloud(creds = null) {
    try {
        if (creds) {
            const data = Buffer.from(JSON.stringify(creds)).toString("base64");
            await supabase.from("vex_session").upsert({ id: "v1_session", data });
        } else {
            const { data } = await supabase.from("vex_session").select("data").eq("id", "v1_session").maybeSingle();
            if (data) {
                if (!fs.existsSync("./session")) fs.mkdirSync("./session");
                fs.writeFileSync("./session/creds.json", Buffer.from(data.data, "base64").toString("utf-8"));
            }
        }
    } catch (e) { console.error("Cloud Sync Error"); }
}

async function startVex() {
    await syncCloud();
    await loadAssets();

    const { state, saveCreds } = await useMultiFileAuthState("session");
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
        },
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true
    });

    app.use(express.json());
    app.post("/request-code", async (req, res) => {
        let num = req.body.number.replace(/\D/g, "");
        if (!num) return res.json({ error: "Invalid Number" });

        try {
            await delay(3000); 
            const code = await sock.requestPairingCode(num);
            res.json({ code });
        } catch (e) {
            res.json({ error: "Check internet or number" });
        }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m?.message) return;

        m.chat = m.key.remoteJid;
        m.sender = m.key.participant || m.chat;
        m.reply = (text) => sock.sendMessage(m.chat, { text }, { quoted: m });

        const body = m.message?.conversation || m.message?.extendedTextMessage?.text || "";

        observers.forEach(obs => {
            try { if (!obs.trigger || obs.trigger(m)) obs.onMessage(m, sock, { supabase, cache }); } catch {}
        });

        if (body.startsWith(global.prefix)) {
            const route = await router(m, { body, commands, observers, cache, supabase, prefix: global.prefix });
            if (route?.type === "command") await route.command.execute(m, sock, route.context);
        }
    });

    sock.ev.on("connection.update", async (u) => {
        const { connection, lastDisconnect } = u;
        if (connection === "open") {
            io.emit("status", { state: "connected" });
            await syncCloud(state.creds);
            sock.sendMessage(sock.user.id, { text: "🚀 *VEX LINKED SUCCESSFULLY*" });
        }
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startVex();
        }
    });

    sock.ev.on("creds.update", async () => {
        await saveCreds();
        syncCloud(state.creds).catch(() => {});
    });
}

// ================= MOBILE OPTIMIZED UI =================
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>VEX LINK</title>
    <style>
        * { box-sizing: border-box; }
        body { background:#0a0a0a; color:#00ffe1; font-family: 'Segoe UI', Roboto, sans-serif; display:flex; justify-content:center; align-items:center; min-height:100vh; margin:0; padding: 15px; }
        .box { background:rgba(20,20,20,0.9); padding:25px; border-radius:15px; border:1px solid #00ffe1; text-align:center; width:100%; max-width:350px; box-shadow: 0 0 15px rgba(0,255,225,0.2); }
        h2 { font-size: 1.5rem; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; }
        p { font-size: 0.9rem; color: #ccc; margin-bottom: 20px; }
        input { width:100%; padding:14px; margin-bottom: 15px; border-radius:8px; border:1px solid #333; background:#111; color:#fff; text-align:center; font-size:1rem; outline: none; transition: 0.3s; }
        input:focus { border-color: #00ffe1; box-shadow: 0 0 5px #00ffe1; }
        button { width:100%; padding:14px; border-radius:8px; border:none; background:#00ffe1; color:#000; font-weight:bold; cursor:pointer; font-size: 1rem; transition: 0.2s; }
        button:active { transform: scale(0.98); background: #00ccb4; }
        #codebox { margin-top:25px; font-size:1.8rem; letter-spacing:4px; color:#fff; font-weight:bold; min-height: 40px; }
        .status { margin-top:15px; font-size:0.75rem; color: #888; }
    </style>
</head>
<body>
    <div class="box">
        <h2>VEX CORE</h2>
        <p>Link your WhatsApp via pairing code</p>
        <input type="number" id="num" placeholder="2557XXXXXXXX" inputmode="numeric">
        <button onclick="requestCode()">GET CODE</button>
        <div id="codebox"></div>
        <p class="status" id="st">READY</p>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        async function requestCode() {
            const num = document.getElementById("num").value;
            const st = document.getElementById("st");
            const cb = document.getElementById("codebox");
            if(!num) return alert("Enter number!");
            st.innerText = "WAIT...";
            const res = await fetch("/request-code", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({number: num})
            });
            const data = await res.json();
            if(data.code) {
                cb.innerText = data.code;
                st.innerText = "ENTER CODE IN WHATSAPP";
            } else {
                st.innerText = "ERROR: " + data.error;
            }
        }
        socket.on("status", d => {
            if(d.state === "connected") {
                document.getElementById("codebox").innerText = "LINKED";
                document.getElementById("st").innerText = "ONLINE";
            }
        });
    </script>
</body>
</html>
    `);
});

server.listen(PORT, () => {
    console.log(`🚀 VEX RUNNING ON PORT ${PORT}`);
    startVex();
});
