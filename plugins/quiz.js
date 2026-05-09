const games = new Map(); // game state per group

// Question pools - English code
const QUESTIONS = [
    { q: "Capital city of Tanzania?", a: "DODOMA", c: ["DAR ES SALAAM", "DODOMA", "ARUSHA", "MWANZA"] },
    { q: "Tallest mountain in Africa?", a: "KILIMANJARO", c: ["KENYA", "KILIMANJARO", "ELGON", "MERU"] },
    { q: "Largest lake in Africa?", a: "VICTORIA", c: ["TANGANYIKA", "VICTORIA", "MALAWI", "TURKANA"] },
    { q: "How many colors in Tanzania flag?", a: "4", c: ["3", "5", "4", "6"] },
    { q: "1 + 1 =?", a: "2", c: ["2", "11", "1", "0"] },
    { q: "Who founded WhatsApp?", a: "JAN KOUM", c: ["MARK ZUCKERBERG", "JAN KOUM", "ELON MUSK", "BILL GATES"] },
    { q: "Fastest land animal?", a: "CHEETAH", c: ["LION", "CHEETAH", "LEOPARD", "TIGER"] },
    { q: "Planet closest to sun?", a: "MERCURY", c: ["VENUS", "MERCURY", "EARTH", "MARS"] },
    { q: "Year Tanzania got independence?", a: "1961", c: ["1960", "1961", "1962", "1963"] },
    { q: "What does CPU stand for?", a: "CENTRAL PROCESSING UNIT", c: ["CENTRAL PROCESSING UNIT", "COMPUTER POWER UNIT", "CORE PROCESSING UNIT", "CENTRAL PROGRAM UNIT"] }
];

module.exports = {
    command: "quiz",
    alias: ["trivia", "question", "qz"],
    category: "games",
    description: "VEX AI Quiz - Answer trivia questions and earn points",

    async execute(m, sock, { args }) {
        const chatId = m.chat;
        const userId = m.sender;

        // =========================
        // 1. START NEW GAME
        // =========================
        if (args[0]?.toLowerCase() === 'start') {
            if (games.has(chatId)) {
                const game = games.get(chatId);
                const options = game.current.c.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n');
                return m.reply(`⚡ Quiz already active!\n\n❓ *Question:* ${game.current.q}\n\n${options}\n⏱️ Time: ${game.time}s left\n\n➤ Type A, B, C or D\n➤.quiz stop to end`);
            }

            const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
            const shuffledOptions = [...question.c].sort(() => Math.random() - 0.5);
            const correctIndex = shuffledOptions.indexOf(question.a);
            const correctLetter = String.fromCharCode(65 + correctIndex);

            games.set(chatId, {
                current: { q: question.q, a: correctLetter, c: shuffledOptions },
                time: 30,
                startTime: Date.now(),
                players: new Map(),
                winner: null,
                active: true,
                round: 1
            });

            const game = games.get(chatId);
            const options = shuffledOptions.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n');

            await sock.sendMessage(chatId, {
                text: `🧠 *QUIZ STARTED* - Round ${game.round}\n\n❓ *Question:*\n${question.q}\n\n${options}\n\n⏱️ Time: 30 seconds\n⚠️ *TYPE A, B, C OR D*\n\n➤.quiz stop to end`,
                mentions: []
            });

            // Game timer
            const timer = setInterval(async () => {
                if (!games.has(chatId) ||!games.get(chatId).active) {
                    clearInterval(timer);
                    return;
                }

                game.time--;
                if (game.time <= 0) {
                    clearInterval(timer);
                    endQuizGame(chatId, sock);
                } else if (game.time === 15 || game.time === 5) {
                    await sock.sendMessage(chatId, {
                        text: `⏰ *${game.time}s LEFT!* Answer A, B, C or D`
                    });
                }
            }, 1000);

            return;
        }

        // =========================
        // 2. STOP GAME
        // =========================
        if (args[0]?.toLowerCase() === 'stop') {
            if (!games.has(chatId)) return m.reply('❌ No active quiz. Start with.quiz start');

            const game = games.get(chatId);
            game.active = false;
            games.delete(chatId);
            return sock.sendMessage(chatId, {
                text: `🏁 *QUIZ ENDED*\n\n✅ Correct answer was: *${game.current.a}) ${game.current.c[game.current.a.charCodeAt(0) - 65]}*\n\n*Next game?* Try:.memory or.scramble`,
                mentions: []
            });
        }

        // =========================
        // 3. CHECK ANSWER
        // =========================
        if (!games.has(chatId)) {
            return m.reply('❌ No active quiz. Start with *.quiz start*');
        }

        const game = games.get(chatId);
        if (!game.active) return;
        if (game.players.has(userId)) return m.react('⏰');

        const answer = args[0]?.toUpperCase();
        if (!['A', 'B', 'C', 'D'].includes(answer)) return;

        const timeTaken = ((Date.now() - game.startTime) / 1000).toFixed(2);
        const isCorrect = answer === game.current.a;

        game.players.set(userId, {
            correct: isCorrect,
            time: parseFloat(timeTaken),
            answer: answer,
            name: m.pushName || userId.split('@')[0]
        });

        if (isCorrect &&!game.winner) {
            game.winner = {
                user: userId,
                time: parseFloat(timeTaken),
                name: m.pushName || userId.split('@')[0]
            };
            game.active = false;

            await sock.sendMessage(chatId, {
                text: `🎉 *CORRECT!* @${userId.split('@')[0]}\n\n🥇 First to answer!\n✅ Answer: *${game.current.a}) ${game.current.c[game.current.a.charCodeAt(0) - 65]}*\n⏱️ Time: ${timeTaken}s\n\nGame ending...`,
                mentions: [userId]
            }, { quoted: m });

            setTimeout(() => endQuizGame(chatId, sock), 3000);
        } else if (isCorrect) {
            await sock.sendMessage(chatId, {
                text: `✅ *CORRECT!* @${userId.split('@')[0]}\n\n⏱️ Time: ${timeTaken}s\n📊 Position: #${game.players.size}`,
                mentions: [userId]
            }, { quoted: m });
        } else {
            await m.react('❌');
        }
    }
};

// =========================
// END QUIZ GAME
// =========================
async function endQuizGame(chatId, sock) {
    if (!games.has(chatId)) return;

    const game = games.get(chatId);
    games.delete(chatId);

    const correctAnswer = game.current.c[game.current.a.charCodeAt(0) - 65];
    let resultText = `🏁 *QUIZ ENDED* - Round ${game.round}\n\n❓ Question: ${game.current.q}\n✅ Answer: *${game.current.a}) ${correctAnswer}*\n👥 Players: ${game.players.size}\n\n`;

    if (game.winner) {
        resultText += `🥇 *WINNER*\n@${game.winner.user.split('@')[0]} - ${game.winner.time}s\n\n`;
    }

    if (game.players.size > 0) {
        resultText += `📊 *RESULTS*\n`;
        const sorted = [...game.players.values()].sort((a, b) => {
            if (a.correct!== b.correct) return b.correct - a.correct;
            return a.time - b.time;
        });

        sorted.slice(0, 5).forEach((player, i) => {
            const medal = player.correct? (i === 0? '🥇' : i === 1? '🥈' : i === 2? '🥉' : `${i + 1}.`) : '❌';
            const status = player.correct? `${player.time}s` : 'Wrong';
            resultText += `${medal} ${player.name}: ${status}\n`;
        });
    } else {
        resultText += `❌ No one answered!`;
    }

    resultText += `\n*Next game?* Try:.memory or.scramble`;

    await sock.sendMessage(chatId, {
        text: resultText,
        mentions: game.winner? [game.winner.user] : []
    });
}
