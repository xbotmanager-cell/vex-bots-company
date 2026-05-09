const crypto = require('crypto');

// 🔥 VEX GLOBAL QUEUE (ANTI-BAN)
const queue = [];
let processing = false;

// 🎲 GAME STATE - In-Memory Only, No Database
const games = new Map(); // chatId -> game state

module.exports = {
    command: "dice",
    category: "casino",
    description: "VEX Premium Dice Duel - Animated 3D dice with virtual cash",

    async execute(m, sock, ctx) {
        queue.push({ m, sock, ctx });
        processQueue();
    }
};

async function processQueue() {
    if (processing) return;
    processing = true;
    while (queue.length > 0) {
        const { m, sock, ctx } = queue.shift();
        try {
            await runDice(m, sock, ctx);
            await sleep(2000); // Anti-ban delay
        } catch (e) {
            console.error("VEX DICE ERROR:", e);
        }
    }
    processing = false;
}

async function runDice(m, sock, ctx) {
    const { userSettings, args, prefix } = ctx;
    const style = userSettings?.style || "harsh";
    const chatId = m.chat;
    const userId = m.sender;
    const userName = m.pushName || userId.split('@')[0];

    // =========================
    // 1. START NEW DUEL
    // =========================
    if (args[0]?.toLowerCase() === 'start' || args[0]?.toLowerCase() === 'duel') {
        const mentioned = m.mentionedJid || [];
        const opponent = mentioned[0];

        if (!opponent) {
            return m.reply(`*VEX DICE DUEL*\n\n❌ Tag an opponent to duel\n\nExample: ${prefix}dice start @user`);
        }

        if (opponent === userId) {
            return m.reply("❌ You cannot duel yourself. Tag someone else.");
        }

        if (games.has(chatId)) {
            const game = games.get(chatId);
            return m.reply(`⚡ Dice duel already running!\n\n🎲 ${game.player1Name} vs ${game.player2Name}\n💰 Pot: ${game.pot} coins\n\nWait for current game to finish.`);
        }

        const startCash = 1000;
        const betAmount = parseInt(args[1]) || 100;

        if (betAmount < 50 || betAmount > 500) {
            return m.reply("❌ Bet must be between 50-500 coins");
        }

        games.set(chatId, {
            player1: userId,
            player1Name: userName,
            player2: opponent,
            player2Name: await sock.getName(opponent) || opponent.split('@')[0],
            player1Cash: startCash,
            player2Cash: startCash,
            pot: betAmount * 2,
            bet: betAmount,
            round: 1,
            maxRounds: 3,
            turn: userId,
            status: 'rolling',
            startTime: Date.now()
        });

        return sock.sendMessage(chatId, {
            text: `🎲 *DICE DUEL STARTED*\n\n👤 ${userName} VS ${games.get(chatId).player2Name}\n💰 Each bets: ${betAmount} coins\n💵 Total Pot: ${betAmount * 2} coins\n🎯 Best of ${games.get(chatId).maxRounds} rounds\n\n🎲 *Round 1*\n👤 Turn: @${userId.split('@')[0]}\n\n➤.dice roll to throw dice`,
            mentions: [userId, opponent]
        });
    }

    // =========================
    // 2. ROLL DICE
    // =========================
    if (args[0]?.toLowerCase() === 'roll') {
        if (!games.has(chatId)) {
            return m.reply(`❌ No active duel. Start with *.dice start @user*`);
        }

        const game = games.get(chatId);

        if (game.turn!== userId) {
            return m.reply(`❌ Not your turn! Waiting for @${game.turn.split('@')[0]}`, {
                mentions: [game.turn]
            });
        }

        if (game.status!== 'rolling') {
            return m.reply("❌ Round already finished. Wait for next round.");
        }

        // =========================
        // 3. ANIMATION ENGINE
        // =========================
        const themes = {
            harsh: {
                bar: "━",
                frame: "☣️",
                rolling: "🎲 ℝ𝕆𝕃𝕀ℕ𝔾 𝔻𝕀ℂ𝔼 𝕆𝔽 𝔻𝕆𝕄...",
                win: "☣️ 𝔻𝕀ℂ𝔼 𝔾𝕆𝔻! 𝕐𝕆𝕌 𝕆𝕎ℕ 𝕋ℍ𝔼 𝕋𝔸𝔹𝕃𝔼",
                lose: "💀 𝕊ℕ𝔸𝕂𝔼 𝔼𝕐𝔼𝕊! ℙ𝔸𝕋ℍ𝔼𝕋𝕀ℂ",
                react: "🎲"
            },
            normal: {
                bar: "─",
                frame: "🎲",
                rolling: "🎲 Rolling the dice...",
                win: "🎉 BIG WIN! Dice Master!",
                lose: "💀 BUSTED! Try again.",
                react: "🎲"
            },
            girl: {
                bar: "✧",
                frame: "🫧",
                rolling: "🎲 𝓇𝑜𝓁𝒾𝓃𝑔 𝒻𝑜𝓇 𝓁𝓊𝒸𝓀~",
                win: "🎉 𝒴𝒜𝒴! 𝒟𝒾𝒸𝑒 𝓆𝓊𝑒𝑒𝓃~ 👑",
                lose: "🥺 𝑜𝒽 𝓃𝑜... 𝓈𝓃𝒶𝓀𝑒 𝑒𝓎𝑒𝓈~",
                react: "🎀"
            }
        };

        const ui = themes[style] || themes.normal;
        await sock.sendMessage(m.chat, { react: { text: ui.react, key: m.key } });

        let { key } = await sock.sendMessage(chatId, { text: ui.rolling });

        // Dice faces
        const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        let finalDice1, finalDice2;

        // 5 Frame Animation
        for (let f = 0; f < 5; f++) {
            const dice1 = diceFaces[Math.floor(Math.random() * 6)];
            const dice2 = diceFaces[Math.floor(Math.random() * 6)];

            const animText = `
${ui.frame} *VEX DICE* ${ui.frame}
${ui.bar.repeat(14)}

      🎲 ${dice1} ${dice2} 🎲

${ui.bar.repeat(14)}
${style === 'harsh'? 'ℝ𝕠𝕝𝕚𝕟𝕘...' : 'Rolling...'}
            `;

            await sock.sendMessage(chatId, { text: animText, edit: key });
            await sleep(600);
            finalDice1 = dice1;
            finalDice2 = dice2;
        }

        // =========================
        // 4. CALCULATE RESULT
        // =========================
        const dice1Value = diceFaces.indexOf(finalDice1) + 1;
        const dice2Value = diceFaces.indexOf(finalDice2) + 1;
        const total = dice1Value + dice2Value;

        const isPlayer1 = userId === game.player1;
        const playerKey = isPlayer1? 'player1Roll' : 'player2Roll';
        const cashKey = isPlayer1? 'player1Cash' : 'player2Cash';

        game[playerKey] = total;

        // Check if both rolled
        if (game.player1Roll && game.player2Roll) {
            game.status = 'finished';

            let winner, loser, winAmount;
            if (game.player1Roll > game.player2Roll) {
                winner = game.player1;
                loser = game.player2;
                game.player1Cash += game.bet;
                game.player2Cash -= game.bet;
            } else if (game.player2Roll > game.player1Roll) {
                winner = game.player2;
                loser = game.player1;
                game.player2Cash += game.bet;
                game.player1Cash -= game.bet;
            } else {
                // Tie - no cash change
                winner = null;
            }

            const winnerName = winner? await sock.getName(winner) : 'TIE';
            const resultText = winner?
                (style === 'harsh'? `☣️ ${winnerName.toUpperCase()} 𝕎𝕀ℕ𝕊 𝕋ℍ𝔼 ℝ𝕆𝕌ℕ𝔻` : `🎉 ${winnerName} WINS!`) :
                '🤝 TIE! No coins exchanged';

            const finalDisplay = `
${ui.frame} *VEX DICE* ${ui.frame}
${ui.bar.repeat(14)}

🎲 ${game.player1Name}: ${diceFaces[game.player1Roll - 1]} ${diceFaces[game.player1Roll - 1]} = ${game.player1Roll}
🎲 ${game.player2Name}: ${diceFaces[game.player2Roll - 1]} ${diceFaces[game.player2Roll - 1]} = ${game.player2Roll}

${ui.bar.repeat(14)}

${resultText}

💰 ${game.player1Name}: ${game.player1Cash} coins
💰 ${game.player2Name}: ${game.player2Cash} coins
💵 Pot: ${game.pot} coins

${ui.bar.repeat(14)}
_${style === 'harsh'? 'ℕ𝔼𝕏𝕋 ℝ𝕆𝕌ℕ𝔻 𝕀ℕℂ𝕆𝕄𝕀ℕ𝔾' : 'Next round starting...'}_
            `;

            await sock.sendMessage(chatId, {
                text: finalDisplay,
                edit: key,
                mentions: [game.player1, game.player2]
            });

            // Reset for next round
            game.round++;
            if (game.round > game.maxRounds || game.player1Cash <= 0 || game.player2Cash <= 0) {
                // Game Over
                const finalWinner = game.player1Cash > game.player2Cash? game.player1 : game.player2;
                const finalWinnerName = await sock.getName(finalWinner);
                const duration = Math.floor((Date.now() - game.startTime) / 1000);

                setTimeout(async () => {
                    await sock.sendMessage(chatId, {
                        text: `🏁 *DICE DUEL ENDED*\n\n👑 Winner: @${finalWinner.split('@')[0]}\n💰 Final Cash: ${Math.max(game.player1Cash, game.player2Cash)} coins\n⏱️ Duration: ${duration}s\n🎯 Rounds: ${game.round - 1}/${game.maxRounds}\n\nGG!`,
                        mentions: [finalWinner]
                    });
                    games.delete(chatId);
                }, 3000);
            } else {
                // Next round
                setTimeout(async () => {
                    game.player1Roll = null;
                    game.player2Roll = null;
                    game.turn = game.player1;
                    game.status = 'rolling';
                    await sock.sendMessage(chatId, {
                        text: `🎲 *ROUND ${game.round}*\n\n👤 Turn: @${game.player1.split('@')[0]}\n💰 Bet: ${game.bet} coins\n\n➤.dice roll to throw`,
                        mentions: [game.player1]
                    });
                }, 3000);
            }

        } else {
            // First player rolled, wait for second
            game.turn = isPlayer1? game.player2 : game.player1;

            const waitDisplay = `
${ui.frame} *VEX DICE* ${ui.frame}
${ui.bar.repeat(14)}

🎲 ${userName}: ${finalDice1} ${finalDice2} = ${total}

${ui.bar.repeat(14)}

⏳ Waiting for @${game.turn.split('@')[0]} to roll...

➤.dice roll to throw
            `;

            await sock.sendMessage(chatId, {
                text: waitDisplay,
                edit: key,
                mentions: [game.turn]
            });
        }
    }

    // =========================
    // 5. STOP GAME
    // =========================
    if (args[0]?.toLowerCase() === 'stop' || args[0]?.toLowerCase() === 'forfeit') {
        if (!games.has(chatId)) {
            return m.reply("❌ No active duel to stop.");
        }

        const game = games.get(chatId);
        games.delete(chatId);

        return sock.sendMessage(chatId, {
            text: `🏁 *DICE DUEL FORFEITED*\n\n@${userId.split('@')[0]} ended the game\n\n💰 ${game.player1Name}: ${game.player1Cash} coins\n💰 ${game.player2Name}: ${game.player2Cash} coins\n\nStart new game with.dice start @user`,
            mentions: [userId, game.player1, game.player2]
        });
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
