// VEX MINI BOT - VEX: tod
// Nova: Truth or Dare game engine.
// Dev: Lupin Starnley

module.exports = {
    vex: 'tod',
    cyro: 'games',
    nova: 'Classic Truth or Dare game with randomized challenges',

    async execute(m, sock) {
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🎲", key: m.key } });

        const truths = [
            "What is your biggest secret?",
            "Who is your secret crush?",
            "What is the most embarrassing thing you've ever done?",
            "Have you ever lied to your best friend?",
            "What is your biggest fear?"
        ];

        const dares = [
            "Send a voice note singing your favorite song.",
            "Text your crush and say 'I love you'.",
            "Send a screenshot of your search history.",
            "Type using only your nose for the next 2 minutes.",
            "Send the 5th photo from your gallery."
        ];

        const type = Math.random() > 0.5 ? 'TRUTH' : 'DARE';
        const challenge = type === 'TRUTH' 
            ? truths[Math.floor(Math.random() * truths.length)] 
            : dares[Math.floor(Math.random() * dares.length)];

        const sender = m.sender;
        let todMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
        todMsg += `┃ 🌟 *Status:* Game Active\n`;
        todMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
        todMsg += `┃ 🧬 *Engine:* TOD Generator\n`;
        todMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        
        todMsg += `Hello @${sender.split('@')[0]}, your challenge is ready:\n\n`;
        todMsg += `✨ *CYRO: GAMES* ✨\n`;
        todMsg += `| ◈ *Type:* ${type} |\n`;
        todMsg += `| ◈ *Challenge:* ${challenge} |\n\n`;
        
        todMsg += `_VEX MINI BOT: Fun & Interaction_`;

        await sock.sendMessage(m.key.remoteJid, { text: todMsg, mentions: [sender] }, { quoted: m });
    }
};