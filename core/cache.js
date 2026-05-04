// ========================================================
// VEX SYSTEM - MULTI-INSTANCE SMART CACHE (SQL ALIGNED)
// Author: Lupin Starnley Jimmoh
// Purpose: Manages global and per-instance settings with Real-time sync
// ========================================================

const EventEmitter = require("events");

class VexCache extends EventEmitter {
    constructor() {
        super();
        this.vexSettings = new Map();   // Global system settings
        this.instanceSettings = new Map(); // Per-user bot settings (Mapped by M_user_id)
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

            // 2. LOAD ALL ACTIVE USER DATA (Aligned with M_users and M_settings)
            const { data: users, error: userError } = await supabase
                .from("M_users")
                .select(`
                    *,
                    M_settings (*)
                `);

            if (userError) throw userError;

            if (users) {
                users.forEach(u => {
                    const userSettings = u.M_settings?.[0] || {};
                    this.instanceSettings.set(u.M_user_id, {
                        prefix: userSettings.M_prefix || ".",
                        status: u.M_account_status || "inactive",
                        balance: u.M_vx_balance || 0,
                        expire: u.M_subscription_expiry,
                        tier: u.M_membership_tier || "free",
                        antidelete: userSettings.M_antidelete || false,
                        style: userSettings.M_bot_style || "default"
                    });
                });
            }

            this.setupRealtimeSync(supabase);
            this.ready = true;
            console.log("⚡ CACHE ENGINE: FULLY OPERATIONAL (SQL SYNCED)");

        } catch (e) {
            console.error("CRITICAL CACHE ERROR:", e.message);
        }
    }

    // ================= REALTIME SYNC (Automated Database Tracking) =================

    setupRealtimeSync(supabase) {
        // Sync Global Settings
        supabase.channel("global_sync")
            .on("postgres_changes", { event: "*", schema: "public", table: "vex_settings" }, payload => {
                const updated = payload.new;
                this.vexSettings.set(updated.setting_name, { value: updated.value, extra: updated.extra_data });
                this.emit("global:update", updated.setting_name);
            }).subscribe();

        // Sync User Account Changes (M_users)
        supabase.channel("user_sync")
            .on("postgres_changes", { event: "*", schema: "public", table: "M_users" }, payload => {
                const u = payload.new;
                const existing = this.instanceSettings.get(u.M_user_id) || {};
                this.instanceSettings.set(u.M_user_id, {
                    ...existing,
                    status: u.M_account_status,
                    balance: u.M_vx_balance,
                    expire: u.M_subscription_expiry,
                    tier: u.M_membership_tier
                });
                this.emit("instance:update", u.M_user_id);
            }).subscribe();

        // Sync User Feature Changes (M_settings)
        supabase.channel("feature_sync")
            .on("postgres_changes", { event: "*", schema: "public", table: "M_settings" }, payload => {
                const s = payload.new;
                const existing = this.instanceSettings.get(s.M_user_id) || {};
                this.instanceSettings.set(s.M_user_id, {
                    ...existing,
                    prefix: s.M_prefix,
                    antidelete: s.M_antidelete,
                    style: s.M_bot_style
                });
                this.emit("feature:update", s.M_user_id);
            }).subscribe();
    }

    // ================= GETTERS =================

    getGlobal(name) {
        return this.vexSettings.get(name)?.value;
    }

    getUser(userId) {
        const defaultSettings = {
            prefix: ".",
            status: "inactive",
            balance: 0,
            tier: "free",
            antidelete: false,
            style: "default"
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
