// ========================================================
// VEX SYSTEM - MULTI-INSTANCE SAAS ENGINE
// Author: Lupin Starnley Jimmoh
// Purpose: Handles individual WhatsApp connections for SaaS users
// ========================================================

const {
    default: makeWASocket,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    useMultiFileAuthState
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase for each instance
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

class VexInstance {
    constructor(userData, coreComponents) {
        this.userId = userData.M_user_id;
        this.phoneNumber = userData.M_phone_number;
        this.sock = null;
        this.core = coreComponents; // Contains commands, aliases, observers, router, cache
        this.isReady = false;
    }

    async init() {
        console.log(`[VEX] Initializing Instance for: ${this.userId}`);

        // 1. DYNAMIC SESSION MANAGEMENT (Database-driven)
        // Note: You will need a helper to handle Supabase Auth State
        const { state, saveCreds } = await this.useSupabaseAuth(this.userId);
        const { version } = await fetchLatestBaileysVersion();

        this.sock = makeWASocket({
            version,
            logger: pino({ level: "silent" }),
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
            },
            browser: ["VEX SYSTEM", "Chrome", "1.0.0"]
        });

        // Attach custom ID to the sock for identification in router
        this.sock.user_id = this.userId;

        this.registerEvents(saveCreds);
        return this.sock;
    }

    registerEvents(saveCreds) {
        // --- CREDENTIALS UPDATE ---
        this.sock.ev.on("creds.update", async () => {
            await saveCreds();
        });

        // --- CONNECTION UPDATE ---
        this.sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                // Logic to emit QR to your Dashboard via Socket.io
                console.log(`[VEX] QR Generated for ${this.userId}`);
            }

            if (connection === "open") {
                this.isReady = true;
                console.log(`[VEX] Connection Active: ${this.phoneNumber}`);
            }

            if (connection === "close") {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                if (shouldReconnect) {
                    console.log(`[VEX] Reconnecting ${this.userId}...`);
                    this.init();
                } else {
                    console.log(`[VEX] User Logged Out: ${this.userId}`);
                    // Logic to update user status to 'inactive' in Supabase
                }
            }
        });

        // --- MESSAGE HANDLER (The Bridge to Router) ---
        this.sock.ev.on("messages.upsert", async ({ messages }) => {
            const m = messages[0];
            if (!m.message || m.key.fromMe) return;

            // Fetch Instance-Specific Settings from Cache
            const settings = await this.core.cache.getUser(this.userId);
            const prefix = settings.M_prefix || ".";

            // Process through your existing Router
            const body = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
            
            try {
                const route = await this.core.router(m, {
                    body,
                    commands: this.core.commands,
                    aliases: this.core.aliases,
                    observers: this.core.observers,
                    cache: this.core.cache,
                    supabase: supabase,
                    prefix: prefix,
                    userSettings: settings // Injecting specific SaaS settings
                });

                if (route && route.type === "command") {
                    await route.command.execute(m, this.sock, route.context);
                }
            } catch (error) {
                console.error(`[VEX ERROR] Instance ${this.userId}:`, error.message);
            }
        });
    }

    // This is a placeholder for the custom Supabase Auth logic
    async useSupabaseAuth(userId) {
        // This function will fetch/upsert session data to 'M_sessions' table
        // It's a bit long, I will give you the detailed helper code in the next step
        return await useMultiFileAuthState(`./sessions/${userId}`); 
    }
}

module.exports = VexInstance;
