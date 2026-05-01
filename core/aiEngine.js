const translate = require("google-translate-api-x");
const axios = require("axios");

// ================= MEMORY =================
const userMemory = new Map();
const cooldown = new Map();

// ================= CONFIG =================
const COOLDOWN_TIME = 5000; // anti spam

module.exports = {
    name: "ai_engine",

    trigger: (m) => {
        return (
            m.message &&
            !m.key.fromMe &&
            (m.message.conversation || m.message.extendedTextMessage)
        );
    },

    async onMessage(m, sock, ctx) {
        const { supabase, userSettings } = ctx;

        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        try {
            const sender = m.key.participant || m.key.remoteJid;
            const text =
                m.message.conversation ||
                m.message.extendedTextMessage?.text ||
                "";

            if (!text) return;

            // ================= CONFIG CHECK =================
            const { data: config } = await supabase
                .from("luper_config")
                .select("*")
                .eq("config_key", "ai_chatbot_enabled")
                .single();

            if (!config || !config.is_active) return;

            // ================= COOLDOWN =================
            const last = cooldown.get(sender) || 0;
            if (Date.now() - last < COOLDOWN_TIME) return;
            cooldown.set(sender, Date.now());

            // ================= MEMORY SYSTEM =================
            let history = userMemory.get(sender) || [];
            history.push({ role: "user", content: text });

            if (history.length > 6) history.shift(); // limit memory

            // ================= AI REQUEST =================
            const aiReply = await generateAIReply(history);

            history.push({ role: "assistant", content: aiReply });
            userMemory.set(sender, history);

            // ================= STYLE SYSTEM =================
            const modes = {
                harsh: (t) => `💀 ${t}`,
                normal: (t) => `🤖 ${t}`,
                girl: (t) => `🌸 ${t} 💕`
            };

            let finalText = modes[style]
                ? modes[style](aiReply)
                : aiReply;

            // ================= TRANSLATION =================
            if (lang !== "en") {
                try {
                    const res = await translate(finalText, { to: lang });
                    finalText = res.text;
                } catch {}
            }

            // ================= SMART DELAY =================
            await new Promise((r) =>
                setTimeout(r, Math.random() * 2000 + 1000)
            );

            // ================= SEND =================
            await sock.sendMessage(
                m.key.remoteJid,
                { text: finalText },
                { quoted: m }
            );

        } catch (err) {
            // silent
        }
    }
};

// ================= AI GENERATOR =================

async function generateAIReply(history) {
    try {
        const prompt = history
            .map((h) => `${h.role}: ${h.content}`)
            .join("\n");

        // FREE AI API (fallback supported)
        const res = await axios.post(
            "https://api.affiliateplus.xyz/api/chatbot",
            {
                message: prompt,
                botname: "VEX",
                ownername: "Lupin"
            }
        );

        return res.data.message || "I am thinking...";
    } catch {
        return "⚠️ AI failed to respond.";
    }
}
