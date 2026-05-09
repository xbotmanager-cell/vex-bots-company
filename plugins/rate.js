const crypto = require('crypto');

module.exports = {
    command: "rate",
    alias: ["rating", "how"],
    category: "fun",
    description: "Rate anything from 0-100% using VEX AI",

    async execute(m, sock, { userSettings, lang, prefix }) {
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';

        const modes = {
            harsh: {
                title: "☣️ 𝕍𝔼𝕏 ℝ𝔸𝕋𝕀ℕ𝔾 𝕊ℂ𝔸ℕℕ𝔼ℝ ☣️",
                line: "━",
                noText: "⚠️ 𝕊𝕋𝔸𝕋𝔼 𝕎ℍ𝔸𝕋 𝕋𝕆 ℝ𝔸𝕋𝔼, 𝕊𝕃𝔸𝕍𝔼",
                usage: `𝕊𝕐ℕ𝕋𝔸𝕏: ${prefix}rate is this good?\n𝕆ℝ: ${prefix}rate this system`,
                scanning: "☠️ 𝕊ℂ𝔸ℕ𝕀ℕ𝔾 𝕋𝔸ℝ𝔾𝔼𝕋...",
                fail: "☠️ ℝ𝔸𝕋𝕀ℕ𝔾 𝕊𝕐𝕊𝕋𝔼𝕄 𝔽𝔸𝕀𝕃𝔼𝔻",
                react: "📊",
                comments: {
                    100: "ℙ𝔼ℝ𝔽𝔼ℂ𝕋𝕀𝕆ℕ 𝔻𝔼𝕋𝔼ℂ𝕋𝔼𝔻",
                    90: "𝔸𝕃𝕄𝕆𝕊𝕋 𝔽𝕃𝔸𝕎𝕃𝔼𝕊",
                    75: "𝔸𝔹𝕆𝕍𝔼 𝔸𝕍𝔼ℝ𝔸𝔾𝔼 𝕋ℝ𝔸𝕊ℍ",
                    50: "𝕄𝔼𝔻𝕀𝕆ℂℝ𝔼 𝔾𝔸ℝ𝔹𝔸𝔾𝔼",
                    30: "ℙ𝔸𝕋ℍ𝔼𝕋𝕀ℂ 𝕃𝔼𝕍𝔼𝕃",
                    10: "𝔸𝔹𝕊𝕆𝕃𝕌𝕋𝔼 𝕎𝔸𝕊𝕋𝔼",
                    0: "ℤ𝔼ℝ𝕆 𝕍𝔸𝕃𝕌𝔼 𝔻𝔼𝕋𝔼ℂ𝕋𝔼𝔻"
                }
            },
            normal: {
                title: "📊 VEX RATING SYSTEM 📊",
                line: "─",
                noText: "⚠️ What should I rate?",
                usage: `Example: ${prefix}rate is this smart?\nOr: ${prefix}rate this group`,
                scanning: "🔍 Scanning and analyzing...",
                fail: "❌ Rating system failed. Try again",
                react: "📊",
                comments: {
                    100: "PERFECT SCORE! 🏆",
                    90: "EXCELLENT! 🌟",
                    75: "PRETTY GOOD 👍",
                    50: "AVERAGE 📊",
                    30: "BELOW AVERAGE 📉",
                    10: "VERY POOR 👎",
                    0: "ABSOLUTE ZERO 💀"
                }
            },
            girl: {
                title: "🫧 Rating Machine 🫧",
                line: "┄",
                noText: "🫧 What should I rate princess~? 🫧",
                usage: `🫧 Example: ${prefix}rate am I cute? 🫧`,
                scanning: "🫧 Analyzing with love~ 🫧",
                fail: "🫧 Oopsie~ Rating failed~ 🫧",
                react: "✨",
                comments: {
                    100: "PERFECT 100/100! ✨👑",
                    90: "SO AMAZING! 🌟💖",
                    75: "SUPER CUTE! 🎀",
                    50: "PRETTY GOOD~ 🫧",
                    30: "NEEDS WORK~ 🥺",
                    10: "NOT GOOD~ 💔",
                    0: "OH NO~ 😭"
                }
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            const text = m.text.slice(prefix.length + 4).trim();
            const quoted = m.quoted? m.quoted : null;

            let targetText = text;

            // If replying, rate the quoted message
            if (quoted &&!text) {
                if (quoted.message?.conversation) {
                    targetText = quoted.message.conversation;
                } else if (quoted.message?.extendedTextMessage?.text) {
                    targetText = quoted.message.extendedTextMessage.text;
                } else {
                    targetText = "this message";
                }
            }

            if (!targetText) {
                const msg = `*${current.title}*\n${current.line.repeat(15)}\n${current.noText}\n\n${current.usage}`;
                return await m.reply(msg);
            }

            await m.reply(`*${current.title}*\n${current.line.repeat(15)}\n${current.scanning}`);

            // 1. AI Logic: Smart rating based on English keywords only
            const lowerText = targetText.toLowerCase();
            let baseScore = 50;

            // Positive keywords boost - English only
            const positiveWords = ['smart', 'good', 'best', 'amazing', 'perfect', 'cool', 'nice', 'great', 'love', 'beautiful', 'strong', 'fast', 'pro', 'god', 'king', 'queen', 'excellent', 'awesome', 'elite', 'legend'];
            const negativeWords = ['bad', 'worst', 'ugly', 'weak', 'slow', 'noob', 'trash', 'fail', 'poor', 'boring', 'terrible', 'awful', 'horrible', 'useless', 'dumb'];

            positiveWords.forEach(word => {
                if (lowerText.includes(word)) baseScore += 8;
            });

            negativeWords.forEach(word => {
                if (lowerText.includes(word)) baseScore -= 12;
            });

            // Neutral boost for VEX system only - no personal names
            if (lowerText.includes('vex') || lowerText.includes('system')) {
                baseScore += 5;
            }

            // Add controlled randomness
            const randomFactor = Math.floor(Math.random() * 21) - 10;
            let finalScore = baseScore + randomFactor;

            // Clamp 0-100
            if (finalScore > 100) finalScore = 100;
            if (finalScore < 0) finalScore = 0;

            // 2. Get comment based on score
            let comment = '';
            const scores = Object.keys(current.comments).map(Number).sort((a, b) => b - a);
            for (const score of scores) {
                if (finalScore >= score) {
                    comment = current.comments[score];
                    break;
                }
            }

            // 3. Generate progress bar
            const barLength = 10;
            const filledBars = Math.round((finalScore / 100) * barLength);
            const emptyBars = barLength - filledBars;
            const progressBar = '█'.repeat(filledBars) + '░'.repeat(emptyBars);

            // 4. Send result
            const resultMsg = `*${current.title}*\n${current.line.repeat(15)}\n\n📋 *Target:* ${targetText.slice(0, 80)}${targetText.length > 80? '...' : ''}\n\n📊 *Rating: ${finalScore}%*\n${progressBar}\n\n💬 *Verdict:* ${comment}\n\n${current.line.repeat(15)}\n_Powered by VEX AI_`;

            await sock.sendMessage(m.chat, { text: resultMsg }, { quoted: m });

        } catch (error) {
            console.error("VEX RATE ERROR:", error);
            const errorMsg = `*${current.title}*\n${current.line.repeat(15)}\n${current.fail}`;
            await m.reply(errorMsg);
        }
    }
};
