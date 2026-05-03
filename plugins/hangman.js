const translate = require('google-translate-api-x');

module.exports = {
    command: "hangman",
    alias: ["bashiri", "guessword"],
    category: "games",
    description: "Mchezo wa kubashiri neno herufi kwa herufi",

    async execute(m, sock, { userSettings, lang, prefix }) {
        // 1. CONFIG & STYLE SYNC
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';

        // 2. WORD POOL (English Words)
        const words = ["JAVASCRIPT", "DATABASE", "WHATSAPP", "LUPER", "NODEJS", "HACKING", "SERVER", "CODING"];
        const selectedWord = words[Math.floor(Math.random() * words.length)];
        
        // Tunatengeneza muonekano wa neno lililofichwa (mfano: _ _ _ _ _)
        const hiddenWord = selectedWord.split('').map(() => "_").join(" ");

        // 3. STYLES DEFINITION
        const modes = {
            harsh: {
                title: "☣️ 𝕳𝕬𝕹𝕕𝕸𝕬𝕹 𝕰𝖃𝕰𝕮𝕿𝕴𝕺𝕹 ☣️",
                line: "━",
                quest: "🩸 𝕲𝖚𝖊𝖘𝖘 𝖙𝖍𝖊 𝖜𝖔𝖗𝖉 𝖔𝖗 𝖌𝖊𝖙 𝖍𝖆𝖓𝖌𝖊𝖉:",
                hint: "⚙️ 𝕽𝖊𝖕𝖑𝖞 𝖜𝖎𝖙𝖍 𝖙𝖍𝖊 𝖋𝖚𝖑𝖑 𝖜𝖔𝖗𝖉 𝖙𝖔 𝖜𝖎𝖓.",
                react: "💀"
            },
            normal: {
                title: "🎮 VEX HANGMAN 🎮",
                line: "─",
                quest: "💡 Solve the hidden word:",
                hint: "📝 Type the answer to claim victory!",
                react: "🎮"
            },
            girl: {
                title: "🫧 𝐻𝒶𝓃𝑔𝓂𝒶𝓃 𝒫𝒾𝓃𝓀 𝒫𝓊𝓏𝓏𝓁𝑒 🫧",
                line: "┄",
                quest: "🫧 𝒸𝒶𝓃 𝓎𝑜𝓊 𝒻𝒾𝓃𝒹 𝓉𝒽𝑒 𝒽𝒾𝒹𝒹𝑒𝓃 𝓌𝑜𝓇𝒹? 🫧",
                hint: "🫧 𝓉𝓎𝓅𝑒 𝒾𝓉 𝒽𝑒𝓇𝑒, 𝒹𝒶𝓇𝓁𝒾𝓃𝑔~ 🫧",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 4. PREPARE DASHBOARD
            const gameUI = `*${current.title}*\n${current.line.repeat(15)}\n\n*${current.quest}*\n\n\`\`\`${hiddenWord}\`\`\`\n\n${current.line.repeat(15)}\n_${current.hint}_`;

            // 5. TRANSLATE & SEND
            const { text: translatedUI } = await translate(gameUI, { to: targetLang });
            const sent = await m.reply(translatedUI);

            // 6. SAVE GAME TO CACHE (Hii itasubiri jibu sahihi kule kwenye Observer)
            global.activeGames = global.activeGames || {};
            global.activeGames[m.chat] = {
                type: "hangman",
                word: selectedWord,
                messageId: sent.key.id,
                style: style
            };

            // 7. AUTO-REVEAL AFTER 30s (Ili game isikae milele)
            setTimeout(async () => {
                if (global.activeGames[m.chat] && global.activeGames[m.chat].type === "hangman") {
                    const revealMsg = `*⏰ TIME UP!*\n\nThe correct word was: *${selectedWord}*`;
                    const { text: translatedReveal } = await translate(revealMsg, { to: targetLang });
                    await sock.sendMessage(m.chat, { text: translatedReveal });
                    delete global.activeGames[m.chat];
                }
            }, 30000);

        } catch (error) {
            console.error("HANGMAN ERROR:", error);
            await m.reply("☣️ Executioner failed. The prisoner escaped.");
        }
    }
};
