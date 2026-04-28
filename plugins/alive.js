const translate = require('google-translate-api-x');
const os = require('os');

module.exports = {
    command: "alive",
    category: "system",
    description: "Check detailed system health and status",
    
    async execute(m, sock, { args, userSettings }) {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        
        // RAM & Performance Stats
        const ramUsed = (process.memoryUsage().rss / 1024 / 1024).toFixed(2); // Physical RAM used
        const ramTotal = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const speed = Date.now() - (m.messageTimestamp * 1000);
        
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        const stats = `📊 *SYSTEM METRICS*\n` +
                      `• Speed: ${speed}ms\n` +
                      `• Runtime: ${hours}h ${minutes}m\n` +
                      `• RAM: ${ramUsed}MB / ${ramTotal}GB\n` +
                      `• Stability: Stable (0x0)\n` +
                      `• Status: Active`;

        // Response Matrix with specific Reactions and Errors
        const modes = {
            harsh: {
                text: `${stats}\n\n_Everything is working. Now get lost and do something useful._ 🖕`,
                react: "🖕",
                err: "⚠️ _System's fine, you're the error._"
            },
            normal: {
                text: `${stats}\n\n_All systems are operational and stable._ ✅`,
                react: "🟢",
                err: "⚠️ _An internal error occurred during status check._"
            },
            girl: {
                text: `${stats}\n\n_I'm up and running perfectly just for you!_ ✨🌸`,
                react: "💖",
                err: "📂 _Oopsie! My system had a tiny hiccup, sowwy!_ 🎀"
            }
        };

        const currentMode = modes[style] || modes.normal;

        try {
            // Send Reaction First (Style Dependent)
            await sock.sendMessage(m.chat, { react: { text: currentMode.react, key: m.key } });

            if (userSettings?.silent === true) return;

            let finalMessage = currentMode.text;

            // Translation Logic
            if (lang !== 'en') {
                const res = await translate(finalMessage, { to: lang });
                finalMessage = res.text;
            }

            await sock.sendMessage(m.chat, { text: finalMessage }, { quoted: m });

        } catch (error) {
            console.error("Alive Error:", error);
            // Error message also follows the mode style
            const errOutput = currentMode.err;
            await sock.sendMessage(m.chat, { text: errOutput });
        }
    }
};
