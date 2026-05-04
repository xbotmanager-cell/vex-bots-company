// ========================================================
// VEX SYSTEM - MULTI-INSTANCE SMART CACHE
// Author: Lupin Starnley Jimmoh
// Purpose: Manages global and per-instance settings with Real-time sync
// ========================================================

const EventEmitter = require("events");

class VexCache extends EventEmitter {
    constructor() {
        super();
        this.vexSettings = new Map();   // Global system settings
        this.instanceSettings = new Map(); // Per-user bot settings (Prefix, Bio, etc.)
        this.cooldowns = new Map();
        this.ready = false;
    }

    // ================= INITIALIZATION =================

    async init(supabase) {
        try {
            console.log("[CACHE] Fetching System & Instance Configurations...");

            // 1. LOAD GLOBAL SETTINGS (vex_settings table)
            const { data: globalSettings } = await supabase.from("vex_settings").select("*");
            if (globalSettings) {
                globalSettings.forEach(s => {
                    const value = (s.setting_name === "style") ? s.extra_data : s.value;
                    this.vexSettings.set(s.setting_name, { value, extra: s.extra_data });
                });
            }

            // 2. LOAD ALL ACTIVE USER SETTINGS (M_users table)
            const { data: users } = await supabase.from("M_users").select("*");
            if (users) {
                users.forEach(u => {
                    this.instanceSettings.set(u.M_user_id, {
                        prefix: u.M_prefix || ".",
                        status: u.M_status || "inactive",
                        balance: u.M_balance || 0,
                        expire: u.M_expire_date,
                        role: u.M_role || "user"
                    });
                });
            }

            this.setupRealtimeSync(supabase);
            this.ready = true;
            console.log("⚡ CACHE ENGINE: FULLY OPERATIONAL");

        } catch (e) {
            console.error("CRITICAL CACHE ERROR:", e.message);
        }
    }

    // ================= REALTIME SYNC (The SaaS Magic) =================

    setupRealtimeSync(supabase) {
        // Sync Global Settings
        supabase.channel("global_sync")
            .on("postgres_changes", { event: "*", schema: "public", table: "vex_settings" }, payload => {
                const updated = payload.new;
                this.vexSettings.set(updated.setting_name, { value: updated.value, extra: updated.extra_data });
                this.emit("global:update", updated.setting_name);
            }).subscribe();

        // Sync Instance/User Settings (If user changes prefix in DB, bot updates instantly)
        supabase.channel("instance_sync")
            .on("postgres_changes", { event: "*", schema: "public", table: "M_users" }, payload => {
                const u = payload.new;
                this.instanceSettings.set(u.M_user_id, {
                    prefix: u.M_prefix || ".",
                    status: u.M_status || "inactive",
                    balance: u.M_balance || 0,
                    expire: u.M_expire_date,
                    role: u.M_role || "user"
                });
                this.emit("instance:update", u.M_user_id);
            }).subscribe();
    }

    // ================= GETTERS (Optimized for Speed) =================

    // Get a global bot setting
    getGlobal(name) {
        return this.vexSettings.get(name)?.value;
    }

    // Get specific settings for a SaaS Instance (The heart of the router)
    getUser(userId) {
        const defaultSettings = {
            prefix: ".",
            status: "inactive",
            balance: 0,
            role: "user"
        };
        return this.instanceSettings.get(userId) || defaultSettings;
    }

    // ================= COOLDOWN LOGIC =================

    setCooldown(key, timeMs) {
        this.cooldowns.set(key, Date.now() + timeMs);
    }

    isCooldown(key) {
        const expire = this.cooldowns.get(key);
        if (!expire) return false;
        if (Date.now() > expire) {
            this.cooldowns.delete(key);
            return false;
        }
        return true;
    }
}

module.exports = new VexCache();
