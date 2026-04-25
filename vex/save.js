// VEX MINI BOT - VEX: save
// Nova: Forwards status media or quoted media to the user.
// Dev: Lupin Starnley

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    vex: 'save',
    cyro: 'profile',
    nova: 'Saves/Forwards status media or any quoted image/video.',

    async execute(m, sock) {
        // 1. SMART CHECK: Lazima amequote kitu
        const quoted = m.msg?.contextInfo?.quotedMessage || m.quoted;

        if (!quoted) {
            return m.reply("❌ *ERROR:* Please quote a status or any media (image/video) to save it.");
        }

        // Kupata aina ya message (Image, Video, n.k.)
        const mimeType = Object.keys(quoted)[0];
        const messageContent = quoted[mimeType];

        const isImage = mimeType === 'imageMessage';
        const isVideo = mimeType === 'videoMessage';

        if (!isImage && !isVideo) {
            return m.reply("❌ *ERROR:* You can only save images or videos.");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "💾", key: m.key } });

        try {
            // 3. DOWNLOAD THE TARGET MEDIA
            // Tunatambua kama ni image au video ili tuchague downloader sahihi
            const stream = await downloadContentFromMessage(messageContent, isImage ? 'image' : 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 4. CONSTRUCTING THE REPORT
            let saveMsg = `╭━━━〔 💾 *VEX: STATUS-SAVER* 〕━━━╮\n`;
            saveMsg += `┃ 🌟 *Status:* Media Captured\n`;
            saveMsg += `┃ 👤 *Owner:* ${m.quoted.sender.split('@')[0]}\n`;
            saveMsg += `┃ 🧬 *Engine:* Media-Grab V1\n`;
            saveMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            saveMsg += `*📂 DATA RECOVERED*\n`;
            saveMsg += `| ◈ *Format:* ${isImage ? "Photo 📸" : "Video 🎥"} |\n`;
            saveMsg += `| ◈ *Origin:* ${m.quoted.chat === 'status@broadcast' ? 'WhatsApp Status' : 'Direct Chat'} |\n\n`;

            saveMsg += `*🛡️ ANALYTICS*\n`;
            saveMsg += `┃ 💠 Decrypted and delivered.\n`;
            saveMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            saveMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            saveMsg += `_VEX MINI BOT: Vision Beyond Limits_`;

            // 5. SEND THE MEDIA (Unlocked)
            if (isImage) {
                await sock.sendMessage(m.key.remoteJid, { image: buffer, caption: saveMsg }, { quoted: m });
            } else if (isVideo) {
                await sock.sendMessage(m.key.remoteJid, { video: buffer, caption: saveMsg, mimetype: 'video/mp4' }, { quoted: m });
            }

        } catch (e) {
            console.error("Save Error:", e);
            m.reply("❌ *SAVE FAIL:* The media could not be retrieved. Inabidi udownload `@whiskeysockets/baileys` kwanza kama haipo.");
        }
    }
};
