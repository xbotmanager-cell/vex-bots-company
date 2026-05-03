const translate = require('google-translate-api-x');

module.exports = {
    command: "truthordare",
    alias: ["tord", "truth", "dare"],
    category: "games",
    description: "Play Truth or Dare with the bot or friends",

    async execute(m, sock, { args, userSettings, prefix }) {
        // 1. SETTINGS & PREFERENCES
        const style = userSettings?.style || 'harsh';
        const lang = userSettings?.lang || 'en';
        const choice = args[0]?.toLowerCase();

        // 2. DATA POOL (Truths & Dares)
        const truths = [
            "What is the most embarrassing thing you've ever done in public?",
            "Who is your secret crush right now?",
            "Have you ever lied to your best friend? If yes, about what?",
            "What is the biggest secret you've ever kept from your parents?",
            "If you could trade lives with someone for a day, who would it be?",
            "What is your biggest fear in a relationship?",
            "Have you ever cheated in an exam?",
            "What is the last thing you searched for on your phone?"
        ];

        const dares = [
            "Send a heart emoji to the 3rd person on your recent chat list.",
            "Post 'I am a big fan of Lupin' on your status for 5 minutes.",
            "Call your crush and tell them a joke.",
            "Record a 10-second video of you dancing and send it here.",
            "Send a screenshot of your YouTube search history.",
            "Change your WhatsApp profile picture to a funny meme for 1 hour.",
            "Text your ex 'I still miss you' and screenshot the reaction (if any).",
            "Voice note yourself singing a trending Bongo Flava song."
        ];

        // 3. STYLES CONFIGURATION
        const modes = {
            harsh: {
                title: "☣️ 𝕿𝕽𝖀𝕿𝕳 𝕺𝕽 𝕯𝕬𝕽𝕰: 𝕰𝖃𝕿𝕽𝕰𝕽𝕰 ☣️",
                line: "━",
                tHeader: "⚖️ 𝕿𝕽𝖀𝕿𝕳 𝕽𝕰𝖁𝕰𝕬𝕷𝕰𝕯:",
                dHeader: "🔥 𝕯𝕬𝕽𝕰 𝕬𝕮𝕮𝕰𝕻𝕿𝕰𝕯:",
                invalid: `☘️ 𝖀𝖘𝖊 '${prefix}𝖙𝖔𝖗𝖉 𝖙𝖗𝖚𝖙𝖍' 𝖔𝖗 '${prefix}𝖙𝖔𝖗𝖉 𝖉𝖆𝖗𝖊', 𝖈𝖔𝖜𝖆𝖗𝖉!`,
                react: "⚖️"
            },
            normal: {
                title: "🎮 TRUTH OR DARE 🎮",
                line: "─",
                tHeader: "💡 TRUTH:",
                dHeader: "🎯 DARE:",
                invalid: `❓ Please specify: ${prefix}tord truth OR ${prefix}tord dare`,
                react: "🎮"
            },
            girl: {
                title: "🫧 𝒯𝓇𝓊𝓉𝒽 ❀ 𝒟𝒶𝓇𝑒 𝒫𝒾𝓃𝓀 🫧",
                line: "┄",
                tHeader: "🫧 𝒯𝓇𝓊𝓉𝒽𝓎 𝒯𝒾𝓂𝑒: 🫧",
                dHeader: "🫧 𝒟𝒶𝓇𝑒 𝓉𝑜 𝒟𝑜: 🫧",
                invalid: `🫧 𝓅𝓁𝑒𝒶𝓈𝑒 𝒸𝒽𝑜𝑜𝓈𝑒 𝓉𝓇𝓊𝓉𝒽 𝑜𝓇 𝒹𝒶𝓇𝑒, 𝓅𝓇𝒾𝓃𝒸𝑒𝓈~ 🫧`,
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        // 4. LOGIC HANDLING
        let selectedHeader = "";
        let selectedTask = "";

        if (choice === "truth") {
            selectedHeader = current.tHeader;
            selectedTask = truths[Math.floor(Math.random() * truths.length)];
        } else if (choice === "dare") {
            selectedHeader = current.dHeader;
            selectedTask = dares[Math.floor(Math.random() * dares.length)];
        } else {
            // Kama hajapiga truth wala dare, mpe maelekezo
            return m.reply(current.invalid);
        }

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 5. BUILD THE FINAL MESSAGE
            const rawMessage = `*${current.title}*\n${current.line.repeat(15)}\n\n*${selectedHeader}*\n"${selectedTask}"\n\n${current.line.repeat(15)}\n_VEX System - Lupin Edition_`;

            // 6. TRANSLATE & REPLY
            const { text: translatedMsg } = await translate(rawMessage, { to: lang });
            await m.reply(translatedMsg);

        } catch (error) {
            console.error("TORD ERROR:", error);
            await m.reply("☣️ Game Engine Error. Fate is undecided.");
        }
    }
};
