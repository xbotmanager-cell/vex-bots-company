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
global.clientId = process.env.CLIENT_ID || "VEX_DEFAULT";

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

// ================= AUTO RELOAD ENGINE =================
let reloadLock = false;

function startAutoReload() {
    if (reloadLock) return;
    reloadLock = true;

    try {
        fs.watch(pluginPath, { persistent: true }, (event, file) => {
            if (file && file.endsWith(".js")) {
                console.log(`♻️ Plugin changed: ${file}`);
                loadCommands();
            }
        });

        fs.watch(observerPath, { persistent: true }, (event, file) => {
            if (file && file.endsWith(".js")) {
                console.log(`👁️ Observer changed: ${file}`);
                loadObservers();
            }
        });

        console.log("🔥 AUTO RELOAD ENABLED");
    } catch (e) {
        console.log("Auto reload error:", e.message);
    }
}

// ================= SERVER SETUP =================
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;

app.use(express.static(path.join(__dirname, 'public')));

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
            id: 'v1_session',
            data: base64,
            client_id: global.clientId
        });
    } catch (e) {}
}

async function loadSessionFromCloud() {
    try {
        const { data } = await supabase
            .from("vex_session")
            .select("data")
            .eq("id", 'v1_session')
            .single();

        if (data) {
            const decoded = Buffer.from(data.data, "base64").toString("utf-8");
            if (!fs.existsSync("./session")) fs.mkdirSync("./session");
            fs.writeFileSync("./session/creds.json", decoded);
            console.log(`☁️ Session Restored from Supabase for ${global.clientId}`);
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
            .eq("client_id", global.clientId)
            .single();

        if (data?.extra_data?.current) {
            global.prefix = data.extra_data.current;
        }

        supabase
            .channel(`prefix-${global.clientId}`)
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "vex_settings",
                filter: `setting_name=eq.prefix&client_id=eq.${global.clientId}`
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

    startAutoReload(); 

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

    // ================= SOCKET.IO BRIDGE =================
    io.on("connection", (socket) => {
        socket.on("send_whatsapp", async (payload) => {
            try {
                const jid = payload.to.includes("@s.whatsapp.net") ? payload.to : `${payload.to}@s.whatsapp.net`;
                await sock.sendMessage(jid, { text: payload.body });
            } catch (err) {
                console.error("Socket Send Error:", err);
            }
        });

        socket.on("send_voice", async (payload) => {
            try {
                const jid = payload.to.includes("@s.whatsapp.net") ? payload.to : `${payload.to}@s.whatsapp.net`;
                const buffer = Buffer.from(payload.data, 'base64');
                await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mp4', ptt: true });
            } catch (err) {
                console.error("Socket Voice Error:", err);
            }
        });

        socket.on("send_media", async (payload) => {
            try {
                const jid = payload.to.includes("@s.whatsapp.net") ? payload.to : `${payload.to}@s.whatsapp.net`;
                const buffer = Buffer.from(payload.data, 'base64');
                await sock.sendMessage(jid, { document: buffer, fileName: payload.filename, mimetype: 'application/octet-stream' });
            } catch (err) {
                console.error("Socket Media Error:", err);
            }
        });
    });

    // ================= MESSAGE HANDLING =================
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m || !m.message) return;

        let body =
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.imageMessage?.caption ||
            m.message?.videoMessage?.caption ||
            "";
        body = body.trim();

        m.chat = m.key.remoteJid;
        m.sender = m.key.participant || m.chat;
        m.reply = (t) => sock.sendMessage(m.chat, { text: t }, { quoted: m });

        // Emit to UI for V-CHAT
        io.emit("new_message", { sender: m.sender, body: body, chat: m.chat });

        for (const obs of observers) {
            try {
                if (!obs.trigger || obs.trigger(m)) {
                    await obs.onMessage(m, sock, {
                        supabase,
                        cache,
                        clientId: global.clientId,
                        userSettings: cache.getUser?.(m.sender) || {}
                    });
                }
            } catch (e) {}
        }

        try {
            const route = await router(m, {
                body,
                commands,
                aliases,
                observers,
                cache,
                supabase,
                prefix: global.prefix,
                clientId: global.clientId
            });

            if (!route) return;

            if (route.type === "command" && route.command) {
                await route.command.execute(m, sock, route.context);
            } 
            else if (route.type === "custom" && typeof route.execute === "function") {
                await route.execute(sock);
            }

        } catch (e) {
            console.error("Router Execution Error:", e.message);
        }
    });

    // ================= CONNECTION =================
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            const qrData = await QRCode.toDataURL(qr);
            io.emit("qr", qrData);
        }

        if (connection === "close") {
            const shouldReconnect =
                (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) startVex();
        }

        if (connection === "open") {
            console.log(`✅ VEX Connected Successfully: ${global.clientId}`);
            io.emit("connected");
            await syncSessionToCloud(state.creds);
        }
    });

    sock.ev.on("creds.update", async () => {
        await saveCreds();
        await syncSessionToCloud(state.creds);
    });
}

// ================= ROUTING =================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/v-chat", (req, res) => {
    res.sendFile(path.join(__dirname, "v_chat.html"));
});

server.listen(PORT, () => {
    console.log(`🚀 VEX Server running on port ${PORT} for client: ${global.clientId}`);
    startVex();
});

// ================= ERROR HANDLING =================
process.on("uncaughtException", (err) => console.error("Caught exception: ", err));
process.on("unhandledRejection", (reason, promise) => console.error("Unhandled Rejection:", reason));
