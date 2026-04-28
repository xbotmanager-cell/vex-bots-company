const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');
const translate = require('google-translate-api-x');

module.exports = {
    command: "sticker",
    alias: ["s", "stiker", "wm"],
    category: "tools",
    description: "Convert image/video to sticker with custom WM",

    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        // 1. ADVANCED EYE LOGIC (Detecting media everywhere)
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const mediaMessage = m.message?.imageMessage || 
                             m.message?.videoMessage ||
                             quoted?.imageMessage || 
                             quoted?.videoMessage ||
                             quoted?.viewOnceMessageV2?.message?.imageMessage ||
                             quoted?.viewOnceMessageV2?.message?.videoMessage ||
                             quoted?.viewOnceMessage?.message?.imageMessage ||
                             quoted?.viewOnceMessage?.message?.videoMessage;

        // 2. STYLES & NEW WORLD-CLASS GIRL FONT
        const modes = {
            harsh: {
                msg: "𝕿𝖍𝖊𝖗𝖊'𝖘 𝖞𝖔𝖚𝖗 𝖉𝖆𝖒𝖓 𝖘𝖙𝖎𝖈𝖐𝖊𝖗. 𝕯𝖔𝖓'𝖙 𝖆𝖘𝖐 𝖒𝖊 𝖆𝖌𝖆𝖎𝖓, 𝕴'𝖒 𝖇𝖚𝖘𝖞. 🖕⚙️",
                react: "🦾",
                err: "💢 𝕬𝖗𝖊 𝖞𝖔𝖚 𝖇𝖑𝖎𝖓𝖉? 𝕽𝖊𝖕𝖑𝖞 𝖙𝖔 𝖆 𝖕𝖎𝖈𝖙𝖚𝖗𝖊 𝖔𝖗 𝖛𝖎𝖉𝖊𝖔, 𝖞𝖔𝖚 𝖎𝖉𝖎𝖔𝖙. 🖕"
            },
            normal: {
                msg: "Sticker has been generated successfully. ✅",
                react: "💎",
                err: "❌ Error: Please reply to an image or video to create a sticker."
            },
            girl: {
                msg: "𝓅𝓁𝑒𝒶𝓈𝑒 𝒶𝒸𝒸𝑒𝓅𝓉 𝓉𝒽𝒾𝓈 𝒸𝓊𝓉𝑒 𝓈𝓉𝒾𝒸𝓀𝑒𝓇 𝒻𝓇𝑜𝓂 𝓂𝑒, 𝓂𝓎 𝓁𝑜𝓋𝑒𝓁𝓎 𝐿𝓊𝓅𝒾𝓃... 🎀🌸✨",
                react: "🧚‍♀️",
                err: "📂 𝑜𝑜𝓅𝓈𝒾𝑒! 𝓈𝒽𝑜𝓌 𝓂𝑒 𝒶 𝓅𝓇𝑒𝓉𝓉𝓎 𝓅𝒾𝒸𝓉𝓊𝓇𝑒 𝒻𝒾𝓇𝓈𝓉, 𝒷𝒶𝒷𝑒~ 🍭"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            if (!mediaMessage) return m.reply(current.err);

            // Send Reaction
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 3. SECURE DOWNLOAD
            const type = mediaMessage.videoMessage ? 'video' : 'image';
            const stream = await downloadContentFromMessage(mediaMessage, type);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 4. STICKER ENGINE (Custom WM: Lupin Starnley)
            const sticker = new Sticker(buffer, {
                pack: 'Lupin Starnley', // Sticker Name
                author: 'Vex Engine',   // Author
                type: StickerTypes.FULL,
                categories: ['🤩', '🎉'],
                id: '12345',
                quality: 70,
            });

            const stickerBuffer = await sticker.toBuffer();

            // 5. TRANSLATION LOGIC
            let caption = current.msg;
            if (lang !== 'en') {
                try {
                    const res = await translate(caption, { to: lang });
                    caption = res.text;
                } catch { /* Silent fail */ }
            }

            // 6. DELIVERY
            await sock.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });
            
            // Send acknowledgement message (Optional based on your preference)
            // await sock.sendMessage(m.chat, { text: caption }, { quoted: m });

        } catch (error) {
            console.error("Sticker Error:", error);
            await sock.sendMessage(m.chat, { text: `🛑 Error: ${error.message}` });
        }
    }
};
