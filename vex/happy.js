// VEX MINI BOT - VEX: happy
// Nova: Dynamic emoji editing sequence (Happy state).
// Dev: Lupin Starnley

module.exports = {
    vex: 'happy',
    cyro: 'system', 
    nova: 'Displays a sequence of 15 rare happy/celebration emojis via message editing',

    async execute(m, sock) {
        // 1. ✨ RARE HAPPY/CELEBRATION EMOJIS ARRAY (15 Unique Emojis)
        const happyEmojis = [
            "✨", "💎", "🎡", "🍬", "🌈", 
            "🥂", "🎖️", "🛸", "🐲", "🎈", 
            "🔥", "⚡", "🏆", "👑", "💠"
        ];

        try {
            // 2. SEND INITIAL MESSAGE (The first emoji)
            let { key } = await sock.sendMessage(m.key.remoteJid, { text: happyEmojis[0] }, { quoted: m });

            // 3. EDITING LOOP (Sequence of remaining emojis)
            for (let i = 1; i < happyEmojis.length; i++) {
                // Wait for 2 seconds (2000ms)
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Edit the existing message
                await sock.sendMessage(m.key.remoteJid, { 
                    text: happyEmojis[i], 
                    edit: key 
                });
            }

        } catch (e) {
            console.error("VEX Happy Error:", e);
        }
    }
};