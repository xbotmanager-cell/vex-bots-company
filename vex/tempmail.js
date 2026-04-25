// VEX MINI BOT - VEX: tempmail
// Nova: Public temporary email provider linked to Master Listener.
// Dev: Lupin Starnley

const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'tempmail',
    cyro: 'exploit',
    nova: 'Generates 10 public aliases for temporary registration and OTP bypass',

    async execute(m, sock) {
        // 1. 📧 REACT WITH EMAIL SYMBOL
        await sock.sendMessage(m.key.remoteJid, { react: { text: "📧", key: m.key } });

        const sender = m.sender;
        
        // 2. CONFIGURATION (Edit your email and channel link here)
        const masterEmail = "lupinstarnley009@gmail.com"; // Email yako mama
        const channelLink = "https://whatsapp.com/channel/WEKA_LINK_YAKO_HAPA"; // Link ya Channel

        // 3. GENERATING THE 10 ALIASES
        const aliases = [
            "alpha", "beta", "gamma", "delta", "sigma", 
            "omega", "cyber", "lupin", "starnley", "v1h"
        ];

        // 4. CONSTRUCTING THE MESSAGE
        let mailMsg = `╭━━━〔 *VEX: MASTER TEMP-MAIL* 〕━━━╮\n`;
        mailMsg += `┃ 🌟 *Status:* Exploits Ready\n`;
        mailMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
        mailMsg += `┃ 🧬 *Engine:* Temp-Mail System\n`;
        mailMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        mailMsg += `*🛡️ ANONYMOUS ALIASES (10)*\n`;
        aliases.forEach((alias, i) => {
            const emailParts = masterEmail.split('@');
            const fullAlias = `${emailParts[0]}+${alias}@${emailParts[1]}`;
            mailMsg += `| ${i+1} ◈ ${fullAlias} |\n`;
        });

        mailMsg += `\n*📢 INSTRUCTIONS*\n`;
        mailMsg += `1. Copy any email address above.\n`;
        mailMsg += `2. Use it to register on any website/app.\n`;
        mailMsg += `3. Join our Channel to get your **OTP** or **Link**.\n\n`;

        mailMsg += `*🔗 OFFICIAL DATA CHANNEL*\n`;
        mailMsg += `| ◈ ${channelLink} |\n\n`;

        mailMsg += `*⚠️ RULES & SECURITY*\n`;
        mailMsg += `┃ 💠 All data in the channel is **PUBLIC**.\n`;
        mailMsg += `┃ 🛰️ Do not use for banking or personal apps.\n`;
        mailMsg += `┃ 💠 Inbox is cleared every 24 hours.\n`;
        mailMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        mailMsg += `_VEX MINI BOT: Privacy is Power_`;

        // 5. SEND WITH VEX IMAGE
        const botImageUrl = path.join(__dirname, '../assets/images/vex.png');
        if (fs.existsSync(botImageUrl)) {
            await sock.sendMessage(m.key.remoteJid, { image: { url: botImageUrl }, caption: mailMsg, mentions: [sender] }, { quoted: m });
        } else {
            await sock.sendMessage(m.key.remoteJid, { text: mailMsg, mentions: [sender] }, { quoted: m });
        }
    }
};