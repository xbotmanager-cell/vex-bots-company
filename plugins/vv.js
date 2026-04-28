const translate = require('google-translate-api-x');
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

module.exports = {
    command: "vv",
    alias: ["viewonce", "retrive"],
    category: "exploit",
    description: "Retrieve View Once media (Images/Videos)",
    
    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        // 1. Identify View Once Message
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const viewOnce = quoted?.viewOnceMessageV2?.message || quoted?.viewOnceMessage?.message;

        // Modes Configuration (Short & Clear)
        const modes = {
            harsh: {
                msg: "𝙷𝚎𝚛𝚎 𝚒𝚜 𝚢𝚘𝚞𝚛 𝚜𝚝𝚞𝚙𝚒𝚍 𝚖𝚎𝚍𝚒𝚊. 𝚂𝚝𝚘𝚙 𝚑𝚒𝚍𝚒𝚗𝚐 𝚝𝚑𝚒𝚗𝚐𝚜.",
                react: "💀",
                err: "⚠️ 𝙽𝚘 𝚅𝚒𝚎𝚠 𝙾𝚗𝚌𝚎 𝚏𝚘𝚞𝚗𝚍, 𝚢𝚘𝚞 𝚋𝚕𝚒𝚗𝚍 𝚞𝚜𝚎𝚛."
            },
            normal: {
                msg: "𝗩𝗶𝗲𝘄 𝗢𝗻𝗰𝗲 𝗠𝗲𝗱𝗶𝗮 𝘀𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗿𝗲𝘁𝗿𝗶𝗲𝘃𝗲𝗱.",
                react: "🔓",
                err: "❌ 𝗘𝗿𝗿𝗼𝗿: 𝗣𝗹𝗲𝗮𝘀𝗲 𝗿𝗲𝗽𝗹𝘆 𝘁𝗼 𝗮 𝘃𝗶𝗲𝘄-𝗼𝗻𝗰𝗲 𝗺𝗲𝘀𝘀𝗮𝗴𝗲."
            },
            girl: {
                msg: "𝒾 𝒻ℴ𝓊𝓃𝒹 𝒾𝓉 𝒻ℴ𝓇 𝓎ℴ𝓊, 𝒷𝒶𝒷ℯ! 𝓃ℴ 𝓂ℴ𝓇ℯ 𝓈ℯ𝒸𝓇ℯ𝓉𝓈 ✨🎀",
                react: "🦋",
                err: "📂 ℴℴ𝓅𝓈𝒾ℯ! 𝓉𝒽𝒶𝓉'𝓈 𝓃ℴ𝓉 𝒶 𝓋𝒾ℯ𝓌-ℴ𝓃𝒸ℯ 𝓂ℯ𝓈𝓈𝒶𝑔ℯ. 🌸"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            if (!viewOnce) {
                return m.reply(current.err);
            }

            // Send Reaction
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            const mediaType = Object.keys(viewOnce)[0]; // imageMessage or videoMessage
            const stream = await downloadContentFromMessage(viewOnce[mediaType], mediaType.split('Message')[0]);
            
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            let caption = current.msg;
            if (lang !== 'en') {
                const res = await translate(caption, { to: lang });
                caption = res.text;
            }

            // Send Retrieved Media
            if (mediaType === 'imageMessage') {
                await sock.sendMessage(m.chat, { image: buffer, caption: caption }, { quoted: m });
            } else if (mediaType === 'videoMessage') {
                await sock.sendMessage(m.chat, { video: buffer, caption: caption }, { quoted: m });
            }

        } catch (error) {
            console.error("VV Error:", error);
            await sock.sendMessage(m.chat, { text: current.err });
        }
    }
};
