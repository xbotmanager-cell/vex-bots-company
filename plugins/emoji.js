const games = new Map(); // game state per group

// 100 emoji puzzles - movies, phrases, songs, etc
const PUZZLES = [
    { emoji: "🎬🦁👑", answer: "lion king" },
    { emoji: "🕷️👨", answer: "spiderman" },
    { emoji: "🧊❄️👸", answer: "frozen" },
    { emoji: "🚗⚡", answer: "cars" },
    { emoji: "🐠🔍", answer: "finding nemo" },
    { emoji: "👨‍🚀🌌", answer: "interstellar" },
    { emoji: "🦇👨", answer: "batman" },
    { emoji: "🧙‍♂️💍", answer: "lord of the rings" },
    { emoji: "⚡🧙‍♂️", answer: "harry potter" },
    { emoji: "🦖🌴", answer: "jurassic park" },
    { emoji: "👻", answer: "ghostbusters" },
    { emoji: "🤖🚗", answer: "transformers" },
    { emoji: "🏠🎈", answer: "up" },
    { emoji: "🐼🥋", answer: "kung fu panda" },
    { emoji: "👽📞", answer: "et" },
    { emoji: "🦈🌊", answer: "jaws" },
    { emoji: "👑💍", answer: "the crown" },
    { emoji: "🏝️⚽", answer: "cast away" },
    { emoji: "🔫💀", answer: "james bond" },
    { emoji: "👨‍👩‍👧‍👦🏠", answer: "home alone" },
    { emoji: "🎭😢😂", answer: "drama" },
    { emoji: "🎵🎸", answer: "music" },
    { emoji: "☕📚", answer: "coffee and books" },
    { emoji: "🌙🌃", answer: "good night" },
    { emoji: "☀️🏖️", answer: "summer" },
    { emoji: "❄️⛄", answer: "winter" },
    { emoji: "🍕🇮🇹", answer: "pizza" },
    { emoji: "🍔🍟", answer: "fast food" },
    { emoji: "🎂🎉", answer: "birthday" },
    { emoji: "💍👰", answer: "wedding" },
    { emoji: "🎓📜", answer: "graduation" },
    { emoji: "✈️🌍", answer: "travel" },
    { emoji: "🏆🥇", answer: "winner" },
    { emoji: "💔😭", answer: "heartbreak" },
    { emoji: "😴💤", answer: "sleep" },
    { emoji: "🏃‍♂️💨", answer: "running" },
    { emoji: "📱💬", answer: "texting" },
    { emoji: "🎮🕹️", answer: "gaming" },
    { emoji: "💪🏋️", answer: "gym" },
    { emoji: "🎨🖌️", answer: "painting" },
    { emoji: "📸🌅", answer: "photography" },
    { emoji: "🍿🎬", answer: "movie night" },
    { emoji: "🚀🌕", answer: "moon landing" },
    { emoji: "🌮🌶️", answer: "tacos" },
    { emoji: "🍣🇯🇵", answer: "sushi" },
    { emoji: "🐱❤️", answer: "cat love" },
    { emoji: "🐶🦴", answer: "dog bone" },
    { emoji: "🌧️☂️", answer: "rainy day" },
    { emoji: "🔥🌶️", answer: "spicy" },
    { emoji: "🧠💡", answer: "idea" },
    { emoji: "⏰⏳", answer: "time" },
    { emoji: "💰💸", answer: "money" },
    { emoji: "🎯🏹", answer: "target" },
    { emoji: "🔐🔑", answer: "secret" },
    { emoji: "🌈🦄", answer: "unicorn" },
    { emoji: "👑🤴", answer: "king" },
    { emoji: "👸👑", answer: "queen" },
    { emoji: "🧟‍♂️🧠", answer: "zombie" },
    { emoji: "👻🏚️", answer: "haunted house" },
    { emoji: "🎃👻", answer: "halloween" },
    { emoji: "🎄🎅", answer: "christmas" },
    { emoji: "🐰🥚", answer: "easter" },
    { emoji: "💘💑", answer: "love" },
    { emoji: "👶🍼", answer: "baby" },
    { emoji: "🎁🎀", answer: "gift" },
    { emoji: "📺🛋️", answer: "netflix" },
    { emoji: "🍳🥓", answer: "breakfast" },
    { emoji: "🍝🍷", answer: "dinner" },
    { emoji: "🏖️🍹", answer: "vacation" },
    { emoji: "⛰️🥾", answer: "hiking" },
    { emoji: "🏊‍♂️🌊", answer: "swimming" },
    { emoji: "🚴‍♂️💨", answer: "cycling" },
    { emoji: "⚽🥅", answer: "football" },
    { emoji: "🏀🏆", answer: "basketball" },
    { emoji: "🎾🏸", answer: "tennis" },
    { emoji: "🎤🎶", answer: "singing" },
    { emoji: "🥁🎵", answer: "drums" },
    { emoji: "🎹🎼", answer: "piano" },
    { emoji: "🎻", answer: "violin" },
    { emoji: "📖✏️", answer: "studying" },
    { emoji: "🧪🔬", answer: "science" },
    { emoji: "💻👨‍💻", answer: "coding" },
    { emoji: "🌐🔗", answer: "internet" },
    { emoji: "📧✉️", answer: "email" },
    { emoji: "🗝️🔓", answer: "unlock" },
    { emoji: "🚪🚶", answer: "exit" },
    { emoji: "🛒🛍️", answer: "shopping" },
    { emoji: "💊🏥", answer: "medicine" },
    { emoji: "🦷😁", answer: "dentist" },
    { emoji: "👁️👀", answer: "eyes" },
    { emoji: "👂🎧", answer: "listening" },
    { emoji: "👃🌸", answer: "smell" },
    { emoji: "👅🍭", answer: "taste" },
    { emoji: "🖐️🤝", answer: "handshake" },
    { emoji: "🦵🏃", answer: "legs" },
    { emoji: "🧠📚", answer: "knowledge" },
    { emoji: "😂🤣", answer: "funny" },
    { emoji: "😡💢", answer: "angry" },
    { emoji: "😍🥰", answer: "love" },
    { emoji: "😱😨", answer: "scared" },
    { emoji: "🤔💭", answer: "thinking" },
    { emoji: "😎🕶️", answer: "cool" }
];

module.exports = {
    command: "emoji",
    alias: ["emojiguess", "translate", "etranslate"],
    category: "games",
    description: "VEX AI EmojiTranslate - Guess the word/phrase from emojis",

    async execute(m, sock, { args }) {
        const chatId = m.chat;
        const userId = m.sender;

        // =========================
        // 1. START NEW GAME
        // =========================
        if (args[0]?.toLowerCase() === 'start' || args[0]?.toLowerCase() === 'new') {
            if (games.has(chatId)) {
                const game = games.get(chatId);
                return m.reply(`⚡ Puzzle already running!\n\n🧩 ${game.puzzle.emoji}\n🎲 Attempts: ${game.attempts}\n\n➤.emoji <answer> to guess\n➤.emoji hint for clue\n➤.emoji stop to end`);
            }

            const puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
            const timeLimit = 60; // 60 seconds

            games.set(chatId, {
                puzzle: puzzle,
                attempts: 0,
                maxAttempts: 10,
                players: new Set(),
                startTime: Date.now(),
                endTime: Date.now() + (timeLimit * 1000),
                hintUsed: false
            });

            // Auto end after time limit
            setTimeout(() => {
                endEmojiGame(chatId, sock);
            }, timeLimit * 1000);

            return sock.sendMessage(chatId, {
                text: `🧩 *EMOJI TRANSLATE STARTED*\n\n${puzzle.emoji}\n\n⏱️ Time: ${timeLimit} seconds\n🎲 Max Attempts: 10\n\n*Rules*:\n1️⃣ Guess the word/phrase from emojis\n2️⃣ Type answer in lowercase\n3️⃣ First correct answer wins\n\n➤.emoji <answer> to guess\n➤.emoji hint for clue\n➤.emoji stop to end`,
                mentions: []
            });
        }

        // =========================
        // 2. STOP GAME
        // =========================
        if (args[0]?.toLowerCase() === 'stop') {
            if (!games.has(chatId)) return m.reply('❌ No active puzzle. Start with.emoji start');

            const game = games.get(chatId);
            games.delete(chatId);

            return sock.sendMessage(chatId, {
                text: `🏁 *EMOJI PUZZLE ENDED*\n\n🧩 ${game.puzzle.emoji}\n✅ Answer: *${game.puzzle.answer.toUpperCase()}*\n🎲 Attempts: ${game.attempts}/${game.maxAttempts}\n👤 Players: ${game.players.size}\n\nPuzzle stopped!\n\n*Next game?* Try:.bomb or.type`,
                mentions: []
            });
        }

        // =========================
        // 3. HINT
        // =========================
        if (args[0]?.toLowerCase() === 'hint') {
            if (!games.has(chatId)) return m.reply('❌ No active puzzle. Start with.emoji start');

            const game = games.get(chatId);
            if (game.hintUsed) return m.reply('❌ Hint already used!');

            game.hintUsed = true;
            const answer = game.puzzle.answer;
            const hint = answer.split(' ').map(word => {
                if (word.length <= 2) return word;
                return word[0] + '_'.repeat(word.length - 2) + word[word.length - 1];
            }).join(' ');

            return m.reply(`💡 *HINT*\n\n🧩 ${game.puzzle.emoji}\n🔤 ${hint}\n📝 ${answer.split(' ').length} word(s)`);
        }

        // =========================
        // 4. GUESS ANSWER
        // =========================
        if (!games.has(chatId)) {
            return m.reply('❌ No active puzzle. Start with *.emoji start*');
        }

        const game = games.get(chatId);
        const guess = args.join(' ').toLowerCase().trim();

        if (!guess) return m.reply('❌ Type your answer\nExample:.emoji lion king');

        // Check if game expired
        if (Date.now() >= game.endTime) {
            return endEmojiGame(chatId, sock);
        }

        game.attempts++;
        game.players.add(userId);

        // Check if correct
        if (guess === game.puzzle.answer.toLowerCase()) {
            const timeTaken = ((Date.now() - game.startTime) / 1000).toFixed(1);
            games.delete(chatId);

            return sock.sendMessage(chatId, {
                text: `🎉 *CORRECT!* @${userId.split('@')[0]} wins!\n\n🧩 ${game.puzzle.emoji}\n✅ Answer: *${game.puzzle.answer.toUpperCase()}*\n⏱️ Time: ${timeTaken}s\n🎲 Attempts: ${game.attempts}/${game.maxAttempts}\n👤 Players: ${game.players.size}\n\n🏆 GG!\n\n*Next game?* Try:.bomb or.type`,
                mentions: [userId]
            });
        }

        // Check if max attempts reached
        if (game.attempts >= game.maxAttempts) {
            return endEmojiGame(chatId, sock);
        }

        // Wrong answer
        const remaining = game.maxAttempts - game.attempts;
        await m.reply(`❌ *WRONG!* ${guess.toUpperCase()}\n\n🧩 ${game.puzzle.emoji}\n🎲 Attempts: ${game.attempts}/${game.maxAttempts}\n⏳ Remaining: ${remaining}\n\nTry again!`);
    }
};

// =========================
// END EMOJI GAME
// =========================
async function endEmojiGame(chatId, sock) {
    if (!games.has(chatId)) return;

    const game = games.get(chatId);
    games.delete(chatId);

    await sock.sendMessage(chatId, {
        text: `💥 *GAME OVER!*\n\n🧩 ${game.puzzle.emoji}\n✅ Answer: *${game.puzzle.answer.toUpperCase()}*\n🎲 Attempts: ${game.attempts}/${game.maxAttempts}\n👤 Players: ${game.players.size}\n\nNobody got it!\n\n*Next game?* Try:.bomb or.type`,
        mentions: []
    });
}
