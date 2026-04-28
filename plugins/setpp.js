const translate = require('google-translate-api-x');
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

module.exports = {
    command: "setpp",
    alias: ["updatepp", "setprofile"],
    category: "tools",
    description: "Update the bot's profile picture by replying to an image",
    
    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        // 1. ADVANCED EYE LOGIC (Kuitambua picha popote ilipo)
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        // Hapa bot sasa inaona picha ya kawaida, picha yenye caption, au picha ya View Once
        const imageMessage = m.message?.imageMessage || 
                             quoted?.imageMessage || 
                             quoted?.viewOnceMessageV2?.message?.imageMessage ||
                             quoted?.viewOnceMessage?.message?.imageMessage;

        const modes = {
            harsh: {
                msg: "𝙿𝚛𝚘𝚏𝚒𝚕𝚎 𝚞𝚙𝚍𝚊𝚝𝚎𝚍. 𝙸 𝚑𝚘𝚙𝚎 𝚢𝚘𝚞 𝚕𝚒𝚔𝚎 𝚝𝚑𝚒𝚜 𝚞𝚐𝚕𝚢 𝚙𝚒𝚌𝚝𝚞𝚛𝚎. 🖕",
                react: "🎭",
                err: "⚠️ 𝚁𝚎𝚙𝚕𝚢 𝚝𝚘 𝚊𝚗 𝚒𝚖𝚊𝚐𝚎, 𝚢𝚘𝚞 𝚒𝚍𝚒𝚘𝚝. 𝙸 𝚌𝚊𝚗'𝚝 𝚜𝚎𝚝 𝚝𝚎𝚡𝚝 𝚊𝚜 𝚊 𝚙𝚒𝚌𝚝𝚞𝚛𝚎."
            },
            normal: {
                msg: "𝗕𝗼𝘁 𝗽𝗿𝗼𝗳𝗶𝗹𝗲 𝗽𝗶𝗰𝘁𝘂𝗿𝗲 𝗵𝗮𝘀 𝗯𝗲𝗲𝗻 𝘀𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝘂𝗽𝗱𝗮𝘁𝗲𝗱. ✅",
                react: "🖼️",
                err: "❌ 𝗘𝗿𝗿𝗼𝗿: 𝗬𝗼𝘂 𝗺𝘂𝘀𝘁 𝗿𝗲𝗽𝗹𝘆 𝘁𝗼 𝗮𝗻 𝗶𝗺𝗮𝗴𝗲 𝗺𝗲𝘀𝘀𝗮𝗴𝗲."
            },
            girl: {
                msg: "𝓎𝒶𝓎! 𝒾 𝓁ℴℴ𝓀 𝓈ℴ 𝓅𝓇ℯttf𝓎 𝓃ℴ𝓌, 𝓉𝒽𝒶𝓃𝓀𝓈 𝒷𝒶𝒷ℯ! ✨🌷",
                react: "💅",
                err: "📂 ℴℴ𝓅𝓈𝒾ℯ! 𝓅𝓁ℯ𝒶𝓈ℯ 𝓈𝒽ℴ𝓌 𝓂ℯ 𝒶 𝓅𝒾𝒸𝓉𝓊𝓇ℯ 𝓉ℴ 𝓊𝓈ℯ. 🌸"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            if (!imageMessage) {
                return m.reply(current.err);
            }

            // 2. SEND REACTION
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 3. SECURE DOWNLOAD (Baileys Fix)
            const stream = await downloadContentFromMessage(imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 4. UPDATE PROFILE PICTURE
            const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            await sock.updateProfilePicture(botJid, buffer);

            // 5. TRANSLATION & REPLY
            let caption = current.msg;
            if (lang !== 'en') {
                try {
                    const res = await translate(caption, { to: lang });
                    caption = res.text;
                } catch (trErr) {
                    console.error("Translation Error:", trErr.message);
                }
            }

            await sock.sendMessage(m.chat, { text: caption }, { quoted: m });

        } catch (error) {
            console.error("SetPP Critical Error:", error);
            // Kama kuna error ya picha kuwa kubwa sana au format, bot inajibu hapa
            await sock.sendMessage(m.chat, { text: `🛑 Error: ${error.message}` });
        }
    }
};
