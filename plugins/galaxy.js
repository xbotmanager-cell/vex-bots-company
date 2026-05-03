/**
 * VEX PLUGIN: GALAXY LOGO GENERATOR
 * Feature: AI Galaxy Image Generator (Free APIs + Fallback)
 */

const axios = require("axios");

module.exports = {
    command: "galaxy",
    alias: ["logo", "glogo", "cosmic"],
    category: "tools",
    description: "Generate galaxy styled logos",

    async execute(m, sock, { args, userSettings, prefix }) {

        // ================= INPUT =================
        const text = args.join(" ") || "VEX CORE";

        if (!text) {
            return m.reply(`❌ Usage: ${prefix}galaxy name`);
        }

        // ================= STYLE SYSTEM =================
        const style = userSettings?.style || "harsh";

        const modes = {
            harsh: {
                caption: "☣️ GALAXY DOMINATION ENGINE ☣️",
                tone: "dark neon cosmic explosion ultra sharp 4k logo"
            },
            normal: {
                caption: "🌌 Galaxy Logo Generator",
                tone: "clean blue galaxy glowing aesthetic logo"
            },
            girl: {
                caption: "🫧 Pink Galaxy Dreams 🫧",
                tone: "soft pink purple galaxy aesthetic sparkles cute logo"
            }
        };

        const current = modes[style] || modes.normal;

        // ================= SAFE REPLY / REACTION =================
        try {
            await sock.sendMessage(m.chat, {
                react: {
                    text: "🌌",
                    key: m.key
                }
            });
        } catch {}

        // ================= PROMPT ENGINE =================
        const prompt = encodeURIComponent(
            `${text}, ${current.tone}, centered text logo, ultra quality, glowing, space background, galaxy nebula, cinematic lighting`
        );

        // ================= API LIST (FREE FALLBACK SYSTEM) =================
        const apis = [
            `https://image.pollinations.ai/prompt/${prompt}`,
            `https://api.deepai.org/api/text2img?text=${prompt}`
        ];

        let imageUrl = null;

        // ================= TRY ALL APIs =================
        for (const api of apis) {
            try {
                const url = api;

                // Pollinations direct works without key
                if (api.includes("pollinations")) {
                    imageUrl = url;
                    break;
                }

                // DeepAI fallback (may require key, skip if fails)
                const res = await axios.get(url);
                if (res.data?.output_url) {
                    imageUrl = res.data.output_url;
                    break;
                }

            } catch {}
        }

        // ================= FINAL FALLBACK =================
        if (!imageUrl) {
            imageUrl = `https://image.pollinations.ai/prompt/${prompt}`;
        }

        // ================= SEND IMAGE =================
        try {
            await sock.sendMessage(m.chat, {
                image: { url: imageUrl },
                caption:
                    `${current.caption}\n` +
                    `━━━━━━━━━━━━━━\n` +
                    `🌌 Name: ${text}\n` +
                    `⚡ Style: ${style}\n` +
                    `🤖 Engine: Galaxy AI\n` +
                    `━━━━━━━━━━━━━━\n` +
                    `_Powered by VEX CORE_`
            });

        } catch (error) {
            console.error("GALAXY ERROR:", error);
            m.reply("☣️ Galaxy engine failed. Try again later.");
        }
    }
};
