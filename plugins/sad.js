module.exports = {
    command: "sad",
    alias: ["huzuni", "cry", "pained"],
    category: "mood",
    description: "Animated sad faces and broken hearts",

    async execute(m, sock) {
        // Orodha ya emoji 15 za huzuni (Faces & Broken Hearts)
        const sadEmojis = [
            "😔", "😟", "☹️", "🙁", "😕", 
            "😫", "😩", "😢", "😭", "😤", 
            "😮‍💨", "😰", "💔", "🥀", "🖤"
        ];

        try {
            // 1. Tuma emoji ya kwanza
            let { key } = await sock.sendMessage(m.chat, { text: sadEmojis[0] }, { quoted: m });

            // 2. Anza ku-edit mfululizo kila sekunde 2
            for (let i = 1; i < sadEmojis.length; i++) {
                // Delay ya sekunde 2
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Badilisha meseji ya awali kwenda emoji mpya
                await sock.sendMessage(m.chat, { 
                    text: sadEmojis[i], 
                    edit: key 
                });
            }
        } catch (error) {
            console.error("Sad Mood Error:", error);
        }
    }
};
