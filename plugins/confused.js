module.exports = {
    command: "confused",
    alias: ["shangaa", "sielevi", "huh"],
    category: "mood",
    description: "Animated confused faces and thinking symbols",

    async execute(m, sock) {
        // Orodha ya emoji 15 za mkanganyiko (Confused Faces & Thinking)
        const confusedEmojis = [
            "🤔", "🤨", "🧐", "😐", "😑", 
            "😶", "🙄", "😯", "😮", "😲", 
            "🤯", "😵‍💫", "❓", "❔", "🌀"
        ];

        try {
            // 1. Tuma emoji ya kwanza ya kuanza kufikiri
            let { key } = await sock.sendMessage(m.chat, { text: confusedEmojis[0] }, { quoted: m });

            // 2. Anza ku-edit kuelekea mkanganyiko mkuu kila sekunde 2
            for (let i = 1; i < confusedEmojis.length; i++) {
                // Delay ya sekunde 2 (2000ms)
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Edit meseji kwenda hatua inayofuata ya kuchanganyikiwa
                await sock.sendMessage(m.chat, { 
                    text: confusedEmojis[i], 
                    edit: key 
                });
            }
        } catch (error) {
            console.error("Confused Mood Error:", error);
        }
    }
};
