const games = new Map(); // game state per group

module.exports = {
    command: "chain",
    alias: ["wordchain", "wchain"],
    category: "games",
    description: "VEX AI WordChain - Next word starts with last letter of previous word",

    async execute(m, sock, { args }) {
        const chatId = m.chat;
        const userId = m.sender;
        const userName = m.pushName || userId.split('@')[0];

        // =========================
        // 1. START NEW GAME
        // =========================
        if (args[0]?.toLowerCase() === 'start') {
            if (games.has(chatId)) {
                return m.reply(`⚡ Game already running!\n\nLast word: *${games.get(chatId).lastWord}*\nTurn: @${games.get(chatId).turn.split('@')[0]}\n\n➤.chain <word> to play\n➤.chain stop to end`, {
                    mentions: [games.get(chatId).turn]
                });
            }

            const startWords = ['APPLE', 'ELEPHANT', 'TIGER', 'ROBOT', 'PYTHON', 'ORANGE', 'GIRAFFE', 'DIAMOND'];
            const firstWord = startWords[Math.floor(Math.random() * startWords.length)];

            games.set(chatId, {
                lastWord: firstWord,
                usedWords: new Set([firstWord.toLowerCase()]),
                turn: userId,
                players: new Set([userId]),
                score: { [userId]: 1 },
                startTime: Date.now()
            });

            return sock.sendMessage(chatId, {
                text: `🔗 *WORDCHAIN STARTED*\n\n📝 First word: *${firstWord}*\n👤 Turn: @${userId.split('@')[0]}\n\n*Rules*:\n1️⃣ Word must start with *${firstWord.slice(-1).toUpperCase()}*\n2️⃣ No repeating words\n3️⃣ Minimum 3 letters\n\n➤.chain <word> to play\n➤.chain stop to end`,
                mentions: [userId]
            });
        }

        // =========================
        // 2. STOP GAME
        // =========================
        if (args[0]?.toLowerCase() === 'stop') {
            if (!games.has(chatId)) return m.reply('❌ No active game. Start with.chain start');

            const game = games.get(chatId);
            const winner = Object.keys(game.score).reduce((a, b) => game.score[a] > game.score[b]? a : b);
            const duration = Math.floor((Date.now() - game.startTime) / 1000);

            games.delete(chatId);

            return sock.sendMessage(chatId, {
                text: `🏁 *WORDCHAIN ENDED*\n\n👑 Winner: @${winner.split('@')[0]}\n🏆 Score: ${game.score[winner]} words\n⏱️ Duration: ${duration}s\n📊 Players: ${game.players.size}\n\nGG!\n\n*Next game?* Try:.bomb or.guess`,
                mentions: [winner]
            });
        }

        // =========================
        // 3. PLAY - ANSWER WORD
        // =========================
        if (!games.has(chatId)) {
            return m.reply('❌ No active game. Start with *.chain start*');
        }

        const game = games.get(chatId);
        const answer = args.join('').toUpperCase().replace(/[^A-Z]/g, '');

        if (!answer) return m.reply(`❌ Type a word\nExample:.chain ${game.lastWord.slice(-1).toUpperCase()}ION`);

        // Validation
        if (answer.length < 3) return m.reply('❌ Word must be 3+ letters');
        if (answer[0]!== game.lastWord.slice(-1).toUpperCase()) {
            return m.reply(`❌ Word must start with *${game.lastWord.slice(-1).toUpperCase()}*\n\nLast word: *${game.lastWord}*`);
        }
        if (game.usedWords.has(answer.toLowerCase())) {
            return m.reply(`❌ *${answer}* already used!\n\nTry another word starting with *${game.lastWord.slice(-1).toUpperCase()}*`);
        }

        // =========================
        // 4. CORRECT - UPDATE GAME
        // =========================
        game.usedWords.add(answer.toLowerCase());
        game.lastWord = answer;
        game.players.add(userId);
        game.score[userId] = (game.score[userId] || 0) + 1;
        game.turn = userId;

        // Leaderboard
        const sorted = Object.entries(game.score).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const leaderboard = sorted.map((s, i) => {
            const medal = i === 0? '🥇' : i === 1? '🥈' : '🥉';
            return `${medal} @${s[0].split('@')[0]}: ${s[1]}`;
        }).join('\n');

        await sock.sendMessage(chatId, {
            text: `✅ *${answer}* - Correct!\n\n📝 New word: *${answer}*\n👤 Turn: @${userId.split('@')[0]}\n🔤 Start with: *${answer.slice(-1)}*\n\n*TOP 3*\n${leaderboard}\n\n➤.chain <word> continue`,
            mentions: [userId,...sorted.map(s => s[0])]
        }, { quoted: m });
    }
};
