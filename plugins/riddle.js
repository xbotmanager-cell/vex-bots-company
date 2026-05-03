const translate = require('google-translate-api-x');

module.exports = {
    command: "riddle",
    alias: ["kitendawili", "puzzle"],
    category: "games",
    description: "Pata vitendawili vya kuchemsha bongo",

    async execute(m, sock, { userSettings, lang }) {
        // 1. SETTINGS & PREFERENCES
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';

        // 2. DATA POOL (Riddles & Answers)
        const riddles = [
            { q: "What has keys but can't open locks?", a: "A piano." },
            { q: "The more of this there is, the less you see. What is it?", a: "Darkness." },
            { q: "What has to be broken before you can use it?", a: "An egg." },
            { q: "I’m tall when I’m young, and I’m short when I’m old. What am I?", a: "A candle." },
            { q: "What is full of holes but still holds water?", a: "A sponge." },
            { q: "What building has the most stories?", a: "A library." }
        ];

        const selected = riddles[Math.floor(Math.random() * riddles.length)];

        // 3. STYLES CONFIGURATION
        const modes = {
            harsh: {
                title: "☣️ 𝕽𝕴𝕯𝕯𝕷𝕰 𝕸𝕬𝕾𝕿𝕰𝕽 ☣️",
                line: "━",
                quest: "🧠 𝕾𝖔𝖑𝖛𝖊 𝖙𝖍𝖎𝖘 𝖔𝖗 𝖉𝖎𝖊 𝖙𝖗𝖞𝖎𝖓𝖌:",
                wait: "⏳ 𝕬𝖓𝖘𝖜𝖊𝖗 𝖗𝖊𝖛𝖊𝖆𝖑𝖎𝖓𝖌 𝖎𝖓 10𝖘...",
                react: "🧠"
            },
            normal: {
                title: "🧩 VEX RIDDLE 🧩",
                line: "─",
                quest: "💡 Question:",
                wait: "⏳ Loading answer...",
                react: "🧩"
            },
            girl: {
                title: "🫧 𝑅𝒾𝒹𝒹𝓁𝑒 𝒯𝒾𝓂𝑒 𝒫𝓇𝒾𝓃𝒸𝑒𝓈𝓈 🫧",
                line: "┄",
                quest: "🫧 𝒸𝒶𝓃 𝓎𝑜𝓊 𝑔𝓊𝑒𝓈𝓈 𝓉𝒽𝒾𝓈? 🫧",
                wait: "🫧 𝒶𝓃𝓈𝓌𝑒𝓇 𝒾𝓈 𝒸𝑜𝓂𝒾𝓃𝑔~ 🫧",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 4. PREPARE QUESTION
            const questionText = `*${current.title}*\n${current.line.repeat(15)}\n\n*${current.quest}*\n"${selected.q}"\n\n${current.wait}`;
            
            // 5. TRANSLATE & SEND QUESTION
            const { text: translatedQuest } = await translate(questionText, { to: targetLang });
            await m.reply(translatedQuest);

            // 6. DELAYED ANSWER (Anti-Ban & Suspense)
            setTimeout(async () => {
                const answerText = `*✅ ANSWER:* \n"${selected.a}"`;
                const { text: translatedAns } = await translate(answerText, { to: targetLang });
                await sock.sendMessage(m.chat, { text: translatedAns }, { quoted: m });
            }, 10000); // Inasubiri sekunde 10 kabla ya kutoa jibu

        } catch (error) {
            console.error("RIDDLE ERROR:", error);
            await m.reply("☣️ Brain cells fried. Cannot process riddle.");
        }
    }
};
