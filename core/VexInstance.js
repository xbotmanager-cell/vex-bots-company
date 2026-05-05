// ========================================================
// VEX SYSTEM - MULTI-INSTANCE SAAS ENGINE (VEX~ CORE)
// Author: Lupin Starnley Jimmoh
// Purpose: Isolated pairing, session generation, and billing
// ========================================================

const pino = require("pino");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * INTERNAL PAIRING UI TEMPLATE
 * This is served dynamically via Socket.io, bypassing public/ folder
 */
const pairingTemplate = (userId) => `
<!DOCTYPE html>
<html>
<head>
    <title>VEX Pairing Portal</title>
    <style>
        body { background: #0f0f0f; color: white; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: #1a1a1a; padding: 30px; border-radius: 15px; text-align: center; border: 1px solid #333; }
        #qr-container { background: white; padding: 10px; border-radius: 10px; margin: 20px auto; width: 250px; height: 250px; }
        .status { color: #00ffcc; font-weight: bold; margin-bottom: 10px; }
        img { width: 100%; height: 100%; }
    </style>
</head>
<body>
    <div class="card">
        <div class="status" id="status">WAITING FOR ENGINE...</div>
        <div id="qr-container">
            <div style="color:black; padding-top:100px;">Initializing...</div>
        </div>
        <p>Scan to generate your <b>VEX~ Session ID</b></p>
    </div>
    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        socket.on('connect', () => { socket.emit('join_pairing', '${userId}'); });
        socket.on('vex_qr_update', (data) => {
            document.getElementById('status').innerText = data.message;
            document.getElementById('qr-container').innerHTML = '<img src="' + data.qr + '">';
        });
        socket.on('vex_pairing_complete', (data) => {
            document.getElementById('status').innerText = "SUCCESS! Check WhatsApp for your ID";
            document.getElementById('qr-container').innerHTML = '<div style="color:green; font-size:40px; padding-top:80px;">✅</div>';
        });
    </script>
</body>
</html>
`;

class VexInstance {
    constructor(userData, coreComponents) {
        this.userId = userData.M_user_id;
        this.phoneNumber = userData.M_phone_number;
        this.sock = null;
        this.core = coreComponents; // commands, aliases, observers, router, cache, io
        this.isReady = false;
        this.status = "idle";
    }

    /**
     * SECURE PAIRING LOGIC
     */
    async initPairing() {
        console.log(`[VEX] Starting Secure Pairing for User: ${this.userId}`);
        const { default: makeWASocket, useMultiFileAuthState } = await import("@whiskeysockets/baileys");
        const QRCode = await require("qrcode");

        const { state, saveCreds } = await useMultiFileAuthState(`./temp_sessions/${this.userId}`);

        this.sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: "silent" }),
            browser: ["VEX Pairing", "Chrome", "1.0.0"]
        });

        // Serve the UI template through a private route in index.js or via socket emit
        this.core.io.to(this.userId).emit("render_portal", pairingTemplate(this.userId));

        this.sock.ev.on("connection.update", async (update) => {
            const { connection, qr } = update;

            if (qr) {
                const qrDataURL = await QRCode.toDataURL(qr);
                this.core.io.to(this.userId).emit("vex_qr_update", {
                    qr: qrDataURL,
                    message: "SCAN NOW"
                });
            }

            if (connection === "open") {
                const sessionRaw = fs.readFileSync(`./temp_sessions/${this.userId}/creds.json`, "utf-8");
                const vexSessionId = `VEX~${Buffer.from(sessionRaw).toString("base64")}`;

                await supabase.from("M_sessions").upsert({
                    M_user_id: this.userId,
                    M_session_data: { creds: vexSessionId },
                    M_pairing_status: "disconnected",
                    M_updated_at: new Date()
                });

                await this.sock.sendMessage(this.sock.user.id, {
                    text: `🚀 *VEX SYSTEM: PAIRING SUCCESSFUL*\n\nYour Session ID is:\n\n\`${vexSessionId}\`\n\n*Steps:*\n1. Copy ID\n2. Paste in Dashboard\n3. Click DEPLOY (20 VX)`
                });

                this.core.io.to(this.userId).emit("vex_pairing_complete", { status: "success" });
                await this.sock.logout();
                this.status = "paired";
            }
        });

        this.sock.ev.on("creds.update", saveCreds);
    }

    /**
     * LIVE ENGINE DEPLOYMENT
     */
    async init() {
        console.log(`[VEX] Deploying Live Engine: ${this.userId}`);
        const { default: makeWASocket, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = await import("@whiskeysockets/baileys");

        const { data: session } = await supabase.from("M_sessions").select("M_session_data").eq("M_user_id", this.userId).single();
        if (!session || !session.M_session_data.creds) throw new Error("No Session Found");

        const rawCreds = Buffer.from(session.M_session_data.creds.split("VEX~")[1], "base64").toString("utf-8");
        const creds = JSON.parse(rawCreds);

        const { version } = await fetchLatestBaileysVersion();
        
        this.sock = makeWASocket({
            version,
            logger: pino({ level: "silent" }),
            auth: {
                creds: creds,
                keys: makeCacheableSignalKeyStore({}, pino({ level: "silent" }))
            },
            browser: ["VEX CORE", "Safari", "3.0"]
        });

        this.registerEvents();
    }

    registerEvents() {
        this.sock.ev.on("connection.update", async (update) => {
            const { connection } = update;
            if (connection === "open") {
                this.isReady = true;
                this.status = "active";
                await supabase.from("M_sessions").update({ M_pairing_status: "connected" }).eq("M_user_id", this.userId);
            }
        });

        this.sock.ev.on("messages.upsert", async ({ messages }) => {
            const m = messages[0];
            if (!m.message) return; // ALLOWING fromMe - Listening to self and others

            const settings = await this.core.cache.getUser(this.userId);
            const body = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
            
            try {
                const route = await this.core.router(m, {
                    body,
                    commands: this.core.commands,
                    aliases: this.core.aliases,
                    observers: this.core.observers,
                    cache: this.core.cache,
                    supabase: supabase,
                    prefix: settings.M_prefix || ".",
                    userSettings: settings
                });

                if (route && route.type === "command") {
                    await route.command.execute(m, this.sock, route.context);
                }
            } catch (error) {
                console.error(`[VEX FAIL] Instance ${this.userId}:`, error.message);
            }
        });
    }
}

module.exports = VexInstance;
