const { downloadContentFromMessage, getContentType } = require("@whiskeysockets/baileys");
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { writeFile } = require('fs/promises');
const translate = require('google-translate-api-x');

module.exports = {
    command: "tourl",
    alias: ["upload", "catbox", "url"],
    category: "tools",
    description: "Upload any WhatsApp media to Catbox.moe and get URL",

    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        const modes = {
            harsh: {
                msg: "𝕳𝖊𝖗𝖊 𝖎𝖘 𝖞𝖔𝖚𝖗 𝖕𝖆𝖙𝖍𝖊𝖙𝖎𝖈 𝖑𝖎𝖓𝖐. 𝕯𝖔𝖓'𝖙 𝖜𝖆𝖘𝖙𝖊 𝖒𝖞 𝖙𝖎𝖒𝖊. 🔗⚡",
                react: "🔥",
                err: "💢 𝕽𝖊𝖕𝖑𝖞 𝖙𝖔 𝖆 𝖋𝖎𝖑𝖊 𝖞𝖔𝖚 𝖋𝖔𝖑! 🤬",
                uploading: "𝕱𝖔𝖗𝖌𝖎𝖓𝖌 𝖞𝖔𝖚𝖗 𝖑𝖎𝖓𝖐... ⏳"
            },
            normal: {
                msg: "File uploaded successfully ✅\n\n*URL:*",
                react: "🔗",
                err: "❌ Please reply to an Image, Video, Audio, Document or Sticker.",
                uploading: "Uploading your file to Catbox... ⏳"
            },
            girl: {
                msg: "𝒽𝑒𝓇𝑒'𝓈 𝓎𝑜𝓊𝓇 𝓁𝒾𝓃𝓀 𝓂𝓎 𝓁𝑜𝓋𝑒𝓁𝓎 𝐿𝓊𝓅𝒾𝓃... 🏹✨💎\n\n*URL:*",
                react: "💖",
                err: "🌸 𝑜𝑜𝓅𝓈𝒾𝑒! 𝓇𝑒𝓅𝓁𝓎 𝓉𝑜 𝒶 𝒻𝒾𝓁𝑒 𝒻𝒾𝓇𝓈𝓉, 𝒷𝒶𝒷𝑒~ 🍭",
                uploading: "𝒰𝓅𝓁𝑜𝒶𝒹𝒾𝓃𝑔 𝒻𝑜𝓇 𝓎𝑜𝓊... ✨"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted) return m.reply(current.err);

            const type = getContentType(quoted);
            const media = quoted[type];

            // Types zote zinazoungwa mkono
            const supportedTypes = [
                'imageMessage', 'videoMessage', 'audioMessage',
                'documentMessage', 'stickerMessage'
            ];

            if (!type ||!supportedTypes.includes(type)) {
                return m.reply(current.err);
            }

            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            const uploadingMsg = await m.reply(current.uploading);

            // 1. Download media
            let mediaType = type.replace('Message', '');
            if (mediaType === 'sticker') mediaType = 'image'; // Sticker ni image

            const stream = await downloadContentFromMessage(media, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 2. Tengeneza file la temp
            const tmpDir = './tmp';
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

            const ext = media.mimetype?.split('/')[1]?.split(';')[0] || 'bin';
            const fileName = `upload_${Date.now()}.${ext}`;
            const filePath = path.join(tmpDir, fileName);
            await writeFile(filePath, buffer);

            // 3. Upload Catbox.moe
            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', fs.createReadStream(filePath));

            const { data: url } = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: form.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            // 4. Futaa file la temp
            fs.unlinkSync(filePath);

            // 5. Translate msg
            let finalMsg = current.msg;
            if (lang!== 'en') {
                try {
                    const res = await translate(finalMsg, { to: lang });
                    finalMsg = res.text;
                } catch {}
            }

            // 6. Delete "uploading" message na tuma URL
            await sock.sendMessage(m.chat, { delete: uploadingMsg.key });
            await m.reply(`${finalMsg} ${url}`);

        } catch (error) {
            console.error("Tourl Error:", error);
            await sock.sendMessage(m.chat, { react: { text: "🚫", key: m.key } });
            m.reply("❌ Failed to upload. File too large or Catbox down.");
        }
    }
};
