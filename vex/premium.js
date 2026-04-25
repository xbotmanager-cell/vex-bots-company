// VEX MINI BOT - VEX: premium
// Nova: Global digital marketplace for high-authority social accounts.
// Dev: Lupin Starnley

const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'premium',
    cyro: 'premium',
    nova: 'Official marketplace for premium TikTok, Instagram, and WhatsApp accounts',

    async execute(m, sock) {
        // 1. 💎 REACT WITH DIAMOND
        await sock.sendMessage(m.key.remoteJid, { react: { text: "💎", key: m.key } });

        const sender = m.sender;
        const myNumber = "255780470905";
        
        // 2. CONSTRUCTING THE MARKETPLACE MESSAGE
        let storeMsg = `╭━━━〔 💎 *VEX PREMIUM STORE* 〕━━━╮\n`;
        storeMsg += `┃ 🌐 *Status:* Global Stock Active\n`;
        storeMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
        storeMsg += `┃ 🧬 *Engine:* Digital Assets V1\n`;
        storeMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        storeMsg += `*🔥 HIGH-AUTHORITY ACCOUNTS*\n`;
        storeMsg += `| ◈ *TikTok:* 1K - 50K+ Followers |\n`;
        storeMsg += `| ◈ *Instagram:* 1K - 100K+ Followers |\n`;
        storeMsg += `| ◈ *WhatsApp:* 1K+ Follower Channels |\n`;
        storeMsg += `| ◈ *Engagement:* High / Organic |\n\n`;

        storeMsg += `*💳 PAYMENT GATEWAYS*\n`;
        storeMsg += `┃ 💠 *Global:* Crypto (USDT/BTC)\n`;
        storeMsg += `┃ 💠 *Local:* Mobile Money (All Networks)\n`;
        storeMsg += `┃ 💠 *Others:* PayPal / Bank Transfer\n\n`;

        storeMsg += `*🛡️ WHY BUY FROM LUPIN?*\n`;
        storeMsg += `1. Instant Ownership Transfer.\n`;
        storeMsg += `2. Secure Escrow Available.\n`;
        storeMsg += `3. 24/7 After-Sales Support.\n\n`;

        storeMsg += `*🚀 HOW TO ORDER?*\n`;
        storeMsg += `Click the link below to chat directly with the Master for pricing and negotiation:\n\n`;
        storeMsg += `👉 https://wa.me/${myNumber}?text=Hello+Master+Lupin,+I+want+to+purchase+a+Premium+Account\n\n`;

        storeMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n`;
        storeMsg += `_VEX MINI BOT: Invest in Growth_`;

        // 3. SEND WITH VEX IMAGE
        const botImageUrl = path.join(__dirname, '../assets/images/owner.png');
        if (fs.existsSync(botImageUrl)) {
            await sock.sendMessage(m.key.remoteJid, { image: { url: botImageUrl }, caption: storeMsg, mentions: [sender] }, { quoted: m });
        } else {
            await sock.sendMessage(m.key.remoteJid, { text: storeMsg, mentions: [sender] }, { quoted: m });
        }
    }
};