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

        } catch {}
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

        } catch {}
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
    } catch {}
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

            console.log("☁️ Session Restored");
        }
    } catch {}
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
                console.log("⚡ Prefix Updated:", global.prefix);
            })
            .subscribe();

    } catch {}
}

// ================= MAIN =================
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
        browser: ["VEX CORE", "Chrome", "5.0"]
    });

    // ================= MESSAGE ENGINE =================
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m || !m.message) return;

        const type = getContentType(m.message);

        let body =
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.imageMessage?.caption ||
            m.message?.videoMessage?.caption ||
            "";

        m.chat = m.key.remoteJid;
        m.sender = m.key.participant || m.chat;
        m.isGroup = m.chat.endsWith("@g.us");

        m.reply = (text) =>
            sock.sendMessage(m.chat, { text }, { quoted: m });

        // ================= OBSERVERS ALWAYS RUN =================
        for (const obs of observers) {
            try {
                if (!obs.trigger || obs.trigger(m)) {
                    obs.onMessage(m, sock, {
                        supabase,
                        cache,
                        userSettings: cache.getUser?.(m.sender) || {}
                    }).catch(() => {});
                }
            } catch {}
        }

        // ================= COMMAND CHECK =================
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

            await route.command.execute(m, sock, route.context).catch(() => {});

        } catch {}
    });

    // ================= CONNECTION =================
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            const qrData = await QRCode.toDataURL(qr);
            io.emit("qr", qrData);
        }

        if (connection === "close") {
            const reconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

            if (reconnect) startVex();
        }

        if (connection === "open") {
            io.emit("connected");

            console.log("🚀 VEX ONLINE");

            await syncSessionToCloud(state.creds);

            setTimeout(() => {
                sock.sendMessage(sock.user.id, {
                    text: `VEX ACTIVE\nPrefix: ${global.prefix}\nCommands: ${commands.size}`
                });
            }, 3000);
        }
    });

    sock.ev.on("creds.update", async () => {
        await saveCreds();
        await syncSessionToCloud(state.creds);
    });
}

// ================= WEB DASHBOARD =================
app.get("/", (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
<title>VEX CORE</title>
<script src="/socket.io/socket.io.js"></script>
<style>
body {
    background: #050505;
    color: #00ffcc;
    font-family: monospace;
    display:flex;
    justify-content:center;
    align-items:center;
    flex-direction:column;
    height:100vh;
}
</style>
</head>
<body>

<h1>VEX SYSTEM</h1>

<img id="qr" width="250"/>

<script>
const socket = io();
const qr = document.getElementById("qr");

socket.on("qr", data => {
    qr.src = data;
});

socket.on("connected", () => {
    qr.style.display = "none";
});
</script>

</body>
</html>`);
});

server.listen(PORT, () => startVex());

// ================= ERROR SILENT =================
process.on("uncaughtException", () => {});
process.on("unhandledRejection", () => {});
