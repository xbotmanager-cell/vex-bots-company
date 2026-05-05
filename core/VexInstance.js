// ========================================================
// VEX SYSTEM - MULTI-INSTANCE SAAS ENGINE (FINAL FIXED)
// ========================================================

const pino = require("pino");
const fs = require("fs");
const QRCode = require("qrcode");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ================= TEMPLATE =================
const pairingTemplate = (userId) => `
<!DOCTYPE html>
<html>
<head>
<title>VEX Pairing</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script src="/socket.io/socket.io.js"></script>
</head>
<body style="background:#000;color:white;text-align:center;padding-top:50px;font-family:sans-serif;">
<h2>Scan QR</h2>
<img id="qr" width="250"/>
<p id="status">Waiting...</p>

<script>
const socket = io();
socket.emit("join", "${userId}");

socket.on("vex_qr", (d) => {
    document.getElementById("qr").src = d.qr;
    document.getElementById("status").innerText = "Scan now";
});

socket.on("vex_done", () => {
    document.getElementById("status").innerText = "Connected ✅";
});
</script>
</body>
</html>
`;

// ================= CLASS =================
class VexInstance {
    constructor(userData, core) {
        this.userId = userData.M_user_id;
        this.core = core;
        this.sock = null;
    }

    // ================= PAIRING =================
    async initPairing() {

        console.log("PAIRING:", this.userId);

        // 🔥 IMPORTANT FIX: dynamic import (ESM fix)
        const {
            default: makeWASocket,
            useMultiFileAuthState,
            fetchLatestBaileysVersion,
            makeCacheableSignalKeyStore
        } = await import("@whiskeysockets/baileys");

        const sessionPath = `./temp_sessions/${this.userId}`;

        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        this.sock = makeWASocket({
            version,
            logger: pino({ level: "silent" }),
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
            },
            printQRInTerminal: false,
            browser: ["VEX Pairing", "Chrome", "1.0"]
        });

        // send UI to frontend
        this.core.io.to(this.userId).emit("render_portal", pairingTemplate(this.userId));

        this.sock.ev.on("connection.update", async (update) => {

            const { connection, qr } = update;

            // 🔥 SEND QR
            if (qr) {
                const qrImg = await QRCode.toDataURL(qr);

                this.core.io.to(this.userId).emit("vex_qr", {
                    qr: qrImg
                });

                console.log("QR SENT:", this.userId);
            }

            // ✅ CONNECTED
            if (connection === "open") {

                const credsRaw = fs.readFileSync(
                    `${sessionPath}/creds.json`,
                    "utf-8"
                );

                const encoded = "VEX~" + Buffer.from(credsRaw).toString("base64");

                await supabase.from("M_sessions").upsert({
                    M_user_id: this.userId,
                    M_session_data: { creds: encoded },
                    M_pairing_status: "connected",
                    M_updated_at: new Date()
                });

                this.core.io.to(this.userId).emit("vex_done");

                console.log("CONNECTED:", this.userId);

                // optional logout to clear pairing session
                await this.sock.logout().catch(() => {});
            }

            if (connection === "close") {
                console.log("DISCONNECTED:", this.userId);
            }
        });

        this.sock.ev.on("creds.update", saveCreds);
    }

    // ================= LIVE BOT =================
    async init() {

        console.log("BOOT:", this.userId);

        const {
            default: makeWASocket,
            fetchLatestBaileysVersion,
            makeCacheableSignalKeyStore
        } = await import("@whiskeysockets/baileys");

        const { data: session } = await supabase
            .from("M_sessions")
            .select("*")
            .eq("M_user_id", this.userId)
            .single();

        if (!session || !session.M_session_data?.creds) {
            throw new Error("NO SESSION");
        }

        const raw = session.M_session_data.creds.replace("VEX~", "");

        const decoded = Buffer.from(raw, "base64").toString("utf-8");
        const creds = JSON.parse(decoded);

        const { version } = await fetchLatestBaileysVersion();

        this.sock = makeWASocket({
            version,
            logger: pino({ level: "silent" }),
            auth: {
                creds,
                keys: makeCacheableSignalKeyStore({}, pino({ level: "silent" }))
            },
            browser: ["VEX CORE", "Safari", "3.0"]
        });

        this.registerEvents();
    }

    // ================= EVENTS =================
    registerEvents() {

        this.sock.ev.on("connection.update", async ({ connection }) => {

            if (connection === "open") {

                console.log("LIVE:", this.userId);

                await supabase
                    .from("M_sessions")
                    .update({ M_pairing_status: "connected" })
                    .eq("M_user_id", this.userId);
            }

            if (connection === "close") {
                console.log("CLOSED:", this.userId);
            }
        });

        this.sock.ev.on("messages.upsert", async ({ messages }) => {

            const m = messages[0];
            if (!m.message) return;

            const body =
                m.message?.conversation ||
                m.message?.extendedTextMessage?.text ||
                "";

            try {
                const route = await this.core.router(m, {
                    body,
                    commands: this.core.commands,
                    aliases: this.core.aliases,
                    observers: this.core.observers,
                    cache: this.core.cache,
                    supabase,
                    prefix: "."
                });

                if (route?.type === "command") {
                    await route.command.execute(m, this.sock, route.context);
                }

            } catch (e) {
                console.log("ERROR:", e.message);
            }
        });
    }
}

module.exports = VexInstance;
