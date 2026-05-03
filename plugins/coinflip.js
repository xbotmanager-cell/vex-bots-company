const translate = require('google-translate-api-x');

module.exports = {
    command: "coinflip",
    alias: ["flip", "rushasarafu", "cf"],
    category: "games",
    description: "Bet on Heads or Tails to win",

    async execute(m, sock, { args, userSettings, lang, prefix }) {
        // 1. CONFIG & STYLE SYNC
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';
        const userChoice = args[0]?.toLowerCase();

        // 2. COIN LOGIC
        const sides = ['heads', 'tails'];
        const result = sides[Math.floor(Math.random() * sides.length)];

        // 3. STYLES DEFINITION
        const modes = {
            harsh: {
                title: "☣️ 𝕮𝕺𝕴𝕹 𝕱𝕷𝕴𝕻: 𝕽𝕴𝕾𝕶 ☣️",
                line: "━",
                quest: "🪙 𝕿𝖍𝖊 𝖈𝖔𝖎𝖓 𝖎𝖘 𝖎𝖓 𝖙𝖍𝖊 𝖆𝖎𝖗... 𝕮𝖍𝖔𝖔𝖘𝖊 𝖜𝖎𝖘𝖊𝖑𝖞:",
                win: "🏆 𝖄𝖔𝖚 𝖜𝖔𝖓! 𝕱𝖆𝖙𝖊 𝖘𝖒𝖎𝖑𝖊𝖘 𝖚𝖕𝖔𝖓 𝖞𝖔𝖚.",
                lose: "💀 𝖄𝖔𝖚 𝖑𝖔𝖘𝖙. 𝕯𝖊𝖘𝖙𝖎𝖓𝖞 𝖍𝖆𝖘 𝖗𝖊𝖏𝖊𝖈𝖙𝖊𝖉 𝖞𝖔𝖚.",
                invalid: `❌ 𝖀𝖘𝖊 '${prefix}𝖈𝖋 𝖍𝖊𝖆𝖉𝖘' 𝖔𝖗 '${prefix}𝖈𝖋 𝖙𝖆𝖎𝖑𝖘'.`,
                react: "🪙"
            },
            normal: {
                title: "🪙 VEX COIN FLIP 🪙",
                line: "─",
                quest: "💡 Heads or Tails? Let's see your luck:",
                win: "🎉 Correct! It was",
                lose: "❌ Wrong guess! It was",
                invalid: `❓ Specify your choice: ${prefix}cf heads OR ${prefix}cf tails`,
                react: "🪙"
            },
            girl: {
                title: "🫧 𝒞𝑜𝒾𝓃 𝐹𝓁𝒾𝓅 𝒫𝒾𝓃𝓀 𝐿𝓊𝒸𝓀 🫧",
                line: "┄",
                quest: "🫧 𝒽𝑒𝒶𝒹𝓈 𝑜𝓇 𝓉𝒶𝒾𝓁𝓈, 𝓅𝓇𝒾𝓃𝒸𝑒𝓈𝓈? 🫧",
                win: "✨ 𝓎𝒶𝓎! 𝓎𝑜𝓊 𝑔𝓊𝑒𝓈𝓈𝑒𝒹 𝒾𝓉: ",
                lose: "🌸 𝑜𝑜𝓅𝓈! 𝒾𝓉 𝓌𝒶𝓈 𝒶𝒸𝓉𝓊𝒶𝓁𝓁𝓎: ",
                invalid: `🫧 𝓅𝓁𝑒𝒶𝓈𝑒 𝓅𝒾𝒸𝓀 𝒽𝑒𝒶𝒹𝓈 𝑜𝓇 𝓉𝒶𝒾𝓁𝓈, 𝒹𝑒𝒶𝓇~ 🫧`,
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        // 4. VALIDATION
        if (!userChoice || !sides.includes(userChoice)) {
            return m.reply(current.invalid);
        }

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 5. ANIMATION DELAY (Suspense)
            await m.reply("_Flipping the coin..._ 🪙");
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 6. RESULT HANDLING
            let finalStatus = "";
            if (userChoice === result) {
                finalStatus = `${current.win} *${result.toUpperCase()}*`;
            } else {
                finalStatus = `${current.lose} *${result.toUpperCase()}*`;
            }

            // 7. BUILD UI & SEND
            const gameUI = `*${current.title}*\n${current.line.repeat(15)}\n\n${finalStatus}\n\n${current.line.repeat(15)}\n_VEX Intelligence - Lupin Edition_`;
            
            const { text: translatedUI } = await translate(gameUI, { to: targetLang });
            await m.reply(translatedUI);

        } catch (error) {
            console.error("COINFLIP ERROR:", error);
            await m.reply("☣️ The coin fell into a crack. Try again.");
        }
    }
};
