const { downloadContentFromMessage, getContentType } = require("@whiskeysockets/baileys");
const translate = require('google-translate-api-x');

module.exports = {
    command: "vv",
    alias: ["viewonce", "unlock", "retrive"],
    category: "tools",
    description: "Deep unlock for View Once media",

    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        const modes = {
            harsh: {
                msg: "𝕴 𝖘𝖊𝖊 𝖊𝖛𝖊𝖗𝖞𝖙𝖍𝖎𝖓𝖌. 𝕯𝖔𝖓'𝖙 𝖙𝖗𝖞 𝖙𝖔 𝖍𝖎𝖉𝖊 𝖞𝖔𝖚𝖗 𝖕𝖆𝖙𝖍𝖊𝖙𝖎𝖈 𝖒𝖊𝖉𝖎𝖆 𝖋𝖗𝖔𝖒 𝖒𝖊. 👁️⚡",
                react: "💀",
                err: "💢 𝕬𝖗𝖊 𝖞𝖔𝖚 𝖇𝖑𝖎𝖓𝖉? 𝕽𝖊𝖕𝖑𝖞 𝖙𝖔 𝖆 𝖛𝖎𝖊𝖜-𝖔𝖓𝖈𝖊 𝖒𝖊𝖘𝖘𝖆𝖌𝖊! 🤬"
            },
            normal: {
                msg: "Hidden media recovered successfully. ✅",
                react: "🛸",
                err: "❌ Please reply to a View Once message."
            },
            girl: {
                msg: "𝒾 𝒻𝑜𝓊𝓃𝒹 𝓌𝒽𝒶𝓉 𝓎𝑜𝓊 𝓌𝑒𝓇𝑒 𝓁𝑜𝑜𝓀𝒾𝓃𝑔 𝒻𝑜𝓇, 𝓂𝓎 𝓁𝑜𝓋𝑒𝓁𝓎 𝐿𝓊𝓅𝒾𝓃... 🏹✨💎",
                react: "🧊",
                err: "🌸 𝑜𝑜𝓅𝓈𝒾𝑒! 𝓉𝒽𝒶𝓉 𝒾𝓈𝓃'𝓉 𝒶 𝓋𝒾𝑒𝓌-𝑜𝓃𝒸𝑒 𝓅𝒽𝑜𝓉𝑜, 𝒷𝒶𝒷𝑒~ 🍭"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted) return m.reply(current.err);

            let viewOnce = quoted?.viewOnceMessageV2 || quoted?.viewOnceMessage || quoted;
            if (viewOnce.message) viewOnce = viewOnce.message;

            const type = getContentType(viewOnce);
            const media = viewOnce[type];

            if (!type || !['imageMessage', 'videoMessage'].includes(type)) {
                return m.reply(current.err);
            }

            // --- REACTION RESET ---
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // --- VENOM DOWNLOADER ---
            const stream = await downloadContentFromMessage(
                media, 
                type === 'imageMessage' ? 'image' : 'video'
            );
            
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // --- TRANSLATION SYSTEM ---
            let finalCaption = current.msg;
            if (lang !== 'en') {
                try {
                    const res = await translate(finalCaption, { to: lang });
                    finalCaption = res.text;
                } catch { /* Fail silent */ }
            }

            // --- FINAL DELIVERY ---
            const options = { quoted: m, caption: finalCaption };
            if (type === 'imageMessage') {
                await sock.sendMessage(m.chat, { image: buffer, ...options });
            } else {
                await sock.sendMessage(m.chat, { video: buffer, ...options });
            }

        } catch (error) {
            console.error("Venom Unlock Error:", error);
            await sock.sendMessage(m.chat, { react: { text: "🚫", key: m.key } });
        }
    }
};
