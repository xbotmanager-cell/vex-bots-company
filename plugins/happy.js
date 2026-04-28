module.exports = {
    command: "happy",
    alias: ["furaha", "smile"],
    category: "mood",
    description: "Animated happy faces and hearts",

    async execute(m, sock) {
        // Orodha ya emoji 15 za furaha na mahaba (Faces & Hearts pekee)
        const happyEmojis = [
            "😊", "😄", "😁", "😆", "😅", 
            "🥰", "😍", "🤩", "😇", "🥳", 
            "😏", "😋", "💖", "❤️", "✨"
        ];

        try {
            // 1. Tuma emoji ya kwanza kabisa
            let { key } = await sock.sendMessage(m.chat, { text: happyEmojis[0] }, { quoted: m });

            // 2. Anza ku-edit kwa loop kila baada ya sekunde 2
            for (let i = 1; i < happyEmojis.length; i++) {
                // Delay ya sekunde 2 (2000ms)
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Edit meseji iliyopita kwenda emoji inayofuata
                await sock.sendMessage(m.chat, { 
                    text: happyEmojis[i], 
                    edit: key 
                });
            }
        } catch (error) {
            console.error("Happy Mood Error:", error);
        }
    }
};
