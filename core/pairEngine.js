const { randomBytes } = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ================= MAIN ENGINE =================

module.exports = async function pairEngine(m, sock, { args, cache }) {
    const style = cache.getSetting("style") || "harsh";

    const modes = {
        harsh: {
            ok: "☣️ PAIR SYSTEM INITIALIZED ☣️",
            err: "☣️ INVALID PAIR INPUT DETECTED ☣️"
        },
        normal: {
            ok: "✅ Pair request created",
            err: "❌ Invalid format"
        },
        girl: {
            ok: "🌸 Pairing started successfully 🌸",
            err: "🌸 Oopsie! Wrong input 🌸"
        }
    };

    const current = modes[style] || modes.harsh;

    try {
        // ================= INPUT VALIDATION =================

        const phone = args[0];
        const durationRaw = args[1];

        if (!phone || !durationRaw) {
            return m.reply(current.err);
        }

        // ================= DURATION PARSER =================

        const expiresAt = parseDuration(durationRaw);
        if (!expiresAt) return m.reply(current.err);

        // ================= SESSION ID GENERATION =================

        const sessionId = randomBytes(16).toString("hex");

        // ================= SUPABASE INSERT =================

        const { error } = await supabase.from("bot_sessions").insert({
            id: sessionId,
            phone,
            session_data: null, // will be filled after auth flow
            status: "pending",
            created_at: new Date().toISOString(),
            expires_at: expiresAt,
            owner: m.sender,
            device_name: `VEX_SUBBOT_${phone}`
        });

        if (error) throw error;

        // ================= RESPONSE =================

        await sock.sendMessage(m.chat, {
            text:
`${current.ok}

📱 *Phone:* ${phone}
⏳ *Duration:* ${durationRaw}
🆔 *Session ID:* ${sessionId}

⚡ Waiting for authentication...
Use QR or pairing code flow to activate this session.`
        }, { quoted: m });

    } catch (err) {
        console.error("PAIR ENGINE ERROR:", err.message);
        m.reply("❌ Pair system failed. Try again.");
    }
};

// ================= DURATION PARSER =================

function parseDuration(input) {
    try {
        const match = input.match(/^(\d+)([dhm])$/);
        if (!match) return null;

        const value = parseInt(match[1]);
        const unit = match[2];

        const now = Date.now();

        switch (unit) {
            case "d":
                return new Date(now + value * 86400000).toISOString();
            case "h":
                return new Date(now + value * 3600000).toISOString();
            case "m":
                return new Date(now + value * 60000).toISOString();
            default:
                return null;
        }
    } catch {
        return null;
    }
}
