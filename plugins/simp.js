const crypto = require('crypto');

module.exports = {
    command: "simp",
    category: "fun",
    description: "Check someone's simp level from 0-100%",

    async execute(m, sock, { userSettings, lang, prefix }) {
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';

        const modes = {
            harsh: {
                title: "☣️ 𝕍𝔼𝕏 𝕊𝕀𝕄ℙ 𝔻𝔼𝕋𝔼ℂ𝕋𝕆ℝ ☣️",
                line: "━",
                noUser: "⚠️ 𝕋𝔸𝔾 𝕋ℍ𝔼 𝕊𝕀𝕄ℙ 𝕆ℝ ℝ𝔼ℙ𝕃𝕐 𝕋𝕆 𝕋ℍ𝔼𝕄",
                usage: `𝕊𝕐ℕ𝕋𝔸𝕏: ${prefix}simp @user\n𝕆ℝ: Reply to user with ${prefix}simp`,
                scanning: "☠️ 𝕊ℂ𝔸ℕ𝕀ℕ𝔾 𝕊𝕀𝕄ℙ 𝔻ℕ𝔸...",
                fail: "☠️ 𝕊𝕀𝕄ℙ 𝔻𝔼𝕋𝔼ℂ𝕋𝕆ℝ 𝔽𝔸𝕀𝕃𝔼𝔻",
                react: "🤡",
                comments: {
                    100: "𝕌𝕃𝕋𝕀𝕄𝔸𝕋𝔼 𝕊𝕀𝕄ℙ 𝕂𝕀ℕ𝔾 𝔻𝔼𝕋𝔼ℂ𝕋𝔼𝔻",
                    90: "ℂ𝔼ℝ𝕋𝕀𝔽𝕀𝔼𝔻 𝕊𝕀𝕄ℙ 𝕃𝕆ℝ𝔻",
                    75: "ℙℝ𝕆𝔽𝔼𝕊𝕊𝕀𝕆ℕ𝔸𝕃 𝕊𝕀𝕄ℙ",
                    50: "𝔸𝕍𝔼ℝ𝔸𝔾𝔼 𝕊𝕀𝕄ℙ 𝕋ℝ𝔸𝕊ℍ",
                    30: "𝕎𝔼𝔸𝕂 𝕊𝕀𝕄ℙ 𝔼ℕ𝔼ℝ𝔾𝕐",
                    10: "𝔹𝔸ℝ𝔼𝕃𝕐 𝔸 𝕊𝕀𝕄ℙ",
                    0: "𝕊𝕀𝕄ℙ 𝔽ℝ𝔼𝔼 ℤ𝕆ℕ𝔼"
                }
            },
            normal: {
                title: "🤡 SIMP METER 🤡",
                line: "─",
                noUser: "⚠️ Tag someone or reply to them to check simp level",
                usage: `Example: ${prefix}simp @user\nOr reply to user with ${prefix}simp`,
                scanning: "🔍 Analyzing simp behavior...",
                fail: "❌ Simp detector failed. Try again",
                react: "🤡",
                comments: {
                    100: "ULTIMATE SIMP! 100% Certified 🤡👑",
                    90: "EXTREME SIMP ALERT! 🚨",
                    75: "MAJOR SIMP DETECTED 😂",
                    50: "AVERAGE SIMP LEVEL 📊",
                    30: "MILD SIMP TENDENCIES 🤏",
                    10: "BARELY A SIMP ✅",
                    0: "SIMP FREE! CHAD ENERGY 💪"
                }
            },
            girl: {
                title: "🫧 Simp Detector 🫧",
                line: "┄",
                noUser: "🫧 Tag someone to check their simp level~ 🫧",
                usage: `🫧 Example: ${prefix}simp @user 🫧`,
                scanning: "🫧 Checking simp vibes~ 🫧",
                fail: "🫧 Oopsie~ Detector broke~ 🫧",
                react: "💅",
                comments: {
                    100: "OMG ULTIMATE SIMP! 🫧👑🤡",
                    90: "SUPER DUPER SIMP! 💖",
                    75: "BIG SIMP ENERGY~ 🎀",
                    50: "KINDA SIMPY~ 🫧",
                    30: "LITTLE BIT SIMP~ 🥺",
                    10: "NOT REALLY SIMP~ ✨",
                    0: "NOT A SIMP! SLAY~ 💅👑"
                }
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            let targetUser, targetName;

            // 1. Get target user
            const mentioned = m.mentionedJid || [];
            const quoted = m.quoted? m.quoted : null;

            if (mentioned.length >= 1) {
                targetUser = mentioned[0];
            } else if (quoted) {
                targetUser = quoted.sender;
            } else {
                targetUser = m.sender; // Self check
            }

            // 2. Get user name
            targetName = await sock.getName(targetUser) || targetUser.split('@')[0];

            await m.reply(`*${current.title}*\n${current.line.repeat(15)}\n${current.scanning}`);

            // 3. AI Logic: Simp calculation based on user ID + randomness
            const userIdNum = parseInt(targetUser.replace(/\D/g, '').slice(-6) || '1');
            const now = new Date();

            // Base calculation - pseudo random but consistent per day
            const daySeed = now.getDate() + now.getMonth();
            let baseScore = (userIdNum + daySeed) % 60; // 0-59 base

            // Add random variance
            const randomBoost = Math.floor(Math.random() * 41); // 0-40
            let simpLevel = baseScore + randomBoost;

            // Special cases for fun
            if (targetUser === m.sender) simpLevel -= 15; // Self check bias lower

            // Clamp 0-100
            if (simpLevel > 100) simpLevel = 100;
            if (simpLevel < 0) simpLevel = 0;

            // 4. Get comment based on score
            let comment = '';
            const scores = Object.keys(current.comments).map(Number).sort((a, b) => b - a);
            for (const score of scores) {
                if (simpLevel >= score) {
                    comment = current.comments[score];
                    break;
                }
            }

            // 5. Generate progress bar
            const barLength = 10;
            const filledBars = Math.round((simpLevel / 100) * barLength);
            const emptyBars = barLength - filledBars;
            const progressBar = '🤡'.repeat(filledBars) + '⚪'.repeat(emptyBars);

            // 6. Send result
            const resultMsg = `*${current.title}*\n${current.line.repeat(15)}\n\n👤 *Target:* ${targetName}\n\n📊 *Simp Level: ${simpLevel}%*\n${progressBar}\n\n💬 *Verdict:* ${comment}\n\n${current.line.repeat(15)}\n_Powered by VEX AI_`;

            await sock.sendMessage(m.chat, {
                text: resultMsg,
                mentions: [targetUser]
            }, { quoted: m });

        } catch (error) {
            console.error("VEX SIMP ERROR:", error);
            const errorMsg = `*${current.title}*\n${current.line.repeat(15)}\n${current.fail}`;
            await m.reply(errorMsg);
        }
    }
};
