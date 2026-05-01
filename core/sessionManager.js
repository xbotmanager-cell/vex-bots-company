const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const {
    useMultiFileAuthState,
    makeWASocket,
    fetchLatestBaileysVersion,
    DisconnectReason,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

const pino = require("pino");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ================= ACTIVE SESSIONS =================

const activeSessions = new Map();

// ================= MAIN FUNCTION =================

module.exports = {
    // ================= CREATE SESSION HANDLER =================
    async createSession(session) {
        const sessionPath = path.join(__dirname, "../sessions", session.id);

        if (!fs.existsSync(sessionPath)) {
            fs.mkdirSync(sessionPath, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
            },
            logger: pino({ level: "silent" }),
            printQRInTerminal: false,
            browser: ["VEX-SUBBOT", "Chrome", "1.0.0"]
        });

        // ================= CONNECTION HANDLER =================

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // QR GENERATION
            if (qr) {
                console.log(`📡 QR for session ${session.id} generated`);
            }

            // CONNECTION OPENED
            if (connection === "open") {
                console.log(`✅ SubBot ${session.phone} ACTIVE`);

                await supabase
                    .from("bot_sessions")
                    .update({
                        status: "active",
                        session_data: JSON.stringify(state.creds)
                    })
                    .eq("id", session.id);

                activeSessions.set(session.id, sock);
            }

            // DISCONNECT HANDLER
            if (connection === "close") {
                const reason = lastDisconnect?.error?.output?.statusCode;

                if (reason !== DisconnectReason.loggedOut) {
                    console.log(`♻️ Reconnecting session ${session.id}...`);
                    this.createSession(session);
                } else {
                    console.log(`❌ Session ${session.id} logged out`);

                    await supabase
                        .from("bot_sessions")
                        .update({ status: "expired" })
                        .eq("id", session.id);

                    activeSessions.delete(session.id);
                }
            }
        });

        // ================= CREDS SAVE =================

        sock.ev.on("creds.update", saveCreds);

        return sock;
    },

    // ================= LOAD ALL ACTIVE SESSIONS =================

    async loadActiveSessions() {
        const { data } = await supabase
            .from("bot_sessions")
            .select("*")
            .eq("status", "active");

        if (!data) return;

        for (const session of data) {
            console.log(`🔄 Loading session ${session.id}`);
            await this.createSession(session);
        }
    },

    // ================= GET SESSION =================

    getSession(id) {
        return activeSessions.get(id);
    },

    // ================= KILL SESSION =================

    async killSession(id) {
        const sock = activeSessions.get(id);

        if (sock) {
            try {
                sock.logout();
            } catch {}
        }

        activeSessions.delete(id);

        await supabase
            .from("bot_sessions")
            .update({ status: "expired" })
            .eq("id", id);

        console.log(`🛑 Session ${id} terminated`);
    }
};
