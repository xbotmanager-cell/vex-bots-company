// VEX MINI BOT - VEX: advice
// Nova: Strategic life and success advice generator.
// Dev: Lupin Starnley

module.exports = {
    vex: 'advice',
    cyro: 'games',
    nova: 'Generates motivational and tactical life advice',

    async execute(m, sock) {
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🍃", key: m.key } });

        const advices = [
            "Don't decrease the goal. Increase the effort.",
            "Work in silence, let your success be your noise.",
            "Your time is limited, so don't waste it living someone else's life.",
            "If you want to be powerful, educate yourself.",
            "Don't be afraid to start over. It's a chance to build something better."
        ];

        const randomAdvice = advices[Math.floor(Math.random() * advices.length)];
        const sender = m.sender;

        let adviceMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
        adviceMsg += `┃ 🌟 *Status:* Wisdom Sent\n`;
        adviceMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
        adviceMsg += `┃ 🧬 *Engine:* Life Architect\n`;
        adviceMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        
        adviceMsg += `Hello @${sender.split('@')[0]}, a word for you:\n\n`;
        adviceMsg += `✨ *CYRO: GAMES* ✨\n`;
        adviceMsg += `| ◈ *Advice:* ${randomAdvice} |\n\n`;
        
        adviceMsg += `*📊 INSIGHT*\n`;
        adviceMsg += `┃ 💠 *Impact:* High Reflection\n`;
        adviceMsg += `┃ 🛰️ *Level:* Strategic Wisdom\n`;
        adviceMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        adviceMsg += `_VEX MINI BOT: Building Better Versions_`;

        await sock.sendMessage(m.key.remoteJid, { text: adviceMsg, mentions: [sender] }, { quoted: m });
    }
};