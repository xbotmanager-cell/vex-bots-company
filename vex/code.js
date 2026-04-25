// VEX MINI BOT - VEX: code
// Nova: Randomized match code generator for gamers.
// Dev: Lupin Starnley

module.exports = {
    vex: 'code',
    cyro: 'games',
    nova: 'Generates a random match code from a pre-defined list of 100 codes',

    async execute(m, sock) {
        // 1. 🌹 UNIQUE REACTION
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🌹", key: m.key } });

        const args = m.text.trim().split(/ +/).slice(1);
        const gameName = args.join(' ') || 'Match';

        // 2. DATABASE OF 100 PREPARED CODES
        const codes = [
            "VEX-01", "VEX-02", "LUPIN-10", "STAR-99", "BOSI-22", "HEX-44", "ZED-77", "TOP-01", "ACE-11", "MAX-55",
            "VEX-03", "VEX-04", "LUPIN-11", "STAR-88", "BOSI-33", "HEX-55", "ZED-88", "TOP-02", "ACE-22", "MAX-66",
            "VEX-05", "VEX-06", "LUPIN-12", "STAR-77", "BOSI-44", "HEX-66", "ZED-99", "TOP-03", "ACE-33", "MAX-77",
            "VEX-07", "VEX-08", "LUPIN-13", "STAR-66", "BOSI-55", "HEX-77", "ZED-00", "TOP-04", "ACE-44", "MAX-88",
            "VEX-09", "VEX-10", "LUPIN-14", "STAR-55", "BOSI-66", "HEX-88", "ZED-11", "TOP-05", "ACE-55", "MAX-99",
            "CYRO-01", "CYRO-02", "KING-10", "SKY-99", "DARK-22", "NEO-44", "RARE-77", "WIN-01", "PRO-11", "GOD-55",
            "CYRO-03", "CYRO-04", "KING-11", "SKY-88", "DARK-33", "NEO-55", "RARE-88", "WIN-02", "PRO-22", "GOD-66",
            "CYRO-05", "CYRO-06", "KING-12", "SKY-77", "DARK-44", "NEO-66", "RARE-99", "WIN-03", "PRO-33", "GOD-77",
            "CYRO-07", "CYRO-08", "KING-13", "SKY-66", "DARK-55", "NEO-77", "RARE-00", "WIN-04", "PRO-44", "GOD-88",
            "CYRO-09", "CYRO-10", "KING-14", "SKY-55", "DARK-66", "NEO-88", "RARE-11", "WIN-05", "PRO-55", "GOD-99"
        ];

        const randomCode = codes[Math.floor(Math.random() * codes.length)];
        const sender = m.sender;

        // 3. FORMATTING THE MESSAGE (Quantum-Flow)
        let codeMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
        codeMsg += `┃ 🌟 *Status:* Generated\n`;
        codeMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
        codeMsg += `┃ 🧬 *Engine:* Match Code System\n`;
        codeMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        
        codeMsg += `Hello @${sender.split('@')[0]}, your game code is ready!\n\n`;
        codeMsg += `✨ *CYRO: GAMES* ✨\n`;
        codeMsg += `| ◈ *Game:* ${gameName.toUpperCase()} |\n`;
        codeMsg += `| ◈ *Code:* ${randomCode} |\n\n`;
        
        codeMsg += `*🕹️ HOW TO USE*\n`;
        codeMsg += `┃ 💠 Share this code with your opponent.\n`;
        codeMsg += `┃ 🛰️ Enter the code in Private Match.\n`;
        codeMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        codeMsg += `_VEX MINI BOT: Play with Style_`;

        await sock.sendMessage(m.key.remoteJid, { text: codeMsg, mentions: [sender] }, { quoted: m });
    }
};