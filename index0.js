require("dotenv").config();

const {
    default: makeWASocket,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
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

// ================= STORAGE =================
const commands = new Map();
const aliases = new Map();
const observers = [];

// ================= MULTI SESSION =================
const sessions = new Map(); // user_id -> sock

// ================= SERVER =================
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;

app.use(express.json());

// ================= LOAD COMMANDS =================
function loadCommands() {
    const pluginPath = path.join(__dirname, "plugins");

    if (!fs.existsSync(pluginPath)) fs.mkdirSync(pluginPath);

    const files = fs.readdirSync(pluginPath).filter(f => f.endsWith(".js"));

    for (const file of files) {
        try {
            const plugin = require(path.join(pluginPath, file));
            const name = plugin.command || file.replace(".js", "");

            commands.set(name, plugin);

            if (Array.isArray(plugin.alias)) {
                for (const a of plugin.alias) aliases.set(a, name);
            }
        } catch {}
    }
}

// ================= LOAD OBSERVERS =================
function loadObservers() {
    const observerPath = path.join(__dirname, "observers");

    if (!fs.existsSync(observerPath)) fs.mkdirSync(observerPath);

    const files = fs.readdirSync(observerPath).filter(f => f.endsWith(".js"));

    for (const file of files) {
        try {
            const obs = require(path.join(observerPath, file));
            if (obs.onMessage) observers.push(obs);
        } catch {}
    }
}

// ================= CREATE SESSION =================
async function createSession(userId) {

    const sessionPath = `./sessions/${userId}`;
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

    const { state, saveCreds } = await require("@whiskeysockets/baileys").useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
        }
    });

    sessions.set(userId, sock);

    // ================= EVENTS =================
    sock.ev.on("connection.update", async (update) => {
        const { connection, qr } = update;

        if (qr) {
            const qrData = await QRCode.toDataURL(qr);

            io.emit("qr", {
                userId,
                qr: qrData
            });

            await supabase.from("M_sessions").upsert({
                M_user_id: userId,
                M_pairing_status: "pairing"
            });
        }

        if (connection === "open") {
            io.emit("connected", { userId });

            await supabase.from("M_sessions").upsert({
                M_user_id: userId,
                M_pairing_status: "connected"
            });
        }

        if (connection === "close") {
            sessions.delete(userId);

            await supabase.from("M_sessions").upsert({
                M_user_id: userId,
                M_pairing_status: "disconnected"
            });
        }
    });

    sock.ev.on("creds.update", saveCreds);

    // ================= MESSAGE =================
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m || !m.message) return;

        let body =
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            "";

        m.chat = m.key.remoteJid;
        m.sender = m.key.participant || m.chat;

        m.reply = (t) => sock.sendMessage(m.chat, { text: t }, { quoted: m });

        // observers
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
                await route.command.execute(m, sock, route.context).catch(() => {});
            }

        } catch {}
    });

    return sock;
}

// ================= API =================

// 🔥 USER START BOT
app.post("/start", async (req, res) => {
    const { userId } = req.body;

    if (!userId) return res.json({ error: "Missing userId" });

    if (sessions.has(userId)) {
        return res.json({ status: "already_running" });
    }

    await createSession(userId);

    res.json({ status: "starting" });
});

// 🔥 STOP BOT
app.post("/stop", async (req, res) => {
    const { userId } = req.body;

    const sock = sessions.get(userId);
    if (sock) {
        try {
            sock.ws.close();
        } catch {}
        sessions.delete(userId);
    }

    res.json({ status: "stopped" });
});

// ================= WEB =================
app.get("/", (req, res) => {
    res.send("VEX MULTI BOT RUNNING");
});

server.listen(PORT, () => {
    loadCommands();
    loadObservers();
    console.log("🚀 VEX MULTI STARTED");
});

// ================= ERRORS =================
process.on("uncaughtException", () => {});
process.on("unhandledRejection", () => {});
