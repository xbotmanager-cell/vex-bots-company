const games = new Map(); // game state per group

// 50 random sentences for typing race
const SENTENCES = [
    "The quick brown fox jumps over the lazy dog",
    "Programming is the art of telling another human what one wants the computer to do",
    "JavaScript is a versatile language used for web development",
    "Never underestimate the power of a good code review",
    "Debugging is twice as hard as writing the code in the first place",
    "The best error message is the one that never shows up",
    "Code is like humor when you have to explain it its bad",
    "First solve the problem then write the code",
    "Clean code always looks like it was written by someone who cares",
    "Simplicity is the soul of efficiency",
    "Make it work make it right make it fast",
    "Any fool can write code that a computer can understand",
    "Good programmers write code that humans can understand",
    "Talk is cheap show me the code",
    "Software is a great combination of artistry and engineering",
    "The most disastrous thing you can learn is your first programming language",
    "Code never lies comments sometimes do",
    "If debugging is the process of removing bugs then programming must be the process of putting them in",
    "Walking on water and developing software from a specification are easy if both are frozen",
    "Measuring programming progress by lines of code is like measuring aircraft building progress by weight",
    "Python is an experiment in how much freedom programmers need",
    "Java is to JavaScript what car is to carpet",
    "There are only two kinds of languages the ones people complain about and the ones nobody uses",
    "The only way to learn a new programming language is by writing programs in it",
    "Programming today is a race between software engineers and the universe",
    "Computers are good at following instructions but not at reading your mind",
    "The trouble with programmers is that you can never tell what a programmer is doing until its too late",
    "Most good programmers do programming not because they expect to get paid",
    "The best programmers are not marginally better than merely good ones",
    "Everyone knows that debugging is twice as hard as writing a program",
    "It is easier to port a shell than a shell script",
    "The computer was born to solve problems that did not exist before",
    "The question of whether computers can think is like the question of whether submarines can swim",
    "Computer science is no more about computers than astronomy is about telescopes",
    "The purpose of software engineering is to control complexity not to create it",
    "Deleted code is debugged code",
    "Testing can only prove the presence of bugs not their absence",
    "Before software can be reusable it first has to be usable",
    "The best way to predict the future is to implement it",
    "A language that doesnt affect the way you think about programming is not worth knowing",
    "Premature optimization is the root of all evil",
    "The sooner you start to code the longer the program will take",
    "One of my most productive days was throwing away 1000 lines of code",
    "Without requirements or design programming is the art of adding bugs to an empty text file",
    "Documentation is like sex when it is good it is very good",
    "The most important property of a program is whether it accomplishes the intention of its user",
    "Good code is its own best documentation",
    "Code should be written to minimize the time it would take for someone else to understand it",
    "The cheapest fastest and most reliable components are those that arent there",
    "Dont comment bad code rewrite it"
];

module.exports = {
    command: "type",
    alias: ["fasttype", "typing", "typerace"],
    category: "games",
    description: "VEX AI FastType - Type the sentence as fast as possible without mistakes",

    async execute(m, sock, { args }) {
        const chatId = m.chat;
        const userId = m.sender;

        // =========================
        // 1. START NEW GAME
        // =========================
        if (args[0]?.toLowerCase() === 'start') {
            if (games.has(chatId)) {
                const game = games.get(chatId);
                const timeLeft = Math.max(0, Math.floor((game.endTime - Date.now()) / 1000));
                return m.reply(`⚡ Typing race already running!\n\n⏱️ Time left: ${timeLeft}s\n👤 Players: ${game.players.size}\n\n➤.type <sentence> to submit`);
            }

            const sentence = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
            const timeLimit = 30; // 30 seconds

            games.set(chatId, {
                sentence: sentence,
                startTime: Date.now(),
                endTime: Date.now() + (timeLimit * 1000),
                players: new Set(),
                winners: [],
                finished: false
            });

            // Auto end after time limit
            setTimeout(() => {
                endTypingRace(chatId, sock);
            }, timeLimit * 1000);

            return sock.sendMessage(chatId, {
                text: `⌨️ *FAST TYPE RACE STARTED*\n\n⏱️ Time: ${timeLimit} seconds\n\n📝 *TYPE THIS EXACTLY:*\n\`\`\`${sentence}\`\`\`\n\n*Rules*:\n1️⃣ Copy the sentence exactly\n2️⃣ No typos, case sensitive\n3️⃣ Fastest correct answer wins\n\n➤.type <your answer>`,
                mentions: []
            });
        }

        // =========================
        // 2. STOP GAME
        // =========================
        if (args[0]?.toLowerCase() === 'stop') {
            if (!games.has(chatId)) return m.reply('❌ No active typing race. Start with.type start');

            const game = games.get(chatId);
            game.finished = true;
            games.delete(chatId);

            return sock.sendMessage(chatId, {
                text: `🏁 *TYPING RACE ENDED*\n\n📝 Sentence: \`${game.sentence}\`\n👤 Players: ${game.players.size}\n🏆 Winners: ${game.winners.length}\n\nRace stopped!\n\n*Next game?* Try:.bomb or.guess`,
                mentions: []
            });
        }

        // =========================
        // 3. SUBMIT ANSWER
        // =========================
        if (!games.has(chatId)) {
            return m.reply('❌ No active typing race. Start with *.type start*');
        }

        const game = games.get(chatId);
        const userAnswer = args.join(' ').trim();

        if (!userAnswer) return m.reply('❌ Type the sentence\nExample:.type The quick brown fox...');

        // Check if game expired
        if (Date.now() >= game.endTime || game.finished) {
            return endTypingRace(chatId, sock);
        }

        // Check if already submitted
        if (game.players.has(userId)) {
            return m.reply('❌ You already submitted! Wait for results.');
        }

        // =========================
        // 4. CHECK ANSWER
        // =========================
        game.players.add(userId);
        const timeTaken = ((Date.now() - game.startTime) / 1000).toFixed(2);

        if (userAnswer === game.sentence) {
            // Correct
            game.winners.push({
                user: userId,
                time: parseFloat(timeTaken),
                name: m.pushName || userId.split('@')[0]
            });

            const position = game.winners.length;
            const medal = position === 1? '🥇' : position === 2? '🥈' : position === 3? '🥉' : '✅';

            await sock.sendMessage(chatId, {
                text: `${medal} *CORRECT!* @${userId.split('@')[0]}\n\n⚡ Position: #${position}\n⏱️ Time: ${timeTaken}s\n📊 Total Players: ${game.players.size}`,
                mentions: [userId]
            }, { quoted: m });

            // End game if 3 winners or time up
            if (game.winners.length >= 3) {
                setTimeout(() => endTypingRace(chatId, sock), 1000);
            }

        } else {
            // Wrong - calculate accuracy
            const accuracy = calculateAccuracy(userAnswer, game.sentence);
            await sock.sendMessage(chatId, {
                text: `❌ *WRONG!* @${userId.split('@')[0]}\n\n📊 Accuracy: ${accuracy}%\n⏱️ Time: ${timeTaken}s\n\nCorrect: \`${game.sentence}\`\nYours: \`${userAnswer}\``,
                mentions: [userId]
            }, { quoted: m });
        }
    }
};

// =========================
// END TYPING RACE
// =========================
async function endTypingRace(chatId, sock) {
    if (!games.has(chatId)) return;

    const game = games.get(chatId);
    if (game.finished) return;
    game.finished = true;

    // Sort winners by time
    game.winners.sort((a, b) => a.time - b.time);

    let resultText = `🏁 *TYPING RACE ENDED*\n\n📝 Sentence: \`${game.sentence}\`\n👤 Total Players: ${game.players.size}\n\n`;

    if (game.winners.length > 0) {
        resultText += `🏆 *WINNERS*\n`;
        game.winners.slice(0, 3).forEach((winner, i) => {
            const medal = i === 0? '🥇' : i === 1? '🥈' : '🥉';
            resultText += `${medal} @${winner.user.split('@')[0]} - ${winner.time}s\n`;
        });
    } else {
        resultText += `❌ No winners - nobody typed correctly!`;
    }

    resultText += `\n*Next game?* Try:.bomb or.guess`;

    games.delete(chatId);

    await sock.sendMessage(chatId, {
        text: resultText,
        mentions: game.winners.map(w => w.user)
    });
}

// =========================
// CALCULATE ACCURACY
// =========================
function calculateAccuracy(input, correct) {
    if (input.length === 0) return 0;
    let matches = 0;
    const minLen = Math.min(input.length, correct.length);

    for (let i = 0; i < minLen; i++) {
        if (input[i] === correct[i]) matches++;
    }

    return Math.round((matches / correct.length) * 100);
}
