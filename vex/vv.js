// VEX MINI BOT - VEX: vv
// Nova: Unlocks and forwards View-Once media (Images/Videos).
// Dev: Lupin Starnley

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    vex: 'vv',
    cyro: 'exploit',
    nova: 'Unlocks View-Once media and sends it back as normal media.',

    async execute(m, sock) {
        // 1. SMART CHECK: Angalia kama amequote View-Once message
        const quoted = m.quoted ? m.quoted : m;
        const msgType = Object.keys(quoted.message || {})[0];
        
        // Target specifically viewOnce messages
        const isViewOnce = msgType === 'viewOnceMessage' || msgType === 'viewOnceMessageV2';

        if (!isViewOnce) {
            return m.reply("❌ *ERROR:* Please quote a *View-Once* image or video to unlock.");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔓", key: m.key } });

        try {
            // 2. EXTRACT THE HIDDEN CONTENT
            const viewOnceContent = quoted.message[msgType].message;
            const mediaType = Object.keys(viewOnceContent)[0]; // imageMessage or videoMessage
            const media = viewOnceContent[mediaType];

            // 3. DOWNLOAD THE SECRET DATA
            const stream = await downloadContentFromMessage(media, mediaType.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 4. CONSTRUCTING THE DECRYPTED REPORT
            let vvMsg = `╭━━━〔 🔓 *VEX: VIEW-ONCE UNLOCK* 〕━━━╮\n`;
            vvMsg += `┃ 🌟 *Status:* Content Decrypted\n`;
            vvMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            vvMsg += `┃ 🧬 *Engine:* Ghost-Vision V1\n`;
            vvMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            vvMsg += `*📂 DATA RECOVERED*\n`;
            vvMsg += `| ◈ *Type:* ${mediaType === 'imageMessage' ? "Static Image 📸" : "Video Clip 🎥"} |\n`;
            vvMsg += `| ◈ *Source:* Hidden Payload |\n\n`;

            vvMsg += `*🛡️ ANALYTICS*\n`;
            vvMsg += `┃ 💠 Privacy shield bypassed.\n`;
            vvMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            vvMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            vvMsg += `_VEX MINI BOT: Privacy is an Illusion_`;

            // 5. SEND THE UNLOCKED MEDIA BACK
            if (mediaType === 'imageMessage') {
                await sock.sendMessage(m.key.remoteJid, { image: buffer, caption: vvMsg }, { quoted: m });
            } else if (mediaType === 'videoMessage') {
                await sock.sendMessage(m.key.remoteJid, { video: buffer, caption: vvMsg }, { quoted: m });
            }

        } catch (e) {
            console.error("VV Error:", e);
            m.reply("❌ *DECRYPT FAIL:* The media has already expired or is corrupted.");
        }
    }
};