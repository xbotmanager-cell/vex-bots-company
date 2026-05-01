const translate = require("google-translate-api-x");

module.exports = async function responseEngine(m, sock, payload) {
    const {
        text,
        userSettings,
        lang,
        quoted = m
    } = payload;

    if (!text || typeof text !== "string") return;

    const style = userSettings?.style?.value || "harsh";
    const targetLang = lang || userSettings?.lang || "en";
    const silent = userSettings?.silent || false;

    // ================= STYLE SYSTEM =================

    const styles = {
        harsh: {
            format: (t) => `☣️ ${t} ☣️`,
            react: "🕒"
        },
        normal: {
            format: (t) => t,
            react: "💬"
        },
        girl: {
            format: (t) => `🌸 ${t} 🌸`,
            react: "✨"
        }
    };

    const current = styles[style] || styles.harsh;

    let finalText = text;

    // ================= TRANSLATION LAYER =================

    if (targetLang && targetLang !== "en") {
        try {
            const res = await translate(finalText, { to: targetLang });
            finalText = res.text;
        } catch (e) {
            console.error("Translation Error:", e.message);
        }
    }

    // ================= STYLE APPLY =================

    finalText = current.format(finalText);

    try {
        // ================= SILENT MODE =================
        if (!silent) {
            await sock.sendMessage(m.chat, {
                text: finalText
            }, { quoted });

            // optional reaction (lightweight UX layer)
            await sock.sendMessage(m.chat, {
                react: {
                    text: current.react,
                    key: m.key
                }
            });
        }

        // if silent=true → do nothing (no output)

    } catch (err) {
        console.error("Response Engine Error:", err.message);
    }
};
