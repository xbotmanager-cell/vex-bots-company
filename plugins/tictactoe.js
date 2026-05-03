const translate = require('google-translate-api-x');

module.exports = {
    command: "tictactoe",
    alias: ["ttt", "xnao"],
    category: "games",
    description: "Challenge a friend to a game of TicTacToe",

    async execute(m, sock, { userSettings, lang, prefix }) {
        // 1. CONFIG & STYLE SYNC
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';

        // 2. INITIAL BOARD
        const board = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

        // 3. STYLES DEFINITION
        const modes = {
            harsh: {
                title: "☣️ 𝕿𝕴𝕮-𝕿𝕬𝕮-𝕿𝕺𝕰: 𝖂𝕬𝕽 ☣️",
                line: "━",
                quest: "⚔️ 𝕯𝖊𝖋𝖊𝖆𝖙 𝖞𝖔𝖚𝖗 𝖔𝖕𝖕𝖔𝖓𝖊𝖓𝖙 𝖔𝖗 𝖛𝖆𝖓𝖎𝖘𝖍:",
                wait: "⏳ 𝖂𝖆𝖎𝖙𝖎𝖓𝖌 𝖋𝖔𝖗 𝖕𝖑𝖆𝖞𝖊𝖗𝖘 𝖙𝖔 𝖏𝖔𝖎𝖓...",
                react: "⚔️"
            },
            normal: {
                title: "🎮 VEX TIC-TAC-TOE 🎮",
                line: "─",
                quest: "🕹️ Match start! Get three in a row:",
                wait: "⏳ Tag someone to play with you!",
                react: "🕹️"
            },
            girl: {
                title: "🫧 𝒯𝒾𝒸-𝒯𝒶𝒸-𝒯𝑜𝑒 𝒫𝒾𝓃𝓀 🫧",
                line: "┄",
                quest: "🫧 𝓁𝑒𝓉'𝓈 𝓅𝓁𝒶𝓎 𝒶 𝒸𝓊𝓉𝑒 𝑔𝒶𝓂𝑒~ 🫧",
                wait: "🫧 𝓌𝒽𝑜 𝓌𝒶𝓃𝓉𝓈 𝓉𝑜 𝒿𝑜𝒾𝓃 𝓂𝑒? 🫧",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 4. PREPARE THE GRID
            const grid = `
      ${board[0]} | ${board[1]} | ${board[2]}
      -----------
      ${board[3]} | ${board[4]} | ${board[5]}
      -----------
      ${board[6]} | ${board[7]} | ${board[8]}
            `;

            // 5. BUILD THE FINAL MESSAGE
            const gameUI = `*${current.title}*\n${current.line.repeat(15)}\n${current.quest}\n${grid}\n\n${current.wait}\n${current.line.repeat(15)}\n_VEX System - Lupin Edition_`;

            // 6. TRANSLATE & SEND
            const { text: translatedUI } = await translate(gameUI, { to: targetLang });
            const sent = await m.reply(translatedUI);

            // 7. SAVE TO GLOBAL CACHE (For Observer logic)
            global.activeGames = global.activeGames || {};
            global.activeGames[m.chat] = {
                type: "tictactoe",
                board: board,
                turn: "X",
                players: [], // Hapa Observer ataweka majina ya walio-reply
                messageId: sent.key.id,
                style: style
            };

        } catch (error) {
            console.error("TTT ERROR:", error);
            await m.reply("☣️ Arena is broken. Match cancelled.");
        }
    }
};
