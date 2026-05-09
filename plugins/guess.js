const games = new Map(); // game state per group

module.exports = {
    command: "guess",
    alias: ["numberguess", "ng", "guessing"],
    category: "games",
    description: "VEX AI NumberGuess - Guess the number between 1-1000",

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
                return m.reply(`⚡ Game already running!\n\n🎯 Range: 1-${game.max}\n👤 Turn: @${game.turn.split('@')[0]}\n🎲 Attempts: ${game.attempts}\n\n➤.guess <number> to play\n➤.guess stop to end`, {
                    mentions: [game.turn]
                });
            }

            let max, maxAttempts;
            switch (difficulty) {
                case 'hard':
                    max = 10000;
                    maxAttempts = 15;
                    break;
                case 'medium':
                    max = 1000;
                    maxAttempts = 12;
                    break;
                default:
                    max = 100;
                    maxAttempts = 10;
            }

            const secretNumber = Math.floor(Math.random() * max) + 1;

            games.set(chatId, {
                number: secretNumber,
                max: max,
                attempts: 0,
                maxAttempts: maxAttempts,
                turn: userId,
                players: new Set([userId]),
                score: { [userId]: 0 },
                startTime: Date.now(),
                difficulty: difficulty
            });

            return sock.sendMessage(chatId, {
                text: `🎲 *NUMBER GUESS STARTED*\n\n🎯 Difficulty: *${difficulty.toUpperCase()}*\n🔢 Range: *1-${max}*\n🎲 Max Attempts: ${maxAttempts}\n👤 First Turn: @${userId.split('@')[0]}\n\n*Rules*:\n1️⃣ Guess the secret number\n2️⃣ Bot will say HIGHER or LOWER\n3️⃣ First to guess wins\n\n➤.guess <number> to play\n➤.guess stop to end`,
                mentions: [userId]
            });
        }

        // =========================
        // 2. STOP GAME
        // =========================
        if (args[0]?.toLowerCase() === 'stop') {
            if (!games.has(chatId)) return m.reply('❌ No active game. Start with.guess start');

            const game = games.get(chatId);
            const duration = Math.floor((Date.now() - game.startTime) / 1000);

            games.delete(chatId);

            return sock.sendMessage(chatId, {
                text: `🏁 *NUMBER GUESS ENDED*\n\n🔢 Secret Number: *${game.number}*\n🎲 Attempts: ${game.attempts}/${game.maxAttempts}\n⏱️ Duration: ${duration}s\n📊 Players: ${game.players.size}\n\nGame stopped!\n\n*Next game?* Try:.bomb or.chain`,
                mentions: []
            });
        }

        // =========================
        // 3. PLAY - GUESS NUMBER
        // =========================
        if (!games.has(chatId)) {
            return m.reply('❌ No active game. Start with *.guess start*\n\nDifficulties:.guess start easy/medium/hard');
        }

        const game = games.get(chatId);
        const guess = parseInt(args[0]);

        if (isNaN(guess)) return m.reply(`❌ Type a number\nExample:.guess 50`);

        if (guess < 1 || guess > game.max) {
            return m.reply(`❌ Number must be between *1-${game.max}*`);
        }

        // =========================
        // 4. CHECK GUESS
        // =========================
        game.attempts++;
        game.players.add(userId);
        game.score[userId] = (game.score[userId] || 0) + 1;
        game.turn = userId;

        // Check if correct
        if (guess === game.number) {
            const duration = Math.floor((Date.now() - game.startTime) / 1000);
            games.delete(chatId);

            return sock.sendMessage(chatId, {
                text: `🎉 *CORRECT!* @${userId.split('@')[0]} wins!\n\n🔢 Secret Number: *${game.number}*\n🎲 Attempts: ${game.attempts}/${game.maxAttempts}\n⏱️ Duration: ${duration}s\n📊 Players: ${game.players.size}\n\n🏆 GG!\n\n*Next game?* Try:.bomb or.chain`,
                mentions: [userId]
            });
        }

        // Check if max attempts reached
        if (game.attempts >= game.maxAttempts) {
            games.delete(chatId);
            return sock.sendMessage(chatId, {
                text: `💥 *GAME OVER!*\n\n🔢 Secret Number: *${game.number}*\n🎲 Attempts: ${game.attempts}/${game.maxAttempts}\n\nNobody guessed it!\n\n*Next game?* Try:.bomb or.chain`,
                mentions: []
            });
        }

        // Give hint
        const hint = guess < game.number? '📈 HIGHER' : '📉 LOWER';
        const remaining = game.maxAttempts - game.attempts;

        // Leaderboard
        const sorted = Object.entries(game.score).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const leaderboard = sorted.map((s, i) => {
            const medal = i === 0? '🥇' : i === 1? '🥈' : '🥉';
            return `${medal} @${s[0].split('@')[0]}: ${s[1]} guesses`;
        }).join('\n');

        await sock.sendMessage(chatId, {
            text: `❌ *${guess}* - ${hint}!\n\n🎯 Range: 1-${game.max}\n🎲 Attempts: ${game.attempts}/${game.maxAttempts}\n⏳ Remaining: ${remaining}\n👤 Turn: @${userId.split('@')[0]}\n\n*TOP 3*\n${leaderboard}\n\n➤.guess <number> continue`,
            mentions: [userId,...sorted.map(s => s[0])]
        }, { quoted: m });
    }
};
