const { downloadContentFromMessage, getContentType } = require("@whiskeysockets/baileys");
const translate = require('google-translate-api-x');

module.exports = {
    command: "vv",
    alias: ["viewonce", "unlock", "retrive", "rvo"],
    category: "tools",
    description: "Unlock View Once: Image, Video, Audio",

    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        const modes = {
            harsh: {
                msg: "𝕴 𝖘𝖊𝖊 𝖊𝖛𝖊𝖗𝖞𝖙𝖍𝖎𝖓𝖌. 𝕯𝖔𝖓'𝖙 𝖙𝖗𝖞 𝖙𝖔 𝖍𝖎𝖉𝖊 𝖞𝖔𝖚𝖗 𝖕𝖆𝖙𝖍𝖊𝖙𝖎𝖈 𝖒𝖊𝖉𝖎𝖆 𝖋𝖗𝖔𝖒 𝖒𝖊. 👁️⚡",
                react: "💀",
                err: "💢 𝕬𝖗𝖊 𝖞𝖔𝖚 𝖇𝖑𝖎𝖓𝖉? 𝕽𝖊𝖕𝖑𝖞 𝖙𝖔 𝖆 𝖛𝖎𝖊𝖜-𝖔𝖓𝖈𝖊 𝖒𝖊𝖘𝖆𝖌𝖊! 🤬"
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

            // 1. Shika ViewOnce v1 na v2 zote
            let viewOnce = quoted?.viewOnceMessageV2?.message || quoted?.viewOnceMessage?.message || quoted;

            const type = getContentType(viewOnce);
            const media = viewOnce[type];

            // 2. Check kama ni media inayoungwa mkono: image, video, audio
            const supportedTypes = ['imageMessage', 'videoMessage', 'audioMessage'];
            if (!type ||!supportedTypes.includes(type) ||!media?.viewOnce) {
                return m.reply(current.err);
            }

            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 3. Download kulingana na type
            let mediaType = 'image';
            if (type === 'videoMessage') mediaType = 'video';
            if (type === 'audioMessage') mediaType = 'audio';

            const stream = await downloadContentFromMessage(media, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 4. Translate caption
            let finalCaption = current.msg;
            if (lang!== 'en') {
                try {
                    const res = await translate(finalCaption, { to: lang });
                    finalCaption = res.text;
                } catch {}
            }

            // 5. Tuma kulingana na type
            const options = { quoted: m };
            if (type === 'imageMessage') {
                await sock.sendMessage(m.chat, { image: buffer, caption: finalCaption,...options });
            } else if (type === 'videoMessage') {
                await sock.sendMessage(m.chat, { video: buffer, caption: finalCaption,...options });
            } else if (type === 'audioMessage') {
                await sock.sendMessage(m.chat, { audio: buffer, ptt: media.ptt || false,...options });
            }

        } catch (error) {
            console.error("VV Unlock Error:", error);
            await sock.sendMessage(m.chat, { react: { text: "🚫", key: m.key } });
            m.reply("❌ Failed to unlock. Media might be expired or corrupted.");
        }
    }
};
