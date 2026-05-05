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
const commands = new Map();
const observers = [];

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;

// ASSET LOADERS
async function loadAssets() {
    const pPath = path.join(__dirname, "plugins");
    const oPath = path.join(__dirname, "observers");
    [pPath, oPath].forEach(p => { if (!fs.existsSync(p)) fs.mkdirSync(p); });

    fs.readdirSync(pPath).filter(f => f.endsWith(".js")).forEach(file => {
        try {
            const plugin = require(path.join(pPath, file));
            commands.set(plugin.command || file.replace(".js", ""), plugin);
        } catch {}
    });

    fs.readdirSync(oPath).filter(f => f.endsWith(".js")).forEach(file => {
        try {
            const obs = require(path.join(oPath, file));
            if (obs.onMessage) observers.push(obs);
        } catch {}
    });
    console.log(`✅ Assets Loaded: ${commands.size} Cmds, ${observers.length} Obs`);
}

// SUPABASE LOGIC
async function syncCloud(creds = null) {
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
        browser: ["Ubuntu", "Chrome", "20.0.04"], // DO NOT CHANGE THIS
        markOnlineOnConnect: true
    });

    // PAIRING API
    app.use(express.json());
    app.post("/request-code", async (req, res) => {
        let num = req.body.number.replace(/\D/g, "");
        if (!num) return res.json({ error: "Invalid Number" });

        try {
            // Delay kidogo ili kuzuia "Rate Limit"
            await delay(2000);
            const code = await sock.requestPairingCode(num);
            res.json({ code });
        } catch (e) {
            res.json({ error: "Failed to get code. Check if number is correct." });
        }
    });

    // MESSAGE LOGIC
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

    // CONNECTION HANDLER
    sock.ev.on("connection.update", async (u) => {
        const { connection, lastDisconnect } = u;

        if (connection === "open") {
            io.emit("status", { state: "connected" });
            await syncCloud(state.creds);
            sock.sendMessage(sock.user.id, { text: "🚀 *VEX LINKED SUCCESSFULLY*" });
        }

        if (connection === "close") {
            const reconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (reconnect) startVex();
        }
    });

    sock.ev.on("creds.update", async () => {
        await saveCreds();
        syncCloud(state.creds).catch(() => {});
    });
}

// HTML INTERFACE
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>VEX PAIRING</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { background:#050505; color:#00ffe1; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0; }
        .box { background:rgba(255,255,255,0.05); padding:30px; border-radius:20px; border:1px solid #00ffe1; text-align:center; width:90%; max-width:400px; }
        input { width:100%; padding:12px; margin:15px 0; border-radius:10px; border:none; background:#111; color:#fff; text-align:center; font-size:1.1em; }
        button { width:100%; padding:12px; border-radius:10px; border:none; background:#00ffe1; color:#000; font-weight:bold; cursor:pointer; }
        #codebox { margin-top:20px; font-size:2em; letter-spacing:5px; color:#fff; font-weight:bold; text-shadow:0 0 10px #00ffe1; }
        .status { margin-top:10px; font-size:0.8em; opacity:0.7; }
    </style>
</head>
<body>
    <div class="box">
        <h2>VEX LINK SYSTEM</h2>
        <p>Enter phone number (with country code)</p>
        <input type="text" id="num" placeholder="e.g. 2557XXXXXXXX">
        <button onclick="requestCode()">GET PAIRING CODE</button>
        <div id="codebox"></div>
        <p class="status" id="st">READY TO LINK</p>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        async function requestCode() {
            const num = document.getElementById("num").value;
            const st = document.getElementById("st");
            const cb = document.getElementById("codebox");
            if(!num) return alert("Enter number!");
            
            st.innerText = "REQUESTING CODE...";
            const res = await fetch("/request-code", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({number: num})
            });
            const data = await res.json();
            if(data.code) {
                cb.innerText = data.code;
                st.innerText = "ENTER THIS CODE IN YOUR WHATSAPP NOTIFICATION";
            } else {
                st.innerText = "ERROR: " + data.error;
            }
        }

        socket.on("status", d => {
            if(d.state === "connected") {
                document.getElementById("codebox").innerText = "CONNECTED";
                document.getElementById("st").innerText = "SYSTEM ONLINE";
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

process.on("uncaughtException", () => {});
process.on("unhandledRejection", () => {});
