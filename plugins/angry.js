module.exports = {
    command: "angry",
    alias: ["kasirika", "hasira", "mad"],
    category: "mood",
    description: "Animated angry faces and rage symbols",

    async execute(m, sock) {
        // Orodha ya emoji 15 za hasira kali (Angry Faces & Rage Symbols)
        const angryEmojis = [
            "😠", "😡", "🤬", "😤", "👿", 
            "😫", "👺", "🌋", "💢", "🔥", 
            "🖕", "👊", "⚡", "🌩️", "💀"
        ];

        try {
            // 1. Tuma emoji ya kwanza ya hasira
            let { key } = await sock.sendMessage(m.chat, { text: angryEmojis[0] }, { quoted: m });

            // 2. Anza ku-edit kuelekea ghadhabu zaidi kila sekunde 2
            for (let i = 1; i < angryEmojis.length; i++) {
                // Delay ya sekunde 2 (2000ms)
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Edit meseji kwenda hatua inayofuata ya hasira
                await sock.sendMessage(m.chat, { 
                    text: angryEmojis[i], 
                    edit: key 
                });
            }
        } catch (error) {
            console.error("Angry Mood Error:", error);
        }
    }
};
