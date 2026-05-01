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

// CORE SYSTEMS (future-ready)
const router = require("./core/router"); // (next step)
const cache = require("./core/cache");   // (next step)

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

// LOAD COMMANDS
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

// LOAD OBSERVERS
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

// ================= SESSION =================

async function syncSessionToCloud(creds) {
    try {
        const base64 = Buffer.from(JSON.stringify(creds)).toString("base64");
        await supabase.from("vex_session").upsert({ id: "main", data: base64 });
    } catch (e) {
        console.error("Session Save Error:", e.message);
    }
}

async function loadSessionFromCloud() {
    try {
        const { data } = await supabase.from("vex_session").select("data").eq("id", "main").single();
        if (data) {
            const decoded = Buffer.from(data.data, "base64").toString("utf-8");
            if (!fs.existsSync("./session")) fs.mkdirSync("./session");
            fs.writeFileSync("./session/creds.json", decoded);
            console.log("✅ Session restored from cloud");
        }
    } catch {
        console.log("ℹ️ No session found");
    }
}

// ================= MAIN =================

async function startVex() {

    await loadSessionFromCloud();

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

        // BASIC NORMALIZATION
        const type = getContentType(m.message);

        const body =
            type === "conversation" ? m.message.conversation :
            type === "extendedTextMessage" ? m.message.extendedTextMessage.text :
            type === "imageMessage" ? m.message.imageMessage.caption :
            type === "videoMessage" ? m.message.videoMessage.caption :
            "";

        // SAFE MESSAGE OBJECT
        m.chat = remoteJid;
        m.sender = m.key.participant || remoteJid;
        m.isGroup = remoteJid.endsWith("@g.us");

        m.reply = (text) => sock.sendMessage(m.chat, { text }, { quoted: m });

        try {
            // ================= ROUTER =================
            const route = await router(m, {
                body,
                commands,
                aliases,
                observers,
                cache,
                supabase
            });

            // ================= HANDLE RESULT =================
            if (!route) return;

            if (route.type === "observer") {
                for (const obs of route.list) {
                    try {
                        await obs.onMessage(m, sock, route.context);
                    } catch (e) {
                        console.error(`Observer Error:`, e.message);
                    }
                }
            }

            if (route.type === "command") {
                const cmd = route.command;
                if (!cmd) return;

                try {
                    await cmd.execute(m, sock, route.context);
                } catch (e) {
                    console.error(`Command Error:`, e.message);
                }
            }

            if (route.type === "ignore") return;

        } catch (err) {
            console.error("Router Failure:", err.message);
        }
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
                    text: `VEX CORE ACTIVE\nCommands: ${commands.size}\nObservers: ${observers.length}`
                });
            }, 4000);
        }
    });

    sock.ev.on("creds.update", async () => {
        await saveCreds();
        await syncSessionToCloud(state.creds);
    });
}

// ================= WEB =================

app.get("/", (req, res) => {
    res.send("VEX CORE RUNNING");
});

server.listen(PORT, () => startVex());

// ================= ERROR HANDLING =================

process.on("uncaughtException", err => console.error("CRITICAL:", err));
process.on("unhandledRejection", err => console.error("PROMISE:", err));
