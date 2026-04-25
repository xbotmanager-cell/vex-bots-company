const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'gay',
    cyro: 'games',
    nova: 'Calculates the friendship/vibe percentage of a user',

    async execute(m, sock) {
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🏳️‍🌈", key: m.key } });
        const percent = Math.floor(Math.random() * 101);
        const sender = m.sender;
        
        let msg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
        msg += `┃ 🌟 *Status:* Scanned\n`;
        msg += `┃ 👤 *Master:* Lupin Starnley\n`;
        msg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        msg += `Hello @${sender.split('@')[0]}, the meter says:\n\n`;
        msg += `✨ *CYRO: GAMES* ✨\n`;
        msg += `| ◈ *Meter:* ${percent}% |\n\n`;
        msg += `_VEX MINI BOT: Fun Analytics_`;

        const img = path.join(__dirname, '../assets/images/vex.png');
        if (fs.existsSync(img)) await sock.sendMessage(m.key.remoteJid, { image: { url: img }, caption: msg, mentions: [sender] }, { quoted: m });
        else await sock.sendMessage(m.key.remoteJid, { text: msg, mentions: [sender] }, { quoted: m });
    }
};