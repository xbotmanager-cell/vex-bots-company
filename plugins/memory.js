const games = new Map(); // game state per group

// Emoji pool for grid
const EMOJIS = ['🍎', '🍌', '🍇', '🍊', '🍓', '🍉', '🥝', '🍑', '🥭', '🍍', '🥥', '🍒', '🥑', '🍅', '🥕', '🌽', '🥒', '🥦', '🍄', '🌶️', '🧀', '🍖', '🍗', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🍰', '🍪', '🍩', '🍫', '🍬', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🎱', '🎮', '🎲', '🎯', '🎸', '🎹', '🎺', '🎻', '🥁', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚜', '✈️', '🚀', '🛸', '🚁', '⛵', '🚤', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'];

module.exports = {
    command: "memory",
    alias: ["memorygrid", "mg", "braintrain"],
    category: "games",
    description: "VEX AI MemoryGrid - Memorize the emoji grid and repeat in order",

    async execute(m, sock, { args }) {
        const chatId = m.chat;
        const userId = m.sender;

        // =========================
        // 1. START NEW GAME
        // =========================
        if (args[0]?.toLowerCase() === 'start') {
            const difficulty = args[1]?.toLowerCase() || 'easy';

            if (games.has(chatId)) {
                const game = games.get(chatId);
                const phase = game.phase;
                if (phase === 'showing') {
                    return m.reply(`⚡ Game already running!\n\n📝 Memorizing phase...\n⏱️ Wait for grid to disappear\n\nPhase: *${phase}*`);
                } else {
                    return m.reply(`⚡ Game already running!\n\n📝 Type phase - enter the emojis in order\n\n➤.memory <emoji1> <emoji2> <emoji3>...\n➤.memory stop to end`);
                }
            }

            let gridSize, showTime;
            switch (difficulty) {
                case 'hard':
                    gridSize = 5; // 5x5 = 25
                    showTime = 8;
                    break;
                case 'medium':
                    gridSize = 4; // 4x4 = 16
                    showTime = 6;
                    break;
                default:
                    gridSize = 3; // 3x3 = 9
                    showTime = 5;
            }

            // Generate random grid
            const shuffled = [...EMOJIS].sort(() => Math.random() - 0.5);
            const gridEmojis = shuffled.slice(0, gridSize * gridSize);
            const gridDisplay = formatGrid(gridEmojis, gridSize);

            games.set(chatId, {
                grid: gridEmojis,
                gridSize: gridSize,
                difficulty: difficulty,
                phase: 'showing',
                startTime: Date.now(),
                players: new Map(),
                winner: null
            });

            const game = games.get(chatId);

            // Send grid
            await sock.sendMessage(chatId, {
                text: `🧠 *MEMORY GRID STARTED*\n\n📊 Difficulty: *${difficulty.toUpperCase()}*\n📐 Grid: ${gridSize}x${gridSize}\n⏱️ Memorize Time: ${showTime}s\n\n${gridDisplay}\n\n⚠️ *MEMORIZE THIS GRID!*\nIt will disappear in ${showTime} seconds...`,
                mentions: []
            });

            // Hide grid after showTime
            setTimeout(async () => {
                if (!games.has(chatId) || games.get(chatId).phase!== 'showing') return;

                game.phase = 'typing';
                game.typeStartTime = Date.now();

                await sock.sendMessage(chatId, {
                    text: `⏰ *TIME'S UP!*\n\n📝 Now type the emojis in order from *left to right, top to bottom*\n\nExample:.memory 🍎 🍌 🍇...\n\n➤.memory <emoji1> <emoji2> <emoji3>...\n➤.memory stop to end`,
                    mentions: []
                });

                // Auto end after 60s typing time
                setTimeout(() => {
                    endMemoryGame(chatId, sock);
                }, 60000);

            }, showTime * 1000);

            return;
        }

        // =========================
        // 2. STOP GAME
        // =========================
        if (args[0]?.toLowerCase() === 'stop') {
            if (!games.has(chatId)) return m.reply('❌ No active game. Start with.memory start');

            games.delete(chatId);
            return sock.sendMessage(chatId, {
                text: `🏁 *MEMORY GRID ENDED*\n\nGame stopped!\n\n*Next game?* Try:.bomb or.emoji`,
                mentions: []
            });
        }

        // =========================
        // 3. SUBMIT ANSWER
        // =========================
        if (!games.has(chatId)) {
            return m.reply('❌ No active game. Start with *.memory start*\n\nDifficulties:.memory start easy/medium/hard');
        }

        const game = games.get(chatId);

        if (game.phase!== 'typing') {
            return m.reply('⏳ Still showing grid... Wait for it to disappear!');
        }

        if (game.players.has(userId)) {
            return m.reply('❌ You already submitted! Wait for results.');
        }

        const userEmojis = args.filter(arg => arg.trim().length > 0);

        if (userEmojis.length!== game.grid.length) {
            return m.reply(`❌ Wrong amount! Grid has *${game.grid.length}* emojis\nYou entered: ${userEmojis.length}\n\nFormat:.memory 🍎 🍌 🍇...`);
        }

        // =========================
        // 4. CHECK ANSWER
        // =========================
        const timeTaken = ((Date.now() - game.typeStartTime) / 1000).toFixed(2);
        let correct = 0;

        for (let i = 0; i < game.grid.length; i++) {
            if (userEmojis[i] === game.grid[i]) correct++;
        }

        const accuracy = Math.round((correct / game.grid.length) * 100);
        game.players.set(userId, { correct, accuracy, time: parseFloat(timeTaken), name: m.pushName || userId.split('@')[0] });

        // Check if perfect
        if (correct === game.grid.length) {
            if (!game.winner) {
                game.winner = { user: userId, time: parseFloat(timeTaken), name: m.pushName || userId.split('@')[0] };

                await sock.sendMessage(chatId, {
                    text: `🎉 *PERFECT!* @${userId.split('@')[0]}\n\n🥇 First to complete!\n✅ Score: ${correct}/${game.grid.length} (${accuracy}%)\n⏱️ Time: ${timeTaken}s\n👤 Players: ${game.players.size}\n\nWaiting for others... Game ends in 10s`,
                    mentions: [userId]
                }, { quoted: m });

                // End game after 10s
                setTimeout(() => endMemoryGame(chatId, sock), 10000);
            } else {
                await sock.sendMessage(chatId, {
                    text: `✅ *CORRECT!* @${userId.split('@')[0]}\n\n✅ Score: ${correct}/${game.grid.length} (${accuracy}%)\n⏱️ Time: ${timeTaken}s\n📊 Position: #${game.players.size}`,
                    mentions: [userId]
                }, { quoted: m });
            }
        } else {
            await sock.sendMessage(chatId, {
                text: `📊 *RESULT* @${userId.split('@')[0]}\n\n✅ Correct: ${correct}/${game.grid.length}\n📈 Accuracy: ${accuracy}%\n⏱️ Time: ${timeTaken}s\n\n❌ Mistakes found. Try again next round!`,
                mentions: [userId]
            }, { quoted: m });
        }
    }
};

// =========================
// FORMAT GRID DISPLAY
// =========================
function formatGrid(emojis, size) {
    let grid = '';
    for (let i = 0; i < emojis.length; i++) {
        grid += emojis[i] + ' ';
        if ((i + 1) % size === 0) grid += '\n';
    }
    return grid.trim();
}

// =========================
// END MEMORY GAME
// =========================
async function endMemoryGame(chatId, sock) {
    if (!games.has(chatId)) return;

    const game = games.get(chatId);
    games.delete(chatId);

    let resultText = `🏁 *MEMORY GRID ENDED*\n\n📊 Difficulty: *${game.difficulty.toUpperCase()}*\n📐 Grid: ${game.gridSize}x${game.gridSize}\n👤 Total Players: ${game.players.size}\n\n`;

    if (game.winner) {
        resultText += `🥇 *WINNER*\n@${game.winner.user.split('@')[0]} - ${game.winner.time}s\n\n`;
    }

    if (game.players.size > 0) {
        resultText += `📊 *LEADERBOARD*\n`;
        const sorted = [...game.players.values()].sort((a, b) => b.accuracy - a.accuracy || a.time - b.time);

        sorted.slice(0, 5).forEach((player, i) => {
            const medal = i === 0? '🥇' : i === 1? '🥈' : i === 2? '🥉' : `${i + 1}.`;
            resultText += `${medal} ${player.name}: ${player.correct}/${game.grid.length} (${player.accuracy}%) - ${player.time}s\n`;
        });
    } else {
        resultText += `❌ No players submitted answers!`;
    }

    resultText += `\n*Next game?* Try:.bomb or.emoji`;

    await sock.sendMessage(chatId, {
        text: resultText,
        mentions: game.winner? [game.winner.user] : []
    });
}
