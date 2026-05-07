class AIConfig {

    constructor() {

        this.cache = new Map();

        this.defaultConfig = {

            enabled: false,

            reply_mode: "all",

            reply_type: "private",

            allow_groups: true,

            allow_private: true,

            allow_status: false,

            allow_broadcast: false,

            owner_only: false,

            cooldown: 5,

            typing_delay: 2000,

            read_messages: false,

            react_messages: false,

            save_memory: true,

            trigger_mode: "auto",

            trigger_words: [],

            blocked_words: [],

            blocked_numbers: [],

            whitelist_numbers: [],

            prefix_ignore: true,

            max_context: 10,

            personality: `
You are chatting naturally like a real human.
Never say you are AI.
Reply realistically.
Avoid robotic responses.
Keep messages natural and modern.
`
        };
    }

    // ================= LOAD DATABASE CONFIG =================
    load(rows = []) {

        try {

            const formatted = {};

            for (const row of rows) {

                formatted[row.config_key] = row.value;
            }

            this.cache.set("config", formatted);

            console.log("⚡ AI Config Loaded Into RAM");

        } catch (e) {

            console.log("AI CONFIG LOAD ERROR:", e.message);
        }
    }

    // ================= GET CONFIG =================
    get(key) {

        try {

            const config = this.cache.get("config") || {};

            if (config[key] !== undefined) {
                return config[key];
            }

            return this.defaultConfig[key];

        } catch (e) {

            return this.defaultConfig[key];
        }
    }

    // ================= CHECK ENABLED =================
    async isEnabled(supabase, clientId) {

        try {

            const cached = this.cache.get("enabled_status");

            if (cached !== undefined) {
                return cached;
            }

            const { data } = await supabase
                .from("vex_ai_config")
                .select("value")
                .eq("client_id", clientId)
                .eq("config_key", "enabled")
                .single();

            const enabled =
                data?.value === true ||
                data?.value === "true";

            this.cache.set("enabled_status", enabled);

            setTimeout(() => {
                this.cache.delete("enabled_status");
            }, 15000);

            return enabled;

        } catch (e) {

            console.log("AI ENABLE CHECK ERROR:", e.message);

            return false;
        }
    }

    // ================= SHOULD REPLY =================
    shouldReply({
        m,
        body,
        isOwner = false
    }) {

        try {

            const enabled = this.get("enabled");

            if (!enabled) return false;

            // ================= IGNORE SELF =================
            if (m.key.fromMe) {
                return false;
            }

            // ================= PREFIX IGNORE =================
            const prefixIgnore = this.get("prefix_ignore");

            if (prefixIgnore) {

                const prefixes = [
                    ".",
                    "!",
                    "#",
                    "/",
                    "$"
                ];

                if (
                    prefixes.some(p => body.startsWith(p))
                ) {
                    return false;
                }
            }

            // ================= OWNER ONLY =================
            const ownerOnly = this.get("owner_only");

            if (ownerOnly && !isOwner) {
                return false;
            }

            // ================= PRIVATE/GROUP =================
            const isGroup = m.chat.endsWith("@g.us");

            if (isGroup && !this.get("allow_groups")) {
                return false;
            }

            if (!isGroup && !this.get("allow_private")) {
                return false;
            }

            // ================= STATUS =================
            if (
                m.chat === "status@broadcast" &&
                !this.get("allow_status")
            ) {
                return false;
            }

            // ================= BLOCKED WORDS =================
            const blockedWords =
                this.get("blocked_words") || [];

            const lower = body.toLowerCase();

            const blocked = blockedWords.some(word =>
                lower.includes(word.toLowerCase())
            );

            if (blocked) {
                return false;
            }

            // ================= BLOCKED NUMBERS =================
            const blockedNumbers =
                this.get("blocked_numbers") || [];

            const sender =
                (m.sender || "").split("@")[0];

            if (blockedNumbers.includes(sender)) {
                return false;
            }

            // ================= WHITELIST =================
            const whitelist =
                this.get("whitelist_numbers") || [];

            if (
                whitelist.length > 0 &&
                !whitelist.includes(sender)
            ) {
                return false;
            }

            // ================= TRIGGER MODE =================
            const triggerMode =
                this.get("trigger_mode");

            if (triggerMode === "mention") {

                const mentioned =
                    body.includes("@");

                if (!mentioned) {
                    return false;
                }
            }

            if (triggerMode === "keyword") {

                const words =
                    this.get("trigger_words") || [];

                const matched = words.some(word =>
                    lower.includes(word.toLowerCase())
                );

                if (!matched) {
                    return false;
                }
            }

            return true;

        } catch (e) {

            console.log("SHOULD REPLY ERROR:", e.message);

            return false;
        }
    }

    // ================= GET PERSONALITY =================
    getPersonality() {

        return this.get("personality");
    }

    // ================= GET MAX CONTEXT =================
    getContextLimit() {

        const limit = parseInt(
            this.get("max_context")
        );

        if (isNaN(limit)) return 10;

        return limit;
    }

    // ================= GET COOLDOWN =================
    getCooldown() {

        const cooldown = parseInt(
            this.get("cooldown")
        );

        if (isNaN(cooldown)) return 5;

        return cooldown;
    }

    // ================= GET TYPING DELAY =================
    getTypingDelay() {

        const delay = parseInt(
            this.get("typing_delay")
        );

        if (isNaN(delay)) return 2000;

        return delay;
    }

    // ================= BOOLEAN HELPERS =================
    useMemory() {

        return this.get("save_memory") === true;
    }

    shouldReadMessages() {

        return this.get("read_messages") === true;
    }

    shouldReactMessages() {

        return this.get("react_messages") === true;
    }

    // ================= CLEAR CACHE =================
    clear() {

        this.cache.clear();

        console.log("🧹 AI CONFIG CACHE CLEARED");
    }
}

module.exports = new AIConfig();
