// VEX MINI BOT - VEX: vv
// Nova: Unlocks and forwards View-Once media (Images/Videos).
// Dev: Lupin Starnley

const { downloadMediaMessage } = require('@whiskeysockets/baileys');

module.exports = {
    vex: 'vv',
    cyro: 'exploit',
    nova: 'Unlocks View-Once media and sends it back as normal media.',

    async execute(m, sock) {
        // 1. SMART CHECK: Kupata Quoted Message kwa usahihi
        let quoted = m.quoted ? m.quoted : m.msg?.contextInfo?.quotedMessage;
        
        if (!quoted) {
            return m.reply("❌ *ERROR:* Please quote a *View-Once* image or video to unlock.");
        }

        // Tutaangalia aina ya message ndani ya quoted
        let viewOnceType = Object.keys(quoted)[0];
        let realMessage;

        // Kama ni viewOnce, inabidi tuchimbe ndani yake
        if (viewOnceType === 'viewOnceMessage' || viewOnceType === 'viewOnceMessageV2') {
            realMessage = quoted[viewOnceType].message;
        } else {
            // Kama sio viewOnce moja kwa moja kwenye root
            realMessage = quoted;
        }

        const mediaType = Object.keys(realMessage)[0];
        const isViewOnce = mediaType === 'imageMessage' || mediaType === 'videoMessage';

        if (!isViewOnce) {
            return m.reply("❌ *ERROR:* This is not a View-Once media.");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔓", key: m.key } });

        try {
            // 2. DOWNLOAD USING BAILEYS HELPER
            // Njia hii ni salama zaidi kulika kutumia downloadContentFromMessage moja kwa moja
            const buffer = await downloadMediaMessage(
                { message: realMessage },
                'buffer',
                {},
                { 
                    logger: console,
                    reuploadRequest: sock.updateMediaMessage 
                }
            );

            // 3. CONSTRUCTING THE DECRYPTED REPORT
            let vvMsg = `╭━━━〔 🔓 *VEX: VIEW-ONCE UNLOCK* 〕━━━╮\n`;
            vvMsg += `┃ 🌟 *Status:* Content Decrypted\n`;
            vvMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            vvMsg += `┃ 🧬 *Engine:* Ghost-Vision V1\n`;
            vvMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            vvMsg += `*📂 DATA RECOVERED*\n`;
            vvMsg += `| ◈ *Type:* ${mediaType === 'imageMessage' ? "Static Image 📸" : "Video Clip 🎥"} |\n`;
            vvMsg += `| ◈ *Origin:* Decrypted Node |\n\n`;

            vvMsg += `*🛡️ ANALYTICS*\n`;
            vvMsg += `┃ 💠 Privacy shield bypassed.\n`;
            vvMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            vvMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            vvMsg += `_VEX MINI BOT: Privacy is an Illusion_`;

            // 4. SEND THE UNLOCKED MEDIA BACK
            if (mediaType === 'imageMessage') {
                await sock.sendMessage(m.key.remoteJid, { image: buffer, caption: vvMsg }, { quoted: m });
            } else if (mediaType === 'videoMessage') {
                await sock.sendMessage(m.key.remoteJid, { video: buffer, caption: vvMsg, mimetype: 'video/mp4' }, { quoted: m });
            }

        } catch (e) {
            console.error("VV Error:", e);
            m.reply("❌ *DECRYPT FAIL:* The media has already expired or encryption keys are missing.");
        }
    }
};
