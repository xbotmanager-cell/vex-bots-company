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

// ================= AI CORE (NEW) =================
const aiManager = require("./chatbot/core/aiManager");
const aiConfig = require("./chatbot/core/config");
const aiMemory = require("./chatbot/core/memory");
const aiQueue = require("./chatbot/core/queue");

// ================= PATHS =================
const pluginPath = path.join(__dirname, "plugins");
const observerPath = path.join(__dirname, "observers");

// ================= AI PATHS =================
const chatbotPath = path.join(__dirname, "chatbot");
const chatbotCorePath = path.join(chatbotPath, "core");
const chatbotProviderPath = path.join(chatbotPath, "providers");
const chatbotSystemPath = path.join(chatbotPath, "system");
const chatbotMemoryPath = path.join(chatbotPath, "memory");
const chatbotUtilsPath = path.join(chatbotPath, "utils");
const chatbotEventsPath = path.join(chatbotPath, "events");

// ================= STORAGE =================
const commands = new Map();
const aliases = new Map();
const observers = [];
const chatbotEvents = [];

// ================= AUTO RELOAD ENGINE =================
let reloadLock = false;

function ensureFolders() {
    const folders = [
        pluginPath,
        observerPath,
        chatbotPath,
        chatbotCorePath,
        chatbotProviderPath,
        chatbotSystemPath,
        chatbotMemoryPath,
        chatbotUtilsPath,
        chatbotEventsPath,
        "./session"
    ];

    for (const dir of folders) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}

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

        fs.watch(chatbotProviderPath, { persistent: true }, (event, file) => {
            if (file && file.endsWith(".js")) {
                console.log(`🤖 AI Provider changed: ${file}`);
                loadChatbotEvents();
            }
        });

        fs.watch(chatbotEventsPath, { persistent: true }, (event, file) => {
            if (file && file.endsWith(".js")) {
                console.log(`🧠 Chatbot Event changed: ${file}`);
                loadChatbotEvents();
            }
        });

        console.log("🔥 AUTO RELOAD ENABLED");

    } catch (e) {
        console.log("Auto reload error:", e.message);
    }
}

// ================= SERVER =================
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;

// ================= LOAD COMMANDS =================
function loadCommands() {

    commands.clear();
    aliases.clear();

    ensureFolders();

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

    ensureFolders();

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

// ================= LOAD CHATBOT EVENTS =================
function loadChatbotEvents() {

    chatbotEvents.length = 0;

    ensureFolders();

    const files = fs.readdirSync(chatbotEventsPath).filter(f => f.endsWith(".js"));

    for (const file of files) {

        try {

            const filePath = path.join(chatbotEventsPath, file);

            delete require.cache[require.resolve(filePath)];

            const event = require(filePath);

            if (event.onMessage) {
                chatbotEvents.push(event);
            }

        } catch (e) {
            console.error(`Chatbot event load error ${file}:`, e.message);
        }
    }

    console.log(`🤖 Chatbot Events Loaded: ${chatbotEvents.length}`);
}

// ================= SESSION CLOUD =================
async function syncSessionToCloud(creds) {

    try {

        const base64 = Buffer.from(JSON.stringify(creds)).toString("base64");

        await supabase
            .from("vex_session")
            .upsert({
                id: `session_${global.clientId}`,
                data: base64,
                client_id: global.clientId
            });

    } catch (e) {
        console.log("Session Sync Error:", e.message);
    }
}

async function loadSessionFromCloud() {

    try {

        const { data } = await supabase
            .from("vex_session")
            .select("data")
            .eq("id", `session_${global.clientId}`)
            .single();

        if (data) {

            const decoded = Buffer
                .from(data.data, "base64")
                .toString("utf-8");

            ensureFolders();

            fs.writeFileSync("./session/creds.json", decoded);

            console.log(`☁️ Session Restored from Supabase for ${global.clientId}`);
        }

    } catch (e) {
        console.log("Session Restore Error:", e.message);
    }
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

    } catch (e) {
        console.log("Prefix Sync Error:", e.message);
    }
}

// ================= AI CONFIG SYNC =================
async function syncAISettings() {

    try {

        const { data } = await supabase
            .from("vex_ai_config")
            .select("*")
            .eq("client_id", global.clientId);

        if (data) {
            aiConfig.load(data);
        }

        supabase
            .channel(`ai-config-${global.clientId}`)
            .on("postgres_changes", {
                event: "*",
                schema: "public",
                table: "vex_ai_config",
                filter: `client_id=eq.${global.clientId}`
            }, async () => {

                try {

                    const { data: fresh } = await supabase
                        .from("vex_ai_config")
                        .select("*")
                        .eq("client_id", global.clientId);

                    aiConfig.load(fresh);

                    console.log("🤖 AI Config Updated");

                } catch (e) {}

            })
            .subscribe();

    } catch (e) {
        console.log("AI Config Sync Error:", e.message);
    }
}

// ================= MAIN START =================
async function startVex() {

    ensureFolders();

    await loadSessionFromCloud();
    await syncSettings();
    await syncAISettings();

    loadCommands();
    loadObservers();
    loadChatbotEvents();

    startAutoReload();

    const { state, saveCreds } = await useMultiFileAuthState("session");

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,

        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(
                state.keys,
                pino({ level: "silent" })
            )
        },

        browser: ["VEX CORE", "Chrome", "20.0.0"]
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

        m.chat = m.key.remoteJid;
        m.sender = m.key.participant || m.chat;

        m.reply = (t) =>
            sock.sendMessage(
                m.chat,
                { text: t },
                { quoted: m }
            );

        // ================= OBSERVERS =================
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

            } catch (e) {
                console.log("Observer Error:", e.message);
            }
        }

        // ================= CHATBOT EVENTS =================
        for (const event of chatbotEvents) {

            try {

                if (!event.trigger || event.trigger(m)) {

                    await event.onMessage(m, sock, {
                        supabase,
                        cache,
                        aiManager,
                        aiMemory,
                        aiQueue,
                        clientId: global.clientId
                    });
                }

            } catch (e) {
                console.log("Chatbot Event Error:", e.message);
            }
        }

        // ================= AI AUTO CHAT =================
        try {

            const chatbotEnabled = await aiConfig.isEnabled(
                supabase,
                global.clientId
            );

            if (chatbotEnabled) {

                const aiReply = await aiManager.handleMessage({
                    m,
                    body,
                    sock,
                    supabase,
                    clientId: global.clientId
                });

                if (aiReply && typeof aiReply === "string") {

                    await sock.sendMessage(
                        m.chat,
                        { text: aiReply },
                        { quoted: m }
                    );
                }
            }

        } catch (e) {
            console.log("AI Auto Chat Error:", e.message);
        }

        // ================= COMMAND SYSTEM =================
        if (!body.startsWith(global.prefix)) return;

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

            if (!route || route.type !== "command") return;

            await route.command.execute(
                m,
                sock,
                route.context
            );

        } catch (e) {
            console.error("Router Error:", e.message);
        }
    });

    // ================= CONNECTION =================
    sock.ev.on("connection.update", async (update) => {

        const {
            connection,
            lastDisconnect,
            qr
        } = update;

        if (qr) {

            try {

                const qrData = await QRCode.toDataURL(qr);

                io.emit("qr", qrData);

            } catch (e) {}
        }

        if (connection === "close") {

            const shouldReconnect =
                (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {

                console.log("♻️ Reconnecting...");

                startVex();
            }
        }

        if (connection === "open") {

            console.log(`✅ VEX Connected Successfully: ${global.clientId}`);

            io.emit("connected");

            await syncSessionToCloud(state.creds);
        }
    });

    // ================= CREDS UPDATE =================
    sock.ev.on("creds.update", async () => {

        try {

            await saveCreds();

            await syncSessionToCloud(state.creds);

        } catch (e) {
            console.log("Cred Save Error:", e.message);
        }
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

body {
margin:0;
height:100vh;
display:flex;
justify-content:center;
align-items:center;
background:#000;
color:#00ffe1;
font-family:monospace;
}

.card {
padding:20px;
border-radius:20px;
backdrop-filter:blur(15px);
background:rgba(255,255,255,0.05);
box-shadow:0 0 20px #00ffe1;
text-align:center;
}

img {
margin-top:10px;
border-radius:10px;
}

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

// ================= START SERVER =================
server.listen(PORT, () => {

    console.log(
        `🚀 VEX Server running on port ${PORT} for client: ${global.clientId}`
    );

    startVex();
});

// ================= ERROR HANDLING =================
process.on("uncaughtException", (err) => {

    console.error("Caught exception: ", err);

});

process.on("unhandledRejection", (reason, promise) => {

    console.error("Unhandled Rejection:", reason);

});
