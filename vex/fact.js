// VEX MINI BOT - VEX: fact
// Nova: Randomized interesting facts generator.
// Dev: Lupin Starnley

module.exports = {
    vex: 'fact',
    cyro: 'games',
    nova: 'Provides random interesting and mind-blowing facts',

    async execute(m, sock) {
        await sock.sendMessage(m.key.remoteJid, { react: { text: "💡", key: m.key } });

        const facts = [
            "Honey never spoils. Archaeologists have found edible honey in ancient Egyptian tombs.",
            "Octopuses have three hearts.",
            "A day on Venus is longer than a year on Venus.",
            "Bananas are berries, but strawberries are not.",
            "The Eiffel Tower can be 15 cm taller during the summer due to thermal expansion."
        ];

        const randomFact = facts[Math.floor(Math.random() * facts.length)];
        const sender = m.sender;

        let factMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
        factMsg += `┃ 🌟 *Status:* Fact Found\n`;
        factMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
        factMsg += `┃ 🧬 *Engine:* Trivia Processor\n`;
        factMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        
        factMsg += `Hello @${sender.split('@')[0]}, did you know?\n\n`;
        factMsg += `✨ *CYRO: GAMES* ✨\n`;
        factMsg += `| ◈ *Fact:* ${randomFact} |\n\n`;
        
        factMsg += `_VEX MINI BOT: Knowledge is Power_`;

        await sock.sendMessage(m.key.remoteJid, { text: factMsg, mentions: [sender] }, { quoted: m });
    }
};