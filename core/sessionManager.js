const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const fs = require("fs");
const path = require("path");
const pino = require("pino");

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ================= SESSION MANAGER =================

class SessionManager {
    constructor(cache) {
        this.cache = cache;
        this.sessions = new Map(); // active runtime sessions
    }

    // ================= CREATE BOT INSTANCE =================

    async spawnSession(sessionRecord) {
        const sessionId = sessionRecord.id;

        const sessionPath = path.join(__dirname, `../sessions/${sessionId}`);

        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: "fatal" }),
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
            },
            browser: ["VEX-SUBBOT", "Chrome", "1.0.0"]
        });

        // ================= CONNECTION HANDLER =================

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log(`📡 QR for session ${sessionId} generated`);
                // later: send QR to owner if needed
            }

            if (connection === "open") {
                console.log(`✅ SUBBOT ACTIVE: ${sessionId}`);

                await supabase
                    .from("bot_sessions")
                    .update({
                        status: "active"
                    })
                    .eq("id", sessionId);
            }

            if (connection === "close") {
                const shouldReconnect =
                    lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

                if (shouldReconnect) {
                    console.log(`♻️ Reconnecting session ${sessionId}`);
                    this.spawnSession(sessionRecord);
                } else {
                    console.log(`❌ Session logged out: ${sessionId}`);

                    await this.terminateSession(sessionId);
                }
            }
        });

        // ================= SAVE CREDS =================

        sock.ev.on("creds.update", async () => {
            await saveCreds();
        });

        // ================= STORE IN MEMORY =================

        this.sessions.set(sessionId, sock);

        return sock;
    }

    // ================= LOAD ACTIVE SESSIONS =================

    async loadActiveSessions() {
        const { data } = await supabase
            .from("bot_sessions")
            .select("*")
            .eq("status", "active");

        if (!data) return;

        for (const session of data) {
            await this.spawnSession(session);
        }
    }

    // ================= TERMINATE SESSION =================

    async terminateSession(sessionId) {
        try {
            this.sessions.delete(sessionId);

            const sessionPath = path.join(__dirname, `../sessions/${sessionId}`);

            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
            }

            await
