// VEX MINI BOT - VEX: confused
// Nova: Dynamic emoji editing sequence (Confused state).
// Dev: Lupin Starnley

module.exports = {
    vex: 'confused',
    cyro: 'system', // I've placed this in system as it's a bot reaction behavior
    nova: 'Displays a sequence of 15 rare confused emojis via message editing',

    async execute(m, sock) {
        // 1. 🌀 RARE CONFUSED EMOJIS ARRAY (15 Unique Emojis)
        const confusedEmojis = [
            "🌀", "🧩", "🌚", "👽", "🍄", 
            "🌓", "🪐", "🎭", "🕯️", "🦧", 
            "🛹", "🗿", "🕳️", "🧨", "🔮"
        ];

        try {
            // 2. SEND INITIAL MESSAGE (The first emoji)
            let { key } = await sock.sendMessage(m.key.remoteJid, { text: confusedEmojis[0] }, { quoted: m });

            // 3. EDITING LOOP (Sequence of remaining emojis)
            for (let i = 1; i < confusedEmojis.length; i++) {
                // Wait for 2 seconds (2000ms)
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Edit the existing message
                await sock.sendMessage(m.key.remoteJid, { 
                    text: confusedEmojis[i], 
                    edit: key 
                });
            }

        } catch (e) {
            console.error("VEX Confused Error:", e);
        }
    }
};