const translate = require('google-translate-api-x');

module.exports = {
    command: "blackjack",
    alias: ["bj", "21", "karata"],
    category: "games",
    description: "Shindana na Bot kwenye mchezo wa Karata 21",

    async execute(m, sock, { userSettings, lang, prefix }) {

        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';

        const drawCard = () => Math.floor(Math.random() * 10) + 2;

        let playerTotal = drawCard() + drawCard();
        let botTotal = drawCard();

        const modes = {
            harsh: {
                title: "☣️ 𝕭𝕷𝕬𝕮𝕶𝕵𝕬𝕮𝕶 𝕯𝕰𝕬𝕿𝕳 ☣️",
                line: "━",
                quest: "🃏 𝕿𝖍𝖊 𝖉𝖊𝖆𝖑𝖊𝖗 𝖎𝖘 𝖜𝖆𝖙𝖈𝖍𝖎𝖓𝖌. 𝖂𝖎𝖓 𝖔𝖗 𝖇𝖚𝖗𝖓:",
                hint: `⚙️ 𝕽𝖊𝖕𝖑𝖞 '${prefix}𝖍𝖎𝖙' 𝖔𝖗 '${prefix}𝖘𝖙𝖆𝖓𝖉'.`,
                react: "🃏"
            },
            normal: {
                title: "🃏 VEX BLACKJACK 🃏",
                line: "─",
                quest: "♠️ Beat the dealer to 21!",
                hint: `📝 Reply '${prefix}hit' to take a card or '${prefix}stand'.`,
                react: "♠️"
            },
            girl: {
                title: "🫧 𝐵𝓁𝒶𝒸𝓀𝒿𝒶𝒸𝓀 𝒫𝒾𝓃𝓀 𝒞𝒶𝓈𝒾𝓃𝑜 🫧",
                line: "┄",
                quest: "🫧 𝓁𝓊𝒸𝓀𝓎 𝓃𝓊𝓂𝒷𝑒𝓇 𝟤𝟣, 𝓅𝓇𝒾𝓃𝒸𝑒𝓈𝓈~ 🫧",
                hint: `🫧 𝓈𝒶𝓎 '𝒽𝒾𝓉' 𝑜𝓇 '𝓈𝓉𝒶𝓃𝒹', 𝒹𝑒𝒶𝓇 🫧`,
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            const renderUI = () => {
                return `*${current.title}*\n${current.line.repeat(15)}\n${current.quest}\n\n🎴 You: ${playerTotal}\n🤖 Dealer: ${botTotal}\n\n${current.line.repeat(15)}\n_${current.hint}_`;
            };

            const { text } = await translate(renderUI(), { to: targetLang });
            await m.reply(text);

            let gameActive = true;

            const listener = async (msg) => {
                try {
                    if (!gameActive) return;
                    if (!msg.messages) return;

                    const message = msg.messages[0];
                    if (!message.message) return;

                    const from = message.key.remoteJid;
                    if (from !== m.chat) return;

                    const sender = message.key.participant || from;
                    if (sender !== m.sender) return; // only player

                    const body =
                        message.message.conversation ||
                        message.message.extendedTextMessage?.text ||
                        "";

                    if (!body) return;

                    const input = body.trim().toLowerCase();

                    // 🎯 HIT
                    if (input === `${prefix}hit` || input === "hit") {
                        playerTotal += drawCard();

                        if (playerTotal > 21) {
                            gameActive = false;

                            const loseMsg = `💀 BUSTED!\n\nYour total: ${playerTotal}`;
                            const { text } = await translate(loseMsg, { to: targetLang });

                            await sock.sendMessage(m.chat, { text });
                            sock.ev.off('messages.upsert', listener);
                            return;
                        }

                        const { text } = await translate(renderUI(), { to: targetLang });
                        await sock.sendMessage(m.chat, { text });
                    }

                    // 🛑 STAND
                    if (input === `${prefix}stand` || input === "stand") {
                        gameActive = false;

                        // dealer logic
                        while (botTotal < 17) {
                            botTotal += drawCard();
                        }

                        let result = "";

                        if (botTotal > 21 || playerTotal > botTotal) {
                            result = "🎉 YOU WIN!";
                        } else if (playerTotal < botTotal) {
                            result = "💀 YOU LOSE!";
                        } else {
                            result = "🤝 DRAW!";
                        }

                        const finalMsg = `${result}\n\n🎴 You: ${playerTotal}\n🤖 Dealer: ${botTotal}`;
                        const { text } = await translate(finalMsg, { to: targetLang });

                        await sock.sendMessage(m.chat, { text });

                        sock.ev.off('messages.upsert', listener);
                    }

                } catch (err) {
                    console.error("BLACKJACK LISTENER ERROR:", err);
                }
            };

            sock.ev.on('messages.upsert', listener);

            // ⏰ AUTO END
            setTimeout(async () => {
                if (gameActive) {
                    gameActive = false;

                    const timeoutMsg = `⏰ Game ended. No response.`;
                    const { text } = await translate(timeoutMsg, { to: targetLang });

                    await sock.sendMessage(m.chat, { text });
                    sock.ev.off('messages.upsert', listener);
                }
            }, 60000);

        } catch (error) {
            console.error("BLACKJACK ERROR:", error);
            await m.reply("☣️ Casino is closed due to a raid.");
        }
    }
};
