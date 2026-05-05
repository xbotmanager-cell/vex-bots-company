import EventEmitter from "events";

class VexCache extends EventEmitter {
    constructor() {
        super();

        this.vexSettings = new Map();
        this.userSettings = new Map();
        this.cooldowns = new Map();

        this.ready = false;
    }

    // ================= INIT =================

    async init(supabase) {
        try {
            // LOAD GLOBAL SETTINGS
            const { data: settings } = await supabase.from("vex_settings").select("*");

            if (settings) {
                settings.forEach(s => {
                    const value = (s.setting_name === "style") ? s.extra_data : s.value;
                    this.vexSettings.set(s.setting_name, {
                        value,
                        extra: s.extra_data
                    });
                });
            }

            // LOAD USER SETTINGS (OPTIONAL - lazy load supported)
            const { data: users } = await supabase.from("users").select("*");

            if (users) {
                users.forEach(u => {
                    this.userSettings.set(u.id, {
                        style: u.style || "harsh",
                        lang: u.lang || "en",
                        premium: u.premium || false,
                        silent: u.silent || false
                    });
                });
            }

            this.setupRealtime(supabase);

            this.ready = true;
            console.log("⚡ CACHE READY");

        } catch (e) {
            console.error("CACHE INIT ERROR:", e.message);
        }
    }

    // ================= REALTIME =================

    setupRealtime(supabase) {
        // GLOBAL SETTINGS
        supabase
            .channel("vex_settings_changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "vex_settings" },
                payload => {
                    const updated = payload.new;

                    const value = (updated.setting_name === "style")
                        ? updated.extra_data
                        : updated.value;

                    this.vexSettings.set(updated.setting_name, {
                        value,
                        extra: updated.extra_data
                    });

                    this.emit("settings:update", updated.setting_name);
                }
            )
            .subscribe();

        // USER SETTINGS
        supabase
            .channel("users_changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "users" },
                payload => {
                    const u = payload.new;

                    this.userSettings.set(u.id, {
                        style: u.style || "harsh",
                        lang: u.lang || "en",
                        premium: u.premium || false,
                        silent: u.silent || false
                    });

                    this.emit("user:update", u.id);
                }
            )
            .subscribe();
    }

    // ================= GETTERS =================

    getSetting(name) {
        return this.vexSettings.get(name)?.value;
    }

    getFullSetting(name) {
        return this.vexSettings.get(name);
    }

    getUser(jid) {
        return this.userSettings.get(jid) || {
            style: this.getSetting("style") || "harsh",
            lang: "en",
            premium: false,
            silent: false
        };
    }

    // ================= UPDATERS =================

    async updateSetting(supabase, name, value) {
        try {
            await supabase
                .from("vex_settings")
                .update({ value })
                .eq("setting_name", name);

            this.vexSettings.set(name, { value });

        } catch (e) {
            console.error("SETTING UPDATE ERROR:", e.message);
        }
    }

    async updateUser(supabase, jid, data) {
        try {
            await supabase
                .from("users")
                .update({
                    ...data
                })
                .eq("id", jid);

            const current = this.getUser(jid);

            this.userSettings.set(jid, {
                ...current,
                ...data
            });

        } catch (e) {
            console.error("USER UPDATE ERROR:", e.message);
        }
    }

    // ================= COOLDOWN =================

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

// Badala ya module.exports, sasa tunatumia export default
export default new VexCache();
