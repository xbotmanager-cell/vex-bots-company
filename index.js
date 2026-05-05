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

// ================= PAIRING SYSTEM (NEW ADD ONLY) =================
const activePairings = new Map();

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
            })
            .subscribe();

    } catch {}
}

// ================= PHONE VALIDATION (NEW) =================
function cleanNumber(num) {
    if (!num) return null;
    const n = num.replace("+", "").replace(/\s/g, "");
    return /^\d{8,15}$/.test(n) ? n : null;
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

    // ================= PAIRING ENGINE (NEW ADD ONLY) =================
    app.use(express.json());

    app.post("/pair", async (req, res) => {
        try {
            const number = cleanNumber(req.body.number);

            if (!number) {
                return res.json({ error: "Invalid number" });
            }

            const jid = number + "@s.whatsapp.net";

            const code = await sock.requestPairingCode(jid);

            const expiry = Date.now() + 90000;

            activePairings.set(number, { code, expiry });

            io.emit("pairing", { number, code, expiry });

            res.json({ code, expiry });

        } catch (e) {
            res.json({ error: "Pairing failed", details: e.message });
        }
    });

    // expiry cleanup
    setInterval(() => {
        const now = Date.now();
        for (const [num, data] of activePairings.entries()) {
            if (now > data.expiry) {
                activePairings.delete(num);
                io.emit("pairing-expired", { number: num });
            }
        }
    }, 1000);

    // ================= MESSAGE ENGINE =================
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

        m.reply = (t) => sock.sendMessage(m.chat, { text: t }, { quoted: m });

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

            await syncSessionToCloud(state.creds);

            setTimeout(() => {
                sock.sendMessage(sock.user.id, {
                    text: `VEX ACTIVE\nPrefix: ${global.prefix}`
                });
            }, 3000);
        }
    });

    sock.ev.on("creds.update", async () => {
        await saveCreds();
        await syncSessionToCloud(state.creds);
    });
}

// ================= WEB UI (GLASS + QR) =================
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
<img id="qr" width="250"/>
</div>

<script>
const socket = io();
const qr = document.getElementById("qr");

socket.on("qr", d => qr.src = d);
socket.on("connected", () => qr.style.display="none");

socket.on("pairing", d => console.log("PAIR:", d));
socket.on("pairing-expired", d => console.log("EXPIRED:", d));
</script>

</body>
</html>
`);
});

server.listen(PORT, () => startVex());

// ================= SILENT ERRORS =================
process.on("uncaughtException", () => {});
process.on("unhandledRejection", () => {});
