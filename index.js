require("dotenv").config();

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    getContentType
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const fs = require("fs");
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require("qrcode");

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ================= GLOBAL =================
global.prefix = ".";

// ================= CORE =================
const router = require("./core/router");
const cache = require("./core/cache");

// ================= PATHS =================
const pluginPath = path.join(__dirname, "plugins");
const observerPath = path.join(__dirname, "observers");

// ================= STORAGE =================
const commands = new Map();
const aliases = new Map();
const observers = [];

// ================= SERVER =================
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;

// ================= LOAD COMMANDS =================
function loadCommands() {
    commands.clear();
    aliases.clear();

    if (!fs.existsSync(pluginPath)) fs.mkdirSync(pluginPath);

    const files = fs.readdirSync(pluginPath).filter(f => f.endsWith(".js"));

    for (const file of files) {
        try {
            const filePath = path.join(pluginPath, file);
            delete require.cache[require.resolve(filePath)];

            const plugin = require(filePath);
            const name = plugin.command || file.replace(".js", "");

            commands.set(name, plugin);

            if (Array.isArray(plugin.alias)) {
                for (const a of plugin.alias) {
                    aliases.set(a, name);
                }
            }
        } catch (e) {
            console.error(`Error loading command ${file}:`, e.message);
        }
    }
    console.log(`✅ Commands Loaded: ${commands.size}`);
}

// ================= LOAD OBSERVERS =================
function loadObservers() {
    observers.length = 0;

    if (!fs.existsSync(observerPath)) fs.mkdirSync(observerPath);

    const files = fs.readdirSync(observerPath).filter(f => f.endsWith(".js"));

    for (const file of files) {
        try {
            const filePath = path.join(observerPath, file);
            delete require.cache[require.resolve(filePath)];

            const obs = require(filePath);
            if (obs.onMessage) observers.push(obs);

        } catch (e) {
            console.error(`Error loading observer ${file}:`, e.message);
        }
    }
    console.log(`👁️ Observers Loaded: ${observers.length}`);
}

// ================= SESSION CLOUD =================
async function syncSessionToCloud(creds) {
    try {
        const base64 = Buffer.from(JSON.stringify(creds)).toString("base64");
        await supabase.from("vex_session").upsert({
            id: "v1_session",
            data: base64
        });
    } catch (e) {}
}

async function loadSessionFromCloud() {
    try {
        const { data } = await supabase
            .from("vex_session")
            .select("data")
            .eq("id", "v1_session")
            .single();

        if (data) {
            const decoded = Buffer.from(data.data, "base64").toString("utf-8");
            if (!fs.existsSync("./session")) fs.mkdirSync("./session");
            fs.writeFileSync("./session/creds.json", decoded);
            console.log("☁️ Session Restored from Supabase");
        }
    } catch (e) {}
}

// ================= PREFIX SYNC =================
async function syncSettings() {
    try {
        const { data } = await supabase
            .from("vex_settings")
            .select("extra_data")
            .eq("setting_name", "prefix")
            .single();

        if (data?.extra_data?.current) {
            global.prefix = data.extra_data.current;
        }

        supabase
            .channel("prefix-live")
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "vex_settings",
                filter: "setting_name=eq.prefix"
            }, payload => {
                global.prefix = payload.new.extra_data.current;
            })
            .subscribe();
    } catch (e) {}
}

// ================= MAIN START =================
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
        browser: ["VEX CORE", "Chrome", "20.0.0"]
    });

    // ================= MESSAGE HANDLING =================
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m || !m.message) return;

        // "fromMe" imetolewa ili bot iweze kujijibu yenyewe
        let body =
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.imageMessage?.caption ||
            m.message?.videoMessage?.caption ||
            "";

        m.chat = m.key.remoteJid;
        m.sender = m.key.participant || m.chat;
        m.reply = (t) => sock.sendMessage(m.chat, { text: t }, { quoted: m });

        // Observers
        for (const obs of observers) {
            try {
                if (!obs.trigger || obs.trigger(m)) {
                    await obs.onMessage(m, sock, {
                        supabase,
                        cache,
                        userSettings: cache.getUser?.(m.sender) || {}
                    });
                }
            } catch (e) {}
        }

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

            if (!route || route.type !== "command") return;
            await route.command.execute(m, sock, route.context);

        } catch (e) {
            console.error("Router Error:", e.message);
        }
    });

    // ================= CONNECTION MONITORING =================
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            const qrData = await QRCode.toDataURL(qr);
            io.emit("qr", qrData);
        }

        if (connection === "close") {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startVex();
        }

        if (connection === "open") {
            console.log("✅ VEX Connected Successfully");
            io.emit("connected");
            await syncSessionToCloud(state.creds);

            setTimeout(async () => {
                if (sock.user) {
                    await sock.sendMessage(sock.user.id, {
                        text: `VEX ACTIVE\nPrefix: ${global.prefix}\nUser: ${sock.user.name || 'Lupin'}`
                    });
                }
            }, 3000);
        }
    });

    sock.ev.on("creds.update", async () => {
        await saveCreds();
        await syncSessionToCloud(state.creds);
    });
}

// ================= UI SERVER =================
app.get("/", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>VEX CORE</title>
<script src="/socket.io/socket.io.js"></script>
<style>
body { margin:0; height:100vh; display:flex; justify-content:center; align-items:center; background:#000; color:#00ffe1; font-family:monospace; }
.card { padding:20px; border-radius:20px; backdrop-filter:blur(15px); background:rgba(255,255,255,0.05); box-shadow:0 0 20px #00ffe1; text-align:center; }
img { margin-top:10px; border-radius:10px; }
</style>
</head>
<body>
<div class="card">
<h2>VEX SYSTEM</h2>
<img id="qr" width="250" style="display:none;"/>
<p id="status">INITIALIZING...</p>
</div>
<script>
const socket = io();
const qr = document.getElementById("qr");
const status = document.getElementById("status");

socket.on("qr", d => {
    qr.src = d;
    qr.style.display = "block";
    status.innerText = "SCAN QR CODE";
});
socket.on("connected", () => {
    qr.style.display = "none";
    status.innerText = "CONNECTED";
    status.style.color = "#00ff00";
});
</script>
</body>
</html>
`);
});

server.listen(PORT, () => {
    console.log(`🚀 VEX Server running on port ${PORT}`);
    startVex();
});

// ================= ERROR HANDLING =================
process.on("uncaughtException", (err) => { console.error("Caught exception: ", err); });
process.on("unhandledRejection", (reason, promise) => { console.error("Unhandled Rejection at:", promise, "reason:", reason); });
