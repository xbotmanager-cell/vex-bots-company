const translate = require('google-translate-api-x');

module.exports = {
    command: "mathquiz",
    alias: ["math", "hesabu", "quiz"],
    category: "games",
    description: "Challenge your brain with math problems",

    async execute(m, sock, { userSettings, lang, prefix }) {
        // 1. CONFIG & STYLE SYNC
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';

        // 2. GENERATE MATH PROBLEM
        const operators = ['+', '-', '*'];
        const op = operators[Math.floor(Math.random() * operators.length)];
        const num1 = Math.floor(Math.random() * 20) + 1;
        const num2 = Math.floor(Math.random() * 15) + 1;
        
        let answer;
        if (op === '+') answer = num1 + num2;
        else if (op === '-') answer = num1 - num2;
        else answer = num1 * num2;

        const question = `${num1} ${op} ${num2}`;

        // 3. STYLES DEFINITION
        const modes = {
            harsh: {
                title: "☣️ 𝕸𝕬𝕿𝕳 𝕰𝖃𝕿𝕽𝕰𝕸𝕰 ☣️",
                line: "━",
                quest: "🧠 𝕾𝖔𝖑𝖛𝖊 𝖙𝖍𝖎𝖘 𝖋𝖆𝖘𝖙 𝖔𝖗 𝖇𝖊 𝖑𝖆𝖇𝖊𝖑𝖊𝖉 𝖘𝖙𝖚𝖕𝖎𝖉:",
                wait: "⏳ 𝖄𝖔𝖚 𝖍𝖆𝖛𝖊 20𝖘 𝖙𝖔 𝖆𝖓𝖘𝖜𝖊𝖗!",
                react: "⚡"
            },
            normal: {
                title: "🔢 VEX MATH QUIZ 🔢",
                line: "─",
                quest: "💡 Calculate the following:",
                wait: "⏳ Time limit: 20 seconds",
                react: "🔢"
            },
            girl: {
                title: "🫧 𝑀𝒶𝓉𝒽𝓎 𝑀𝑜𝓊𝓈𝑒 𝒬𝓊𝒾𝓏 🫧",
                line: "┄",
                quest: "🫧 𝒽𝑒𝓎 𝓅𝓇𝒾𝓃𝒸𝑒𝓈𝓈, 𝓌𝒽𝒶𝓉 𝒾𝓈: 🫧",
                wait: "🫧 𝒶𝓃𝓈𝓌𝑒𝓇 𝓆𝓊𝒾𝒸𝓀𝓁𝓎, 𝒹𝑒𝒶𝓇~ 🫧",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 4. PREPARE DASHBOARD
            const quizUI = `*${current.title}*\n${current.line.repeat(15)}\n\n*${current.quest}*\n\n\`\`\`${question} = ?\`\`\`\n\n${current.wait}\n${current.line.repeat(15)}\n_VEX Intelligence - Lupin Edition_`;

            // 5. TRANSLATE & SEND
            const { text: translatedUI } = await translate(quizUI, { to: targetLang });
            const sent = await m.reply(translatedUI);

            // 6. SAVE TO GLOBAL CACHE (For Observer validation)
            global.activeGames = global.activeGames || {};
            global.activeGames[m.chat] = {
                type: "math",
                answer: answer.toString(),
                messageId: sent.key.id,
                style: style
            };

            // 7. AUTO-CLOSE & REVEAL (20 Seconds)
            setTimeout(async () => {
                if (global.activeGames[m.chat] && global.activeGames[m.chat].type === "math") {
                    const failMsg = `*⏰ TIME IS UP!*\n\nThe correct answer was: *${answer}*\n_Better luck next time!_`;
                    const { text: translatedFail } = await translate(failMsg, { to: targetLang });
                    await sock.sendMessage(m.chat, { text: translatedFail });
                    delete global.activeGames[m.chat];
                }
            }, 20000);

        } catch (error) {
            console.error("MATH ERROR:", error);
            await m.reply("☣️ Processor Overheat. Math engine crashed.");
        }
    }
};
