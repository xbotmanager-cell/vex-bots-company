const games = new Map(); // game state per group

// Common syllables for bomb party
const SYLLABLES = [
    'AR', 'ER', 'IR', 'OR', 'UR', 'AN', 'EN', 'IN', 'ON', 'UN',
    'AT', 'ET', 'IT', 'OT', 'UT', 'AL', 'EL', 'IL', 'OL', 'UL',
    'AS', 'ES', 'IS', 'OS', 'US', 'AM', 'EM', 'IM', 'OM', 'UM',
    'AP', 'EP', 'IP', 'OP', 'UP', 'AK', 'EK', 'IK', 'OK', 'UK',
    'AD', 'ED', 'ID', 'OD', 'UD', 'AG', 'EG', 'IG', 'OG', 'UG',
    'AB', 'EB', 'IB', 'OB', 'UB', 'AC', 'EC', 'IC', 'OC', 'UC',
    'BR', 'CR', 'DR', 'FR', 'GR', 'PR', 'TR', 'ST', 'SP', 'SK'
];

module.exports = {
    command: "bomb",
    alias: ["bombparty", "syllable", "party"],
    category: "games",
    description: "VEX AI BombParty - Type word containing the syllable before bomb explodes",

    async execute(m, sock, { args }) {
        const chatId = m.chat;
        const userId = m.sender;

        // =========================
        // 1. START NEW GAME
        // =========================
        if (args[0]?.toLowerCase() === 'start') {
            if (games.has(chatId)) {
                const game = games.get(chatId);
                return m.reply(`💣 Bomb already active!\n\nSyllable: *${game.syllable}*\n⏱️ Time: ${Math.max(0, Math.floor((game.endTime - Date.now()) / 1000))}s\n👤 Turn: @${game.turn.split('@')[0]}\n\n➤.bomb <word> to defuse`, {
                    mentions: [game.turn]
                });
            }

            const syllable = SYLLABLES[Math.floor(Math.random() * SYLLABLES.length)];
            const timeLimit = 10; // 10 seconds

            games.set(chatId, {
                syllable: syllable,
                turn: userId,
                players: new Set([userId]),
                score: { [userId]: 0 },
                lives: { [userId]: 3 },
                endTime: Date.now() + (timeLimit * 1000),
                timer: null
            });

            // Start bomb timer
            const game = games.get(chatId);
            game.timer = setTimeout(() => {
                explodeBomb(chatId, sock);
            }, timeLimit * 1000);

            return sock.sendMessage(chatId, {
                text: `💣 *BOMB PARTY STARTED*\n\n🔤 Syllable: *${syllable}*\n⏱️ Time: ${timeLimit}s\n👤 Turn: @${userId.split('@')[0]}\n❤️ Lives: 3\n\n*Rules*:\n1️⃣ Type word containing *${syllable}*\n2️⃣ Minimum 3 letters\n3️⃣ Don't repeat words\n4️⃣ You have ${timeLimit}s or BOOM!\n\n➤.bomb <word> to defuse`,
                mentions: [userId]
            });
        }

        // =========================
        // 2. STOP GAME
        // =========================
        if (args[0]?.toLowerCase() === 'stop') {
            if (!games.has(chatId)) return m.reply('❌ No active bomb. Start with.bomb start');

            const game = games.get(chatId);
            clearTimeout(game.timer);
            const winner = Object.keys(game.score).reduce((a, b) => game.score[a] > game.score[b]? a : b);

            games.delete(chatId);

            return sock.sendMessage(chatId, {
                text: `🏁 *BOMB PARTY ENDED*\n\n👑 Winner: @${winner.split('@')[0]}\n🏆 Words defused: ${game.score[winner]}\n📊 Players: ${game.players.size}\n\nGG!\n\n*Next game?* Try:.chain or.guess`,
                mentions: [winner]
            });
        }

        // =========================
        // 3. DEFUSE - ANSWER WORD
        // =========================
        if (!games.has(chatId)) {
            return m.reply('❌ No active bomb. Start with *.bomb start*');
        }

        const game = games.get(chatId);
        const answer = args.join('').toUpperCase().replace(/[^A-Z]/g, '');

        if (!answer) return m.reply(`❌ Type a word containing *${game.syllable}*\nExample:.bomb ${game.syllable}T`);

        // Check if time expired
        if (Date.now() >= game.endTime) {
            clearTimeout(game.timer);
            return explodeBomb(chatId, sock);
        }

        // Validation
        if (answer.length < 3) return m.reply('❌ Word must be 3+ letters');
        if (!answer.includes(game.syllable)) {
            return m.reply(`❌ Word must contain *${game.syllable}*\n⏱️ Time: ${Math.max(0, Math.floor((game.endTime - Date.now()) / 1000))}s`);
        }

        // =========================
        // 4. CORRECT - DEFUSED
        // =========================
        clearTimeout(game.timer);
        game.players.add(userId);
        game.score[userId] = (game.score[userId] || 0) + 1;
        game.lives[userId] = game.lives[userId] || 3;

        // New syllable for next round
        const newSyllable = SYLLABLES[Math.floor(Math.random() * SYLLABLES.length)];
        const timeLimit = 10;
        game.syllable = newSyllable;
        game.endTime = Date.now() + (timeLimit * 1000);
        game.turn = userId;

        // Start new bomb timer
        game.timer = setTimeout(() => {
            explodeBomb(chatId, sock);
        }, timeLimit * 1000);

        // Leaderboard
        const sorted = Object.entries(game.score).sort((a, b) => b[1] - a[1]).slice(0, 3);
        const leaderboard = sorted.map((s, i) => {
            const medal = i === 0? '🥇' : i === 1? '🥈' : '🥉';
            const hearts = '❤️'.repeat(game.lives[s[0]] || 0);
            return `${medal} @${s[0].split('@')[0]}: ${s[1]} ${hearts}`;
        }).join('\n');

        await sock.sendMessage(chatId, {
            text: `✅ *${answer}* - DEFUSED!\n\n💣 NEW BOMB\n🔤 Syllable: *${newSyllable}*\n⏱️ Time: ${timeLimit}s\n👤 Turn: @${userId.split('@')[0]}\n\n*TOP 3*\n${leaderboard}\n\n➤.bomb <word> defuse`,
            mentions: [userId,...sorted.map(s => s[0])]
        }, { quoted: m });
    }
};

// =========================
// BOMB EXPLOSION HANDLER
// =========================
async function explodeBomb(chatId, sock) {
    if (!games.has(chatId)) return;

    const game = games.get(chatId);
    const victim = game.turn;
    game.lives[victim] = (game.lives[victim] || 3) - 1;

    if (game.lives[victim] <= 0) {
        // Player eliminated
        const remaining = Object.keys(game.lives).filter(p => game.lives[p] > 0);

        if (remaining.length <= 1) {
            // Game over
            const winner = remaining[0] || victim;
            games.delete(chatId);

            return sock.sendMessage(chatId, {
                text: `💥 *BOOM!* @${victim.split('@')[0]} eliminated!\n\n🏁 *BOMB PARTY ENDED*\n\n👑 Winner: @${winner.split('@')[0]}\n🏆 Words defused: ${game.score[winner] || 0}\n\nGG!\n\n*Next game?* Try:.chain or.guess`,
                mentions: [victim, winner]
            });
        }

        await sock.sendMessage(chatId, {
            text: `💥 *BOOM!* @${victim.split('@')[0]} eliminated!\n❤️ Lives left: ${Object.keys(game.lives).filter(p => game.lives[p] > 0).length} players\n\nGame continues...`,
            mentions: [victim]
        });
    } else {
        await sock.sendMessage(chatId, {
            text: `💥 *BOOM!* @${victim.split('@')[0]} lost a life!\n❤️ Lives: ${game.lives[victim]}\n\nGame continues...`,
            mentions: [victim]
        });
    }

    // Start new round
    const newSyllable = SYLLABLES[Math.floor(Math.random() * SYLLABLES.length)];
    const timeLimit = 10;
    game.syllable = newSyllable;
    game.endTime = Date.now() + (timeLimit * 1000);

    game.timer = setTimeout(() => {
        explodeBomb(chatId, sock);
    }, timeLimit * 1000);

    await sock.sendMessage(chatId, {
        text: `💣 *NEW BOMB*\n\n🔤 Syllable: *${newSyllable}*\n⏱️ Time: ${timeLimit}s\n👤 Turn: @${victim.split('@')[0]}\n❤️ Lives: ${game.lives[victim]}\n\n➤.bomb <word> defuse`,
        mentions: [victim]
    });
}
