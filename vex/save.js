// VEX MINI BOT - VEX: save
// Nova: Forwards status media or quoted media to the user.
// Dev: Lupin Starnley

module.exports = {
    vex: 'save',
    cyro: 'profile',
    nova: 'Saves/Forwards status media or any quoted image/video.',

    async execute(m, sock) {
        // 1. SMART CHECK: Lazima amequote kitu (Status au Media)
        const quoted = m.quoted ? m.quoted : null;

        if (!quoted) {
            return m.reply("❌ *ERROR:* Please quote a status or any media (image/video) to save it.");
        }

        // 2. IDENTIFY MEDIA TYPE
        const mime = (quoted.msg || quoted).mimetype || '';
        const isImage = /image/.test(mime);
        const isVideo = /video/.test(mime);

        if (!isImage && !isVideo) {
            return m.reply("❌ *ERROR:* You can only save images or videos.");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "💾", key: m.key } });

        try {
            // 3. DOWNLOAD THE TARGET MEDIA
            const buffer = await quoted.download();

            // 4. CONSTRUCTING THE REPORT
            let saveMsg = `╭━━━〔 💾 *VEX: STATUS-SAVER* 〕━━━╮\n`;
            saveMsg += `┃ 🌟 *Status:* Media Captured\n`;
            saveMsg += `┃ 👤 *Owner:* Verified Host\n`;
            saveMsg += `┃ 🧬 *Engine:* Media-Grab V1\n`;
            saveMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            saveMsg += `*📂 DATA RECOVERED*\n`;
            saveMsg += `| ◈ *Format:* ${isImage ? "Photo 📸" : "Video 🎥"} |\n`;
            saveMsg += `| ◈ *Action:* Forwarded to Chat |\n\n`;

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
            m.reply("❌ *SAVE FAIL:* The media could not be retrieved. It might have expired.");
        }
    }
};