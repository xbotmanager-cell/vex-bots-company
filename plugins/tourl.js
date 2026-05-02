/**
 * VEX PLUGIN: TOURL (ELITE MEDIA UPLOADER)
 * Feature: Multi-Style UI + Smart Media Selector + ViewOnce Support + Translation
 * Version: 8.5 (Catbox Edition)
 * Dev: Lupin Starnley
 */

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const Catbox = require('catbox.moe'); 
const uploader = new Catbox.Catbox();
const translate = require('google-translate-api-x');

module.exports = {
    command: "tourl",
    alias: ["url", "makeurl", "upload"],
    category: "tools",
    description: "Converts any media (including ViewOnce) to a public URL using Catbox",

    async execute(m, sock, ctx) {
        const { args, userSettings } = ctx;
        const style = userSettings?.style || 'harsh';
        const targetLang = userSettings?.lang || 'en';

        // 1. Smart Media Selector
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const msg = quoted || m.message;
        
        const mediaMsg = msg?.imageMessage || 
                         msg?.videoMessage || 
                         msg?.documentMessage || 
                         msg?.audioMessage || 
                         msg?.viewOnceMessageV2?.message?.imageMessage || 
                         msg?.viewOnceMessageV2?.message?.videoMessage;

        const mime = mediaMsg?.mimetype;

        // 2. UI Modes Matrix
        const modes = {
            harsh: {
                title: "☘️ 𝕱𝖀𝕮𝕼𝕴𝕹𝕲 𝖀𝕻𝕷𝕺𝕬𝕯 𝕰𝕹𝕲𝕴𝕹𝕰 ☘️",
                processing: "⚙️ 𝕰𝖝𝖙𝖗𝖆𝖈𝖙𝖎𝖓𝖌 𝖇𝖎𝖓𝖆𝖗𝖞 𝖉𝖆𝖙𝖆... 𝖕𝖑𝖊𝖆𝖘𝖊 𝖜𝖆𝖎𝖙. ☘️",
                done: "☘️ 𝖀𝖕𝖑𝖔𝖆𝖉 𝕮𝖔𝖒𝖕𝖑𝖊𝖙𝖊! 𝕳𝖊𝖗𝖊 𝖎𝖘 𝖞𝖔𝖚𝖗 𝖉𝖆𝖒𝖓 𝖑𝖎𝖓𝖐. ☘️",
                err: "☘️ 𝕬𝖗𝖊 𝖞𝖔𝖚 𝖘𝖙𝖚𝖕𝖎𝖉? 𝕼𝖚𝖔𝖙𝖊 𝖆 𝖒𝖊𝖉𝖎𝖆 𝖋𝖎𝖑𝖊! ☘️",
                react: "☣️"
            },
            normal: {
                title: "💠 VEX Media Uploader 💠",
                processing: "⏳ Uploading file to secure servers...",
                done: "✅ File successfully converted to URL.",
                err: "❌ Please reply to a photo, video, or document.",
                react: "💠"
            },
            girl: {
                title: "🫧 𝑀𝒶𝑔𝒾𝒸𝒶𝓁 𝒰𝓅𝓁𝑜𝒶𝒹𝑒𝓇 🫧",
                processing: "🫧 𝓈𝑒𝓃𝒹𝒾𝓃𝑔 𝓎𝑜𝓊𝓇 𝒻𝒾𝓁𝑒 𝓉𝑜 𝓉𝒽𝑒 𝒸𝓁𝑜𝓊𝒹𝓈... 🫧",
                done: "🫧 𝒽𝑒𝓇𝑒 𝒾𝓈 𝓎𝑜𝓊𝓇 𝓁𝒾𝓃𝓀, 𝓈𝓌𝑒𝑒𝓉𝒾𝑒! 🫧",
                err: "🫧 𝒷𝒶𝒷𝑒, 𝐼 𝓃𝑒𝑒𝒹 𝒶 𝒻𝒾𝓁𝑒 𝓉𝑜 𝓊𝓅𝓁𝑜𝒶𝒹! 🫧",
                react: "🫧"
            }
        };

        const current = modes[style] || modes.normal;
        if (!mime) return sock.sendMessage(m.chat, { text: current.err }, { quoted: m });

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            
            // 3. Download Media
            const messageType = mime.split('/')[0];
            const stream = await downloadContentFromMessage(mediaMsg, messageType);
            
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 4. Catbox Upload (Reliable & Permanent)
            const resultUrl = await uploader.uploadBuffer(buffer);

            // 5. Build & Translate
            let bodyText = `🔗 *URL:* [[LINK]]\n📂 *MIME:* ${mime}\n\n⚠️ _${current.done}_`;
            let fullMsg = `*${current.title}*\n\n${bodyText}`;

            const { text: translatedMsg } = await translate(fullMsg, { to: targetLang });
            const finalMsg = translatedMsg.replace("[[LINK]]", resultUrl);

            await sock.sendMessage(m.chat, { text: finalMsg }, { quoted: m });

        } catch (error) {
            console.error("VEX UPLOAD ERROR:", error);
            await sock.sendMessage(m.chat, { text: "⚠️ Catbox Engine Failure. Try again." }, { quoted: m });
        }
    }
};
