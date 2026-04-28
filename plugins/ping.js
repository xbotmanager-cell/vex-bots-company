const translate = require('google-translate-api-x');

module.exports = {
    command: "ping",
    category: "system",
    description: "Check system speed and latency",
    
    async execute(m, sock, { args, userSettings }) {
        // userSettings inatoka Supabase (default: lang='en', style='harsh')
        const start = Date.now();
        const speed = Date.now() - start;
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh'; // harsh, normal, girl

        // Response Matrix (Styles)
        const responses = {
            harsh: `*PONG!* 🖕\nSpeed: ${speed}ms\nStop bothering me, I'm fast enough.`,
            normal: `*PONG* 📡\nLatency: ${speed}ms\nSystem is stable.`,
            girl: `*Pong!* ✨🌸\nSpeed is ${speed}ms\nReady for you, babe! 🎀`
        };

        let text = responses[style] || responses.normal;

        try {
            // Reaction Logic (Kama user anataka maneno au reaction tu)
            if (userSettings?.silent === true) {
                return await sock.sendMessage(m.chat, { react: { text: "⚡", key: m.key } });
            }

            // Translation Logic
            if (lang !== 'en') {
                const res = await translate(text, { to: lang });
                text = res.text;
            }

            await sock.sendMessage(m.chat, { text: text }, { quoted: m });
            
        } catch (error) {
            // 5+ Way Try-Catch Safety
            console.error("Ping Error:", error);
            await sock.sendMessage(m.chat, { text: "⚠️ Error 0xP1" });
        }
    }
};
