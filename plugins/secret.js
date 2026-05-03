const translate = require("google-translate-api-x");

module.exports = {
    command: "secret",
    alias: ["dm", "sendto", "relay"],
    category: "secrets",
    description: "Send secret message via bot relay system",

    async execute(m, sock, { args, userSettings, prefix }) {

        // ================= STYLE ENGINE =================
        const style = userSettings?.style || "normal";
        const lang = userSettings?.lang || "en";

        const modes = {
            harsh: {
                title: "☣️ 𝕾𝕰𝕮𝕽𝕰𝕿 𝕽𝕰𝕷𝕬𝖄 ☣️",
                react: "☠️",
                line: "━",
                invalid: `❌ Format: ${prefix}secret 2557xxxxx message`
            },
            normal: {
                title: "🔐 SECRET MESSAGE SYSTEM",
                react: "📨",
                line: "─",
                invalid: `❓ Use: ${prefix}secret number message`
            },
            girl: {
                title: "🫧 𝒮𝑒𝒸𝓇𝑒𝓉 𝒞𝓊𝓉𝑒 𝒟𝑒𝓁𝒾𝓋𝑒𝓇𝓎 🫧",
                react: "🎀",
                line: "┄",
                invalid: `🫧 babe, add number + message 🫧`
            }
        };

        const current = modes[style] || modes.normal;

        // ================= VALIDATION =================
        const number = args[0];
        const message = args.slice(1).join(" ");

        if (!number || !message) {
            return m.reply(current.invalid);
        }

        // clean number
        const jid = number.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

        try {

            // ================= REACTION =================
            await sock.sendMessage(m.chat, {
                react: { text: current.react, key: m.key }
            });

            // ================= MESSAGE BUILD =================
            let payload = `
${current.title}
${current.line.repeat(20)}

📩 *SECRET MESSAGE*
➡ From: Bot Relay System
➡ Time: ${new Date().toLocaleString()}

💬 Message:
${message}

${current.line.repeat(20)}
🔒 Powered by VEX Secure Relay
            `;

            // ================= TRANSLATION =================
            let finalMsg = payload;
            try {
                const { text } = await translate(payload, { to: lang });
                finalMsg = text;
            } catch {
                finalMsg = payload;
            }

            // ================= SEND TO TARGET =================
            await sock.sendMessage(jid, {
                text: finalMsg
            });

            // ================= CONFIRMATION =================
            let confirm = `
✅ *MESSAGE SENT SUCCESSFULLY*

📨 To: ${number}
⏰ Time: ${new Date().toLocaleTimeString()}

🔐 Status: DELIVERED
            `;

            await m.reply(confirm);

        } catch (error) {
            console.error("SECRET ERROR:", error);
            await m.reply("❌ Failed to send secret message.");
        }
    }
};
