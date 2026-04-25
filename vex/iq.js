// VEX MINI BOT - VEX: iq
// Nova: Randomized IQ analysis engine.
// Dev: Lupin Starnley

const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'iq',
    cyro: 'games',
    nova: 'Analyzes user intelligence levels with a randomized neural engine',

    async execute(m, sock) {
        // Fix: Changed reaction to a valid emoji 🧠
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🧠", key: m.key } });

        const iqValue = Math.floor(Math.random() * (160 - 50 + 1)) + 50;
        let status;
        if (iqValue >= 130) status = "Genius / High Intelligence";
        else if (iqValue >= 110) status = "Above Average";
        else if (iqValue >= 90) status = "Average / Normal";
        else status = "Below Average";

        const sender = m.sender || m.key.participant || m.key.remoteJid;
        
        // Formatting & Emoji Restoration
        let iqMsg = `💠 ═══ *VEX MINI BOT* ═══ 💠\n`;
        iqMsg += `📡 *Status:* Analysis Complete\n`;
        iqMsg += `👤 *Master:* Lupin Starnley\n`;
        iqMsg += `⚙️ *Engine:* IQ Neural Scanner\n`;
        iqMsg += `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n`;
        
        iqMsg += `Hello @${sender.split('@')[0]}, scan results are in:\n\n`;
        iqMsg += `🎮 *CYRO: GAMES* 🎮\n`;
        iqMsg += `| 📊 *IQ Score:* ${iqValue} |\n`;
        iqMsg += `| 🧩 *Category:* ${status} |\n\n`;
        
        iqMsg += `*⚡ SCANNER INFO*\n`;
        iqMsg += `🎯 *Accuracy:* 99.8% Neural Sync\n`;
        iqMsg += `🧠 *Brain-Wave:* Optimized\n`;
        iqMsg += `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n`;
        iqMsg += `_VEX MINI BOT: Decoding Brain Power_`;

        // Logic for image check and sending message
        const botImageUrl = path.join(__dirname, '../assets/images/vex.png');
        
        if (fs.existsSync(botImageUrl)) {
            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: botImageUrl }, 
                caption: iqMsg, 
                mentions: [sender] 
            }, { quoted: m });
        } else {
            await sock.sendMessage(m.key.remoteJid, { 
                text: iqMsg, 
                mentions: [sender] 
            }, { quoted: m });
        }
    }
};