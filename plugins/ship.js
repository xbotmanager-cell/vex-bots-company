const axios = require('axios');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = {
    command: "ship",
    category: "fun",
    description: "Calculate love percentage between two users using AI logic",

    async execute(m, sock, { userSettings, lang, prefix }) {
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';
        const shipImageUrl = 'https://i.ibb.co/4Z7Sf3q5/Chat-GPT-Image-May-8-2026-07-10-41-PM.png';

        const modes = {
            harsh: {
                title: "☣️ 𝕍𝔼𝕏 𝕃𝕆𝕍𝔼 𝕊ℂ𝔸ℕ𝔼ℝ ☣️",
                line: "━",
                noUsers: "⚠️ 𝕋𝔸𝔾 2 𝕊𝕃𝔸𝕍𝔼𝕊 𝕆ℝ ℝ𝔼ℙ𝕃𝕐 𝕋𝕆 𝕍𝕀ℂ𝕋𝕀𝕄",
                usage: `𝕊𝕐ℕ𝕋𝔸𝕏: ${prefix}ship @target1 @target2\n𝕆ℝ: ${prefix}ship @target\n𝕆ℝ: Reply victim with ${prefix}ship`,
                sameUser: "💀 𝕊ℂ𝔸ℕ𝕀ℕ𝔾 𝕊𝔼𝕃𝔽 𝕀𝕊 ℙ𝔸𝕋ℍ𝔼𝕋𝕀ℂ",
                fail: "☠️ 𝕊ℂ𝔸ℕℕ𝔼ℝ 𝔽𝔸𝕀𝕃𝔼𝔻. 𝕋ℝ𝕐 𝔸𝔾𝔸𝕀ℕ 𝕊𝕃𝔸𝕍𝔼",
                react: "💘",
                statuses: [
                    { min: 90, text: "SOUL BOND DETECTED", emoji: "💍" },
                    { min: 75, text: "TOXIC LOVE FOUND", emoji: "⛓️" },
                    { min: 50, text: "WEAK CONNECTION", emoji: "💔" },
                    { min: 30, text: "USELESS FRIENDZONE", emoji: "🗑️" },
                    { min: 0, text: "ZERO CHEMISTRY", emoji: "☠️" }
                ]
            },
            normal: {
                title: "💕 LOVE CALCULATOR 💕",
                line: "─",
                noUsers: "⚠️ Mention 2 users to ship them",
                usage: `Example: ${prefix}ship @user1 @user2\nOr: ${prefix}ship @user\nOr: Reply to message with ${prefix}ship`,
                sameUser: "💔 You can't ship someone with themselves",
                fail: "❌ Love scanner failed. Please try again",
                react: "💕",
                statuses: [
                    { min: 90, text: "PERFECT MATCH", emoji: "💍" },
                    { min: 75, text: "LOVERS", emoji: "💞" },
                    { min: 50, text: "GOOD MATCH", emoji: "💖" },
                    { min: 30, text: "FRIENDS", emoji: "💛" },
                    { min: 0, text: "NO CHEMISTRY", emoji: "💔" }
                ]
            },
            girl: {
                title: "🫧 Love Meter 🫧",
                line: "┄",
                noUsers: "🫧 Tag 2 cuties to ship them princess~ 🫧",
                usage: `🫧 Example: ${prefix}ship @user1 @user2 🫧`,
                sameUser: "🫧 Silly~ You can't ship yourself~ 🫧",
                fail: "🫧 Oopsie~ Scanner broke, try again~ 🫧",
                react: "💖",
                statuses: [
                    { min: 90, text: "DESTINED SOULMATES", emoji: "👑" },
                    { min: 75, text: "CUTE COUPLE", emoji: "💕" },
                    { min: 50, text: "SWEET MATCH", emoji: "🎀" },
                    { min: 30, text: "JUST FRIENDS", emoji: "🧸" },
                    { min: 0, text: "NO SPARK", emoji: "🥺" }
                ]
            }
        };

        const current = modes[style] || modes.normal;
        const tempDir = './temp';
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            let user1, user2, name1, name2;

            // 1. Extract users from mentions, reply, or text
            const mentioned = m.mentionedJid || [];
            const text = m.text.slice(prefix.length + 4).trim();

            if (m.quoted && mentioned.length === 0) {
                user1 = m.sender;
                user2 = m.quoted.sender;
            } else if (mentioned.length >= 2) {
                user1 = mentioned[0];
                user2 = mentioned[1];
            } else if (mentioned.length === 1) {
                user1 = m.sender;
                user2 = mentioned[0];
            } else if (text.includes('and') || text.includes('na')) {
                const parts = text.split(/\s+and\s+|\s+na\s+/i);
                if (parts.length === 2) {
                    const clean1 = parts[0].replace('@', '').replace(/\D/g, '');
                    const clean2 = parts[1].replace('@', '').replace(/\D/g, '');
                    if (clean1 && clean2) {
                        user1 = clean1 + '@s.whatsapp.net';
                        user2 = clean2 + '@s.whatsapp.net';
                    }
                }
            } else {
                const numbers = text.match(/\d{10,15}/g);
                if (numbers && numbers.length >= 2) {
                    user1 = numbers[0] + '@s.whatsapp.net';
                    user2 = numbers[1] + '@s.whatsapp.net';
                }
            }

            if (!user1 ||!user2) {
                const msg = `*${current.title}*\n${current.line.repeat(15)}\n${current.noUsers}\n\n${current.usage}`;
                return await m.reply(msg);
            }

            if (user1 === user2) {
                return await m.reply(`*${current.title}*\n${current.line.repeat(15)}\n${current.sameUser}`);
            }

            // 2. Get user names
            name1 = await sock.getName(user1) || user1.split('@')[0];
            name2 = await sock.getName(user2) || user2.split('@')[0];

            // 3. AI Logic: Pseudo-random but influenced by factors
            const now = new Date();
            const seed = parseInt(user1.replace(/\D/g, '').slice(-4) || '1') +
                         parseInt(user2.replace(/\D/g, '').slice(-4) || '1') +
                         now.getHours() + now.getDate();

            // Super Logic: Mix random + time + group factor for realism
            const randomBase = Math.floor(Math.random() * 40) + 30; // 30-70 base
            const timeBonus = now.getMinutes() % 20; // 0-19 bonus
            const groupBonus = m.isGroup? 10 : 0;

            let lovePercent = randomBase + timeBonus + groupBonus;
            if (lovePercent > 100) lovePercent = 100;
            if (lovePercent < 0) lovePercent = 0;

            // 4. Get status based on style
            let shipStatus = '';
            let emoji = '';
            for (const status of current.statuses) {
                if (lovePercent >= status.min) {
                    shipStatus = status.text;
                    emoji = status.emoji;
                    break;
                }
            }

            // 5. Download ship background and create image
            const id = crypto.randomBytes(6).toString('hex');
            const outPath = path.join(tempDir, `ship_${id}.png`);

            const response = await axios.get(shipImageUrl, { responseType: 'arraybuffer' });
            const bgImage = await Jimp.read(response.data);
            bgImage.resize(800, 418);

            // Load fonts
            const font64 = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
            const font32 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
            const font16 = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

            // Draw overlay box
            const overlay = new Jimp(700, 200, 'rgba(0, 0, 0, 0.7)');
            bgImage.composite(overlay, 50, 180);

            // Draw text
            bgImage.print(font32, 0, 200, {
                text: `${name1.slice(0, 15)} ${emoji} ${name2.slice(0, 15)}`,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
            }, 800);

            bgImage.print(font64, 0, 250, {
                text: `${lovePercent}%`,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
            }, 800);

            bgImage.print(font32, 0, 320, {
                text: shipStatus,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
            }, 800);

            bgImage.print(font16, 0, 380, {
                text: 'VEX AI LOVE SCANNER',
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
            }, 800);

            await bgImage.writeAsync(outPath);
            const finalBuffer = fs.readFileSync(outPath);

            // 6. Send result
            const caption = `*${current.title}*\n${current.line.repeat(15)}\n\n💘 *${name1}* + *${name2}*\n${emoji} *Love Score: ${lovePercent}%*\n📊 *Status: ${shipStatus}*\n\n${current.line.repeat(15)}\n_Powered by VEX AI_`;

            await sock.sendMessage(m.chat, {
                image: finalBuffer,
                caption: caption,
                mentions: [user1, user2]
            }, { quoted: m });

            // 7. Cleanup
            fs.existsSync(outPath) && fs.unlinkSync(outPath);

        } catch (error) {
            console.error("VEX SHIP ERROR:", error);
            const errorMsg = `*${current.title}*\n${current.line.repeat(15)}\n${current.fail}`;
            await m.reply(errorMsg);
        }
    }
};
