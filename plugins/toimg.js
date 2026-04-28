const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const translate = require('google-translate-api-x');

module.exports = {
    command: "toimg",
    alias: ["topicture", "toimage", "picha"],
    category: "tools",
    description: "Convert a sticker back to an image",

    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        // 1. ADVANCED STICKER SENSOR (Inaona sticker hata ikiwa ni View Once)
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const stickerMessage = m.message?.stickerMessage || 
                               quoted?.stickerMessage;

        // 2. PERSONALITY & FONT ENGINE
        const modes = {
            harsh: {
                title: "⛓️ 𝕴𝕸𝕬𝕲𝕰 𝕰𝖃𝕿𝕽𝕬𝕮𝕿𝕺𝕽 ⛓️",
                msg: "𝕳𝖊𝖗𝖊'𝖘 𝖞𝖔𝖚𝖗 𝖋𝖚𝖈𝖐𝖎𝖓𝖌 𝖕𝖎𝖈𝖙𝖚𝖗𝖊. 𝕹𝖊𝖝𝖙 𝖙𝖎𝖒𝖊 𝖘𝖊𝖓𝖉 𝖆 𝖗𝖊𝖆𝖑 𝖕𝖍𝖔𝖙𝖔, 𝖞𝖔𝖚 𝖑𝖆𝖟𝖞 𝖇𝖆𝖘𝖙𝖆𝖗𝖉. 🖕⚙️",
                react: "🖕",
                err: "💢 𝕬𝖗𝖊 𝖞𝖔𝖚 𝖇𝖑𝖎𝖓𝖉? 𝕽𝖊𝖕𝖑𝖞 𝖙𝖔 𝖆 𝖘𝖙𝖎𝖈𝖐𝖊𝖗, 𝖓𝖔𝖙 𝖙𝖊𝖝𝖙! 𝖀𝖘𝖊𝖑𝖊𝖘𝖘... 🖕",
                footer: "`> image extracted`"
            },
            normal: {
                title: "🖼️ 𝖲𝗍𝗂𝖼𝗄𝖾𝗋 𝗍𝗈 𝖯𝗁𝗈𝗍𝗈 🖼️",
                msg: "𝖳𝗁𝖾 𝗌𝗍𝗂𝖼𝗄𝖾𝗋 𝗁𝖺𝗌 𝖻𝖾𝖾𝗇 𝖼𝗈𝗇𝗏𝖾𝗋𝗍𝖾𝖽 𝖻𝖺𝖼𝗄 𝗍𝗈 𝖺𝗇 𝗂𝗆𝖺𝗀𝖾. ✅",
                react: "📸",
                err: "❌ Error: Please reply to a sticker to convert it.",
                footer: "`> conversion successful`"
            },
            girl: {
                title: "🎀 𝒫𝒾𝒸𝓉𝓊𝓇𝑒 𝑅𝑒𝓋𝑒𝒶𝓁𝑒𝓇 🎀",
                msg: "𝒾 𝒻𝑜𝓊𝓃𝒹 𝓉𝒽𝑒 𝒷𝑒𝒶𝓊𝓉𝒾𝒻𝓊𝓁 𝓅𝒽𝑜𝓉𝑜 𝒾𝓃𝓈𝒾𝒹𝑒 𝓉𝒽𝒶𝓉 𝓈𝓉𝒾𝒸𝓀𝑒𝓇 𝒻𝑜𝓇 𝓎𝑜𝓊, 𝓂𝓎 𝒹𝑒𝒶𝓇 𝐿𝓊𝓅𝒾𝓃... 💗✨💋",
                react: "👑",
                err: "🌸 𝑜𝑜𝓅𝓈𝒾𝑒! 𝒾 𝓃𝑒𝑒𝒹 𝒶 𝓈𝓉𝒾𝒸𝓀𝑒𝓇 𝓉𝑜 𝓌𝑜𝓇𝓀 𝓂𝓎 𝓂𝒶𝑔𝒾𝒸, 𝒷𝒶𝒷𝑒~ 🍭",
                footer: "`> for my king`"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            if (!stickerMessage) return m.reply(current.err);

            // Send Reaction
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 3. SECURE STICKER DOWNLOAD
            const stream = await downloadContentFromMessage(stickerMessage, 'sticker');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 4. TRANSLATION & FONT DELIVERY
            let caption = current.msg;
            if (lang !== 'en') {
                try {
                    const res = await translate(caption, { to: lang });
                    caption = res.text;
                } catch { /* Fail silent */ }
            }

            let finalReport = `${current.title}\n\n`;
            finalReport += `${caption}\n\n`;
            finalReport += `${current.footer}`;

            // 5. DELIVERY
            await sock.sendMessage(m.chat, { 
                image: buffer, 
                caption: finalReport 
            }, { quoted: m });

        } catch (error) {
            console.error("ToImg Error:", error);
            await sock.sendMessage(m.chat, { text: `🛑 Error: ${error.message}` });
        }
    }
};
