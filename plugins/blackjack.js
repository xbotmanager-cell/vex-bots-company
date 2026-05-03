const translate = require('google-translate-api-x');

module.exports = {
    command: "blackjack",
    alias: ["bj", "21", "karata"],
    category: "games",
    description: "Shindana na Bot kwenye mchezo wa Karata 21",

    async execute(m, sock, { userSettings, lang, prefix }) {
        // 1. CONFIG & STYLE SYNC
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';

        // 2. DECK LOGIC (Simple 21 Engine)
        const drawCard = () => Math.floor(Math.random() * 10) + 2;
        const playerCard1 = drawCard();
        const playerCard2 = drawCard();
        const botCard = drawCard();
        const playerTotal = playerCard1 + playerCard2;

        // 3. STYLES DEFINITION
        const modes = {
            harsh: {
                title: "☣️ 𝕭𝕷𝕬𝕮𝕶𝕵𝕬𝕮𝕶 𝕯𝕰𝕬𝕿𝕳 ☣️",
                line: "━",
                quest: "🃏 𝕿𝖍𝖊 𝖉𝖊𝖆𝖑𝖊𝖗 𝖎𝖘 𝖜𝖆𝖙𝖈𝖍𝖎𝖓𝖌. 𝖂𝖎𝖓 𝖔𝖗 𝖇𝖚𝖗𝖓:",
                status: `𝖄𝖔𝖚𝖗 𝕳𝖆𝖓𝖉: [ ${playerTotal} ]\n𝕯𝖊𝖆𝖑𝖊𝖗'𝖘 𝖀𝖕𝖈𝖆𝖗𝖉: [ ${botCard} ]`,
                hint: `⚙️ 𝕽𝖊𝖕𝖑𝖞 '${prefix}𝖍𝖎𝖙' 𝖔𝖗 '${prefix}𝖘𝖙𝖆𝖓𝖉'.`,
                react: "🃏"
            },
            normal: {
                title: "🃏 VEX BLACKJACK 🃏",
                line: "─",
                quest: "♠️ Beat the dealer to 21!",
                status: `Player Total: ${playerTotal}\nDealer Shows: ${botCard}`,
                hint: `📝 Reply '${prefix}hit' to take a card or '${prefix}stand'.`,
                react: "♠️"
            },
            girl: {
                title: "🫧 𝐵𝓁𝒶𝒸𝓀𝒿𝒶𝒸𝓀 𝒫𝒾𝓃𝓀 𝒞𝒶𝓈𝒾𝓃𝑜 🫧",
                line: "┄",
                quest: "🫧 𝓁𝓊𝒸𝓀𝓎 𝓃𝓊𝓂𝒷𝑒𝓇 𝟤𝟣, 𝓅𝓇𝒾𝓃𝒸𝑒𝓈𝓈~ 🫧",
                status: `𝒴𝑜𝓊𝓇 𝒞𝒶𝓇𝒹𝓈: ${playerTotal}\n𝒟𝑒𝒶𝓁𝑒𝓇 𝒞𝒶𝓇𝒹: ${botCard}`,
                hint: `🫧 𝓈𝒶𝓎 '𝒽𝒾𝓉' 𝑜𝓇 '𝓈𝓉𝒶𝓃𝒹', 𝒹𝑒𝒶𝓇 🫧`,
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 4. PREPARE THE UI
            const gameUI = `*${current.title}*\n${current.line.repeat(15)}\n${current.quest}\n\n${current.status}\n\n${current.line.repeat(15)}\n_${current.hint}_`;

            // 5. TRANSLATE & SEND
            const { text: translatedUI } = await translate(gameUI, { to: targetLang });
            const sent = await m.reply(translatedUI);

            // 6. SAVE TO GLOBAL CACHE
            global.activeGames = global.activeGames || {};
            global.activeGames[m.chat] = {
                type: "blackjack",
                playerScore: playerTotal,
                botScore: botCard,
                messageId: sent.key.id,
                style: style,
                sender: m.sender
            };

        } catch (error) {
            console.error("BLACKJACK ERROR:", error);
            await m.reply("☣️ Casino is closed due to a raid.");
        }
    }
};
