// VEX MINI BOT - VEX: ship
// Nova: Love compatibility and relationship matching engine.
// Dev: Lupin Starnley

const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'ship',
    cyro: 'games',
    nova: 'Calculates love compatibility percentage between two users',

    async execute(m, sock) {
        const mentioned = m.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
        
        if (mentioned.length === 0) {
            return await sock.sendMessage(m.key.remoteJid, { text: "*⚠️ VEX-ERROR:* Please tag/mention a person to ship with!" }, { quoted: m });
        }

        // Fix: Changed reaction to a valid emoji ❤️
        await sock.sendMessage(m.key.remoteJid, { react: { text: "❤️", key: m.key } });

        const lovePercent = Math.floor(Math.random() * 101);
        let comment;
        if (lovePercent >= 90) comment = "Perfect Match! 💖";
        else if (lovePercent >= 70) comment = "Strong Connection 💕";
        else if (lovePercent >= 50) comment = "Potential Relationship 💓";
        else if (lovePercent >= 30) comment = "Just Friends 🤝";
        else comment = "Total Stranger Zone ❄️";

        const sender = m.sender || m.key.participant || m.key.remoteJid;
        const target = mentioned[0];

        // Formatting & Emoji Restoration
        let shipMsg = `💠 ═══ *VEX MINI BOT* ═══ 💠\n`;
        shipMsg += `📡 *Status:* Matching...\n`;
        shipMsg += `👤 *Master:* Lupin Starnley\n`;
        shipMsg += `⚙️ *Engine:* Love Synchronizer\n`;
        shipMsg += `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n`;
        
        shipMsg += `Match report for @${sender.split('@')[0]} and @${target.split('@')[0]}:\n\n`;
        shipMsg += `🎮 *CYRO: GAMES* 🎮\n`;
        shipMsg += `| 📊 *Compatibility:* ${lovePercent}% |\n`;
        shipMsg += `| 🧩 *Verdict:* ${comment} |\n\n`;
        
        shipMsg += `*⚡ RELATIONSHIP INFO*\n`;
        shipMsg += `🎯 *Sync:* Quantum Heartbeat\n`;
        shipMsg += `💓 *Stability:* ${lovePercent > 50 ? 'High' : 'Low'}\n`;
        shipMsg += `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n`;
        shipMsg += `_VEX MINI BOT: Mapping Emotions_`;

        const botImageUrl = path.join(__dirname, '../assets/images/vex.png');
        
        if (fs.existsSync(botImageUrl)) {
            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: botImageUrl }, 
                caption: shipMsg, 
                mentions: [sender, target] 
            }, { quoted: m });
        } else {
            await sock.sendMessage(m.key.remoteJid, { 
                text: shipMsg, 
                mentions: [sender, target] 
            }, { quoted: m });
        }
    }
};