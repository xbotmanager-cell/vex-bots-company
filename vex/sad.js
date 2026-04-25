// VEX MINI BOT - VEX: sad
// Nova: Dynamic emoji editing sequence (Sad/Deep emotional state).
// Dev: Lupin Starnley

module.exports = {
    vex: 'sad',
    cyro: 'system', 
    nova: 'Displays a sequence of 15 deep sad emojis via message editing',

    async execute(m, sock) {
        // 1. ⛈️ DEEP SAD EMOJIS ARRAY (15 Real Sad Emojis)
        const sadEmojis = [
            "😔", "😟", "☹️", "🙁", "😫", 
            "😰", "🥀", "💧", "💦", "⛈️", 
            "💔", "📉", "⛓️", "🌫️", "🖤"
        ];

        try {
            // 2. SEND INITIAL MESSAGE (The first emoji)
            let { key } = await sock.sendMessage(m.key.remoteJid, { text: sadEmojis[0] }, { quoted: m });

            // 3. EDITING LOOP (Sequence of remaining emojis)
            for (let i = 1; i < sadEmojis.length; i++) {
                // Wait for 2 seconds (2000ms)
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Edit the existing message
                await sock.sendMessage(m.key.remoteJid, { 
                    text: sadEmojis[i], 
                    edit: key 
                });
            }

        } catch (e) {
            console.error("VEX Sad Error:", e);
        }
    }
};