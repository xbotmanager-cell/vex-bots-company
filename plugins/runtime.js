const translate = require('google-translate-api-x');

module.exports = {
    command: "runtime",
    category: "system",
    description: "Check how long the bot has been active",
    
    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        // Time Calculation Logic
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const clock = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        // Response Matrix
        const modes = {
            harsh: {
                text: `🕒 *SYSTEM RUNTIME*\n\n*Time:* ${clock}\n\n_It's been running this long without crashing. Satisfied now?_ 🖕`,
                react: "🕒",
                err: "⚠️ _Can't even count time? Pathetic._"
            },
            normal: {
                text: `⏳ *BOT UPTIME*\n\n*Active For:* ${clock}\n\n_The system is maintaining high availability._ ✅`,
                react: "⏳",
                err: "❌ _System timer synchronization failed._"
            },
            girl: {
                text: `🌸 *UPTIME DIARY*\n\n*Online For:* ${clock}\n\n_I've been awake and waiting for you all this time!_ ✨🎀`,
                react: "🎀",
                err: "📂 _Oopsie! I lost track of time thinking about you!_ 🌸"
            }
        };

        const currentMode = modes[style] || modes.normal;

        try {
            // Send Style Reaction
            await sock.sendMessage(m.chat, { react: { text: currentMode.react, key: m.key } });

            if (userSettings?.silent === true) return;

            let finalMessage = currentMode.text;

            // Translation Engine
            if (lang !== 'en') {
                const res = await translate(finalMessage, { to: lang });
                finalMessage = res.text;
            }

            await sock.sendMessage(m.chat, { text: finalMessage }, { quoted: m });

        } catch (error) {
            console.error("Runtime Error:", error);
            await sock.sendMessage(m.chat, { text: currentMode.err });
        }
    }
};
