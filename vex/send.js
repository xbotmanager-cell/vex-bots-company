// VEX MINI BOT - VEX: send
// Nova: Deploys media or text directly to WhatsApp Status.
// Dev: Lupin Starnley

module.exports = {
    vex: 'send',
    cyro: 'profile',
    nova: 'Uploads quoted media or text directly to your status.',

    async execute(m, sock) {
        // 1. SECURITY CHECK: Host Only
        if (!m.fromMe) return m.reply("⚠️ *ACCESS DENIED:* Only the Host can deploy status updates.");

        const args = m.text.trim().split(/ +/).slice(1);
        const textContent = args.join(' ');
        const quoted = m.quoted ? m.quoted : null;

        await sock.sendMessage(m.key.remoteJid, { react: { text: "📤", key: m.key } });

        try {
            if (quoted) {
                // A: UPLOAD QUOTED MEDIA (Image/Video)
                const mime = (quoted.msg || quoted).mimetype || '';
                const buffer = await quoted.download();
                
                let mediaObj = {};
                if (/image/.test(mime)) {
                    mediaObj = { image: buffer, caption: textContent };
                } else if (/video/.test(mime)) {
                    mediaObj = { video: buffer, caption: textContent };
                } else {
                    return m.reply("❌ *FORMAT ERROR:* Only images and videos can be uploaded to status.");
                }

                // Deploying to Status (JID for Status is 'status@broadcast')
                await sock.sendMessage('status@broadcast', mediaObj, {
                    backgroundColor: '#000000',
                    font: 1,
                    statusJidList: Object.keys(sock.store?.contacts || {}) // Optional: Tries to reach contacts
                });

            } else if (textContent) {
                // B: UPLOAD TEXT STATUS
                await sock.sendMessage('status@broadcast', {
                    text: textContent
                }, {
                    backgroundColor: '#07051a', // VEX Theme Dark Blue
                    font: 4 // Cyberpunk Style Font
                });
            } else {
                return m.reply("❌ *USAGE ERROR:* Reply to media with `.send [caption]` or type `.send [text]`");
            }

            // SUCCESS REPORT
            let statusReport = `╭━━━〔 📤 *VEX: STATUS-DEPLOY* 〕━━━╮\n`;
            statusReport += `┃ 🌟 *Status:* Successfully Uploaded\n`;
            statusReport += `┃ 👤 *Owner:* Verified Host\n`;
            statusReport += `┃ 🧬 *Engine:* Status-Sync V1\n`;
            statusReport += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            statusReport += `_VEX MINI BOT: Identity Shared._`;

            await sock.sendMessage(m.key.remoteJid, { text: statusReport }, { quoted: m });

        } catch (e) {
            console.error("Send Status Error:", e);
            m.reply("❌ *UPLOAD FAIL:* Critical error in status deployment.");
        }
    }
};