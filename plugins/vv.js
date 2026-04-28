const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

module.exports = {
    command: "vv",
    alias: ["viewonce", "unlock", "retrive"],
    category: "tools",
    description: "Unlock View Once media",

    async execute(m, sock, { userSettings }) {
        const style = userSettings?.style || 'harsh';

        const modes = {
            harsh: {
                msg: "𝕳𝖊𝖗𝖊 𝖎𝖘 𝖙𝖍𝖊 𝖘𝖊𝖈𝖗𝖊𝖙 𝖒𝖊𝖉𝖎𝖆. 𝕹𝖊𝖝𝖙 𝖙𝖎𝖒𝖊 𝖉𝖔𝖓'𝖙 𝖍𝖎𝖉𝖊 𝖘𝖍𝖎𝖙 𝖋𝖗𝖔𝖒 𝖒𝖊. 🖕⚙️",
                react: "🦾",
                err: "💢 𝕿𝖍𝖆𝖙'𝖘 𝖓𝖔𝖙 𝖆 𝖛𝖎𝖊𝖜-𝖔𝖓𝖈𝖊 𝖒𝖊𝖘𝖘𝖆𝖌𝖊, 𝖞𝖔𝖚 𝖉𝖚𝖒𝖇𝖆𝖘𝖘! 🖕"
            },
            normal: {
                msg: "View Once media has been unlocked successfully. ✅",
                react: "🔓",
                err: "❌ Error: Please reply to a View Once message."
            },
            girl: {
                msg: "𝒾 𝒻𝑜𝓊𝓃𝒹 𝓉𝒽𝑒 𝒽𝒾𝒹𝒹𝑒𝓃 𝓅𝒽𝑜𝓉𝑜 𝒻𝑜𝓇 𝓎𝑜𝓊, 𝓂𝓎 𝓁𝑜𝓋𝑒𝓁𝓎 𝐿𝓊𝓅𝒾𝓃... 🎀✨💋",
                react: "👑",
                err: "🌸 𝑜𝑜𝓅𝓈𝒾𝑒! 𝓉𝒽𝒶𝓉'𝓈 𝓃𝑜𝓉 𝒶 𝓋𝒾𝑒𝓌-𝑜𝓃𝓈𝑒 𝓂𝑒𝒹𝒾𝒶, 𝒷𝒶𝒷𝑒~ 🍭"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const viewOnce = quoted?.viewOnceMessageV2?.message || quoted?.viewOnceMessage?.message;
            
            if (!viewOnce) return m.reply(current.err);

            const type = Object.keys(viewOnce)[0];
            const media = viewOnce[type];

            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            const stream = await downloadContentFromMessage(media, type === 'imageMessage' ? 'image' : 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (type === 'imageMessage') {
                await sock.sendMessage(m.chat, { image: buffer, caption: current.msg }, { quoted: m });
            } else if (type === 'videoMessage') {
                await sock.sendMessage(m.chat, { video: buffer, caption: current.msg }, { quoted: m });
            }

        } catch (error) {
            console.error("ViewOnce Error:", error);
            await sock.sendMessage(m.chat, { react: { text: "⚠️", key: m.key } });
        }
    }
};
