const { downloadContentFromMessage, getContentType } = require("@whiskeysockets/baileys");
const translate = require('google-translate-api-x');

module.exports = {
    command: "save",
    alias: ["getstatus", "sva", "steal"],
    category: "tools",
    description: "Download status media by replying to it",

    async execute(m, sock, { args, userSettings }) {
        const lang = userSettings?.lang || 'en';
        const style = userSettings?.style || 'harsh';

        const modes = {
            harsh: {
                msg: "𝕴 𝖘𝖙𝖔𝖑𝖊 𝖙𝖍𝖎𝖘 𝖋𝖔𝖗 𝖞𝖔𝖚. 𝕯𝖔𝖓'𝖙 𝖙𝖊𝖑𝖑 𝖙𝖍𝖊 𝖔𝖜𝖓𝖊𝖗 𝖔𝖗 𝕴'𝖑𝖑 𝖐𝖎𝖑𝖑 𝖞𝖔𝖚. 🏴‍☠️🔥",
                react: "🦾",
                err: "💢 𝕽𝖊𝖕𝖑𝖞 𝖙𝖔 𝖆 𝖛𝖆𝖑𝖎𝖉 𝖘𝖙𝖆𝖙𝖚𝖘 𝖒𝖊𝖉𝖎𝖆, 𝖞𝖔𝖚 𝖜𝖊𝖆𝖐𝖑𝖎𝖓𝖌! 🖕"
            },
            normal: {
                msg: "Status media has been saved successfully. ✅",
                react: "📥",
                err: "❌ Please reply to a status message."
            },
            girl: {
                msg: "𝒽𝑒𝓇𝑒 𝒾𝓈 𝓉𝒽𝑒 𝓈𝓉𝒶𝓉𝓊𝓈 𝓎𝑜𝓊 𝓌𝒶𝓃𝓉𝑒𝒹, 𝓂𝓎 𝓁𝑜𝓋𝑒𝓁𝓎 𝐿𝓊𝓅𝒾𝓃... 🎀🍭✨",
                react: "💎",
                err: "🌸 ℴℴ𝓅𝓈𝒾ℯ! 𝒾 𝓃𝑒𝑒𝒹 𝓎𝑜𝓊 𝓉𝑜 𝓇𝑒𝓅𝓁𝓎 𝓉𝑜 𝒶 𝓈𝓉𝒶𝓉𝓊𝓈, 𝒹𝒶𝓇𝓁𝒾𝓃𝑔~ 💍"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            // 1. DEEP STATUS SENSOR
            const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted) return m.reply(current.err);

            const type = getContentType(quoted);
            const media = quoted[type];

            if (!type || !['imageMessage', 'videoMessage', 'audioMessage'].includes(type)) {
                return m.reply(current.err);
            }

            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 2. EXTRACTION LOGIC
            const stream = await downloadContentFromMessage(
                media, 
                type === 'imageMessage' ? 'image' : type === 'videoMessage' ? 'video' : 'audio'
            );
            
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 3. TRANSLATION ENGINE
            let finalCaption = current.msg;
            if (lang !== 'en') {
                try {
                    const res = await translate(finalCaption, { to: lang });
                    finalCaption = res.text;
                } catch { /* Silent */ }
            }

            // 4. DELIVERY SYSTEM
            const options = { quoted: m, caption: finalCaption };
            if (type === 'imageMessage') {
                await sock.sendMessage(m.chat, { image: buffer, ...options });
            } else if (type === 'videoMessage') {
                await sock.sendMessage(m.chat, { video: buffer, ...options, mimetype: 'video/mp4' });
            } else if (type === 'audioMessage') {
                await sock.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mpeg' }, { quoted: m });
            }

        } catch (error) {
            console.error("Save Error:", error);
            await sock.sendMessage(m.chat, { react: { text: "⚠️", key: m.key } });
        }
    }
};
