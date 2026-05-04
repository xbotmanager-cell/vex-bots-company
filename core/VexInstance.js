// ========================================================
// VEX SYSTEM - MULTI-INSTANCE SAAS ENGINE
// Author: Lupin Starnley Jimmoh
// Purpose: Handles individual WhatsApp connections for SaaS users
// ========================================================

const pino = require("pino");
const { createClient } = require("@supabase/supabase-js");

// IMPORT CLOUD AUTH PROVIDER
const supabaseAuth = require("./supabaseAuth");

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

    /**
     * AUTHENTICATION GATEWAY
     * Uses Cloud Database (Supabase) instead of local file system
     */
    async useSupabaseAuth(userId) {
        return await supabaseAuth(supabase, userId); 
    }

    async init() {
        console.log(`[VEX] Initializing Instance for: ${this.userId}`);

        // --- FIX: DYNAMIC IMPORT KWA AJILI YA NODE V22 & BAILEYS ESM ---
        const { 
            default: makeWASocket, 
            DisconnectReason, 
            fetchLatestBaileysVersion, 
            makeCacheableSignalKeyStore 
        } = await import("@whiskeysockets/baileys");

        // 1. CLOUD SESSION MANAGEMENT
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

        // Tunapitisha DisconnectReason kwenye registerEvents
        this.registerEvents(saveCreds, DisconnectReason);
        return this.sock;
    }

    registerEvents(saveCreds, DisconnectReason) {
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
                
                // Optional: Notify the user in their own DM
                await this.sock.sendMessage(this.sock.user.id, { 
                    text: `*VEX SYSTEM CONNECTED*\n\nYour instance is now active and monitoring messages.` 
                });
            }

            if (connection === "close") {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                
                if (shouldReconnect) {
                    console.log(`[VEX] Reconnecting ${this.userId}...`);
                    this.init();
                } else {
                    console.log(`[VEX] User Logged Out: ${this.userId}`);
                    // Database logic to mark instance as inactive would go here
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

            // Process through your existing Router logic
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
                    userSettings: settings // Injecting specific SaaS settings for the subscriber
                });

                if (route && route.type === "command") {
                    await route.command.execute(m, this.sock, route.context);
                }
            } catch (error) {
                console.error(`[VEX ERROR] Instance ${this.userId}:`, error.message);
            }
        });
    }
}

module.exports = VexInstance;
