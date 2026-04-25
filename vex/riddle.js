// VEX MINI BOT - VEX: riddle
// Nova: Brain-teasing riddle generator.
// Dev: Lupin Starnley

module.exports = {
    vex: 'riddle',
    cyro: 'games',
    nova: 'Provides challenging riddles to sharpen the mind',

    async execute(m, sock) {
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🧩", key: m.key } });

        const riddles = [
            { q: "What has to be broken before you can use it?", a: "An egg" },
            { q: "I’m tall when I’m young, and I’m short when I’m old. What am I?", a: "A candle" },
            { q: "What is full of holes but still holds water?", a: "A sponge" },
            { q: "What gets wet while drying?", a: "A towel" },
            { q: "The more of this there is, the less you see. What is it?", a: "Darkness" }
        ];

        const item = riddles[Math.floor(Math.random() * riddles.length)];
        const sender = m.sender;

        let riddleMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
        riddleMsg += `┃ 🌟 *Status:* Enigma Active\n`;
        riddleMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
        riddleMsg += `┃ 🧬 *Engine:* Riddle Processor\n`;
        riddleMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        
        riddleMsg += `Hello @${sender.split('@')[0]}, can you solve this?\n\n`;
        riddleMsg += `✨ *CYRO: GAMES* ✨\n`;
        riddleMsg += `| ◈ *Question:* ${item.q} |\n\n`;
        
        riddleMsg += `*🗝️ ANSWER REVEAL*\n`;
        riddleMsg += `┃ 💠 *Solution:* ||${item.a}||\n`;
        riddleMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        riddleMsg += `_VEX MINI BOT: Think Beyond Limits_`;

        await sock.sendMessage(m.key.remoteJid, { text: riddleMsg, mentions: [sender] }, { quoted: m });
    }
};