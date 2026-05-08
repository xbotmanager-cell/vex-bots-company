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
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROY_KEY); 

// ================= GLOBAL =================
global.prefix = ".";
global.clientId = process.env.CLIENT_ID || process.env.SERVICE_ID || "VEX_DEFAULT";

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

// ================= AUTO SETUP ENGINE =================
async function autoSetupDatabase() {
    try {
        const { data: meta } = await supabase
            .from("vc_meta")
            .select("setup_done")
            .eq("client_id", global.clientId)
            .single();

        if (meta?.setup_done) {
            console.log(`✅ Database already setup for ${global.clientId}`);
            return;
        }

        console.log(`⚙️ Running first-time setup for ${global.clientId}...`);

        const baseSQL = `
            CREATE TABLE IF NOT EXISTS vex_session (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              client_id text NOT NULL UNIQUE,
              data text NOT NULL,
              updated_at timestamptz DEFAULT now()
            );

            CREATE TABLE IF NOT EXISTS vex_settings (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              client_id text NOT NULL,
              setting_name text NOT NULL,
              extra_data jsonb DEFAULT '{}'::jsonb,
              updated_at timestamptz DEFAULT now(),
              UNIQUE(client_id, setting_name)
            );

            CREATE TABLE IF NOT EXISTS vc_meta (
              id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
              client_id text NOT NULL UNIQUE,
              setup_done boolean DEFAULT false,
              created_tables jsonb DEFAULT '[]'::jsonb,
              owner_email text,
              expires_at timestamptz,
              created_at timestamptz DEFAULT now()
            );
        `;
        await supabase.rpc('exec_sql', { sql: baseSQL });

        await supabase.from("vc_meta").upsert({
            client_id: global.clientId,
            setup_done: true,
            created_tables: ['vex_session', 'vex_settings', 'vc_meta']
        });

        console.log(`✅ Auto-setup complete for ${global.clientId}`);
    } catch (e) {
        console.log("Auto-setup error:", e.message);
    }
}

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
            client_id: global.clientId,
            data: base64
        });
    } catch (e) {}
}

async function loadSessionFromCloud() {
    try {
        const { data } = await supabase
            .from("vex_session")
            .select("data")
            .eq("client_id", global.clientId)
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
    await autoSetupDatabase(); 
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

    io.on("connection", (socket) => {
        socket.on("request_pairing_code", async (phoneNumber) => {
            if (!sock.authState.creds.registered) {
                try {
                    const code = await sock.requestPairingCode(phoneNumber);
                    socket.emit("pairing_code", code);
                } catch (e) {
                    socket.emit("pairing_error", e.message);
                }
            }
        });
    });

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

// ================= UI SERVER =================
app.get("/", (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VEX CORE SYSTEM</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Poppins', sans-serif; }
        body {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #0f0c29;
            background: linear-gradient(to right, #24243e, #302b63, #0f0c29);
            overflow: hidden;
        }
        .card {
            width: 90%;
            max-width: 400px;
            padding: 30px;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 0 40px rgba(138, 43, 226, 0.4);
            text-align: center;
            color: #fff;
        }
        .glow-text {
            text-shadow: 0 0 10px #8a2be2, 0 0 20px #8a2be2;
            font-weight: 600;
            letter-spacing: 2px;
        }
        .tabs { display: flex; margin: 20px 0; border-radius: 12px; overflow: hidden; }
        .tab {
            flex: 1;
            padding: 12px;
            background: rgba(138, 43, 226, 0.2);
            border: none;
            color: #fff;
            cursor: pointer;
            transition: 0.3s;
        }
        .tab.active { background: rgba(138, 43, 226, 0.6); box-shadow: 0 0 15px #8a2be2; }
        .content { display: none; }
        .content.active { display: block; }
        #qr-img {
            width: 100%;
            border-radius: 12px;
            margin: 15px 0;
            box-shadow: 0 0 25px rgba(138, 43, 226, 0.5);
        }
        #phone-input {
            width: 100%;
            padding: 12px;
            margin: 15px 0;
            border-radius: 12px;
            border: 1px solid rgba(138, 43, 226, 0.5);
            background: rgba(0, 0, 0, 0.3);
            color: #fff;
            text-align: center;
        }
        #get-code-btn {
            width: 100%;
            padding: 12px;
            border-radius: 12px;
            border: none;
            background: linear-gradient(45deg, #8a2be2, #4b0082);
            color: #fff;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 0 15px #8a2be2;
        }
        #pairing-code {
            font-size: 24px;
            letter-spacing: 8px;
            margin: 20px 0;
            padding: 15px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 12px;
            text-shadow: 0 0 10px #8a2be2;
        }
        #status {
            margin-top: 20px;
            font-weight: 300;
            transition: 0.3s;
        }
        #status.connected {
            color: #00ff9d;
            text-shadow: 0 0 10px #00ff9d;
        }
    </style>
</head>
<body>
    <div class="card">
        <h2 class="glow-text">VEX CORE SYSTEM</h2>
        <p style="opacity: 0.7; font-size: 14px; margin-bottom: 10px;">Choose Connection Method</p>

        <div class="tabs">
            <button class="tab active" id="tab-qr" onclick="switchTab('qr')">QR CODE</button>
            <button class="tab" id="tab-pairing" onclick="switchTab('pairing')">PAIRING CODE</button>
        </div>

        <div id="qr-content" class="content active">
            <img id="qr-img" style="display:none;"/>
            <p id="qr-status">Initializing QR Code...</p>
        </div>

        <div id="pairing-content" class="content">
            <input type="text" id="phone-input" placeholder="Enter Phone Number e.g. 2557XXXXXXX">
            <button id="get-code-btn" onclick="getPairingCode()">GET PAIRING CODE</button>
            <div id="pairing-code" style="display:none;"></div>
            <p id="pairing-status"></p>
        </div>

        <p id="status">AWAITING CONNECTION...</p>
    </div>

    <script>
        const socket = io();
        const qrImg = document.getElementById("qr-img");
        const qrStatus = document.getElementById("qr-status");
        const status = document.getElementById("status");
        const pairingCodeDiv = document.getElementById("pairing-code");
        const pairingStatus = document.getElementById("pairing-status");

        function switchTab(tabName) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
            
            document.getElementById('tab-' + tabName).classList.add('active');
            document.getElementById(tabName + '-content').classList.add('active');
        }

        function getPairingCode() {
            const phone = document.getElementById("phone-input").value.replace(/[^0-9]/g, '');
            if (phone.length < 10) {
                pairingStatus.innerText = "Please enter a valid phone number";
                return;
            }
            pairingStatus.innerText = "Requesting code...";
            socket.emit("request_pairing_code", phone);
        }

        socket.on("qr", d => {
            qrImg.src = d;
            qrImg.style.display = "block";
            qrStatus.innerText = "SCAN QR CODE WITH WHATSAPP";
        });

        socket.on("pairing_code", code => {
            pairingCodeDiv.innerText = code;
            pairingCodeDiv.style.display = "block";
            pairingStatus.innerText = "Enter this code in WhatsApp";
        });

        socket.on("pairing_error", err => {
            pairingStatus.innerText = "Error: " + err;
        });

        socket.on("connected", () => {
            qrImg.style.display = "none";
            pairingCodeDiv.style.display = "none";
            status.innerText = "CONNECTED";
            status.classList.add("connected");
            qrStatus.innerText = "Device Connected Successfully";
            pairingStatus.innerText = "Device Connected Successfully";
        });
    </script>
</body>
</html>`);
});

server.listen(PORT, () => {
    console.log(`🚀 VEX Server running on port ${PORT} for client: ${global.clientId}`);
    startVex();
});

// ================= ERROR HANDLING =================
process.on("uncaughtException", (err) => console.error("Caught exception: ", err));
process.on("unhandledRejection", (reason, promise) => console.error("Unhandled Rejection:", reason));
