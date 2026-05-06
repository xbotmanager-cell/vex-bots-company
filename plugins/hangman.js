const translate = require('google-translate-api-x');

module.exports = {
    command: "hangman",
    alias: ["bashiri", "guessword"],
    category: "games",
    description: "Mchezo wa kubashiri neno herufi kwa herufi",

    async execute(m, sock, { userSettings, lang, prefix }) {

        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';

        const words = ["JAVASCRIPT", "DATABASE", "WHATSAPP", "LUPER", "NODEJS", "HACKING", "SERVER", "CODING"];
        const selectedWord = words[Math.floor(Math.random() * words.length)];

        const hiddenWord = selectedWord.split('').map(() => "_").join(" ");

        const modes = {
            harsh: {
                title: "☣️ 𝕳𝕬𝕹𝕲𝕸𝕬𝕹 𝕰𝖃𝕰𝕮𝕿𝕴𝕺𝕹 ☣️",
                line: "━",
                quest: "🩸 Guess the word or get hanged:",
                hint: "⚙️ Reply with the full word to win.",
                react: "💀"
            },
            normal: {
                title: "🎮 VEX HANGMAN 🎮",
                line: "─",
                quest: "💡 Solve the hidden word:",
                hint: "📝 Type the answer to claim victory!",
                react: "🎮"
            },
            girl: {
                title: "🫧 Hangman Pink Puzzle 🫧",
                line: "┄",
                quest: "🫧 can you find the hidden word? 🫧",
                hint: "🫧 type it here, darling~ 🫧",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            const gameUI = `*${current.title}*\n${current.line.repeat(15)}\n\n*${current.quest}*\n\n\`\`\`${hiddenWord}\`\`\`\n\n${current.line.repeat(15)}\n_${current.hint}_`;

            const { text: translatedUI } = await translate(gameUI, { to: targetLang });
            const sent = await m.reply(translatedUI);

            let gameActive = true;

            // 🔥 LISTENER NDANI YA COMMAND (SELF-CONTAINED)
            const listener = async (msg) => {
                try {
                    if (!gameActive) return;

                    if (!msg.messages) return;
                    const message = msg.messages[0];
                    if (!message.message) return;

                    const from = message.key.remoteJid;
                    if (from !== m.chat) return;

                    const body =
                        message.message.conversation ||
                        message.message.extendedTextMessage?.text ||
                        "";

                    if (!body) return;

                    const answer = body.trim().toUpperCase();

                    // ✔️ CORRECT ANSWER
                    if (answer === selectedWord) {
                        gameActive = false;

                        const winMsg = `🎉 CORRECT!\n\nYou guessed: *${selectedWord}*`;
                        const { text } = await translate(winMsg, { to: targetLang });

                        await sock.sendMessage(m.chat, { text });

                        sock.ev.off('messages.upsert', listener);
                    }

                } catch (err) {
                    console.error("LISTENER ERROR:", err);
                }
            };

            // attach listener
            sock.ev.on('messages.upsert', listener);

            // ⏰ TIMEOUT
            setTimeout(async () => {
                if (gameActive) {
                    gameActive = false;

                    const revealMsg = `⏰ TIME UP!\n\nCorrect word: *${selectedWord}*`;
                    const { text } = await translate(revealMsg, { to: targetLang });

                    await sock.sendMessage(m.chat, { text });

                    sock.ev.off('messages.upsert', listener);
                }
            }, 30000);

        } catch (error) {
            console.error("HANGMAN ERROR:", error);
            await m.reply("☣️ Executioner failed. The prisoner escaped.");
        }
    }
};
