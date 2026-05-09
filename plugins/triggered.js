const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Jimp = require('jimp');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    command: "triggered",
    category: "fun",
    description: "Generate triggered meme from user profile picture",

    async execute(m, sock, { userSettings, lang, prefix }) {
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';

        const modes = {
            harsh: {
                title: "☣️ 𝕍𝔼𝕏 𝕋ℝ𝕀𝔾𝔼ℝ𝔼𝔻 𝔾𝔼ℕ𝔼ℝ𝔸𝕋𝕆ℝ ☣️",
                line: "━",
                noUser: "⚠️ 𝕋𝔸𝔾 𝕋ℍ𝔼 𝕍𝕀ℂ𝕋𝕀𝕄 𝕆ℝ ℝ𝔼ℙ𝕃𝕐 𝕋𝕆 𝕋ℍ𝔼𝕄",
                usage: `𝕊𝕐ℕ𝕋𝔸𝕏: ${prefix}triggered @user\n𝕆ℝ: Reply to user with ${prefix}triggered`,
                generating: "☠️ 𝔾𝔼ℕ𝔼ℝ𝔸𝕋𝕀ℕ𝔾 𝕋ℝ𝕀𝔾𝔼ℝ𝔼𝔻 𝕄𝔼𝕄𝔼...",
                success: "☠️ 𝕍𝕀ℂ𝕋𝕀𝕄 𝕋ℝ𝕀𝔾𝔼ℝ𝔼𝔻",
                fail: "☠️ 𝕋ℝ𝕀𝔾𝔼ℝ𝔼𝔻 𝔾𝔼ℕ 𝔽𝔸𝕀𝕃𝔼𝔻",
                react: "😡"
            },
            normal: {
                title: "😡 TRIGGERED GENERATOR 😡",
                line: "─",
                noUser: "⚠️ Tag someone or reply to them",
                usage: `Example: ${prefix}triggered @user\nOr reply to user with ${prefix}triggered`,
                generating: "🔄 Generating triggered meme...",
                success: "✅ User triggered!",
                fail: "❌ Failed to generate triggered. Try again",
                react: "😡"
            },
            girl: {
                title: "🫧 Triggered Maker 🫧",
                line: "┄",
                noUser: "🫧 Tag someone to trigger them~ 🫧",
                usage: `🫧 Example: ${prefix}triggered @user 🫧`,
                generating: "🫧 Making them mad~ 🫧",
                success: "🫧 They're so triggered~ 🫧",
                fail: "🫧 Oopsie~ Failed to trigger~ 🫧",
                react: "😤"
            }
        };

        const current = modes[style] || modes.normal;
        const tempDir = './temp';
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

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
                targetUser = m.sender; // Self trigger
            }

            // 2. Get user name
            targetName = await sock.getName(targetUser) || targetUser.split('@')[0];

            await m.reply(`*${current.title}*\n${current.line.repeat(15)}\n${current.generating}`);

            // 3. Get profile picture
            let pfpUrl;
            try {
                pfpUrl = await sock.profilePictureUrl(targetUser, 'image');
            } catch {
                pfpUrl = 'https://i.ibb.co/4Z7Sf3q5/Chat-GPT-Image-May-8-2026-07-10-41-PM.png'; // Default avatar
            }

            // 4. Download and process image
            const id = crypto.randomBytes(6).toString('hex');
            const outPath = path.join(tempDir, `triggered_${id}.png`);

            const response = await axios.get(pfpUrl, { responseType: 'arraybuffer' });
            const image = await Jimp.read(response.data);

            // Resize to 512x512
            image.resize(512, 512);

            // Load triggered overlay
            const triggeredUrl = 'https://i.ibb.co/7QpKsCX/triggered.png';
            const overlayRes = await axios.get(triggeredUrl, { responseType: 'arraybuffer' });
            const overlay = await Jimp.read(overlayRes.data);
            overlay.resize(512, 150);

            // Add red tint to image
            image.color([
                { apply: 'red', params: [50] },
                { apply: 'mix', params: ['#FF0000', 30] }
            ]);

            // Add distortion - shake effect
            image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
                const offsetX = Math.floor(Math.random() * 10) - 5;
                const offsetY = Math.floor(Math.random() * 10) - 5;
                if (x + offsetX >= 0 && x + offsetX < this.bitmap.width && y + offsetY >= 0 && y + offsetY < this.bitmap.height) {
                    const targetIdx = this.getPixelIndex(x + offsetX, y + offsetY);
                    this.bitmap.data[idx] = this.bitmap.data[targetIdx];
                    this.bitmap.data[idx + 1] = this.bitmap.data[targetIdx + 1];
                    this.bitmap.data[idx + 2] = this.bitmap.data[targetIdx + 2];
                }
            });

            // Composite triggered banner at bottom
            image.composite(overlay, 0, 362);

            // Load font and add TRIGGERED text
            const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
            image.print(font, 0, 0, {
                text: 'TRIGGERED',
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_TOP
            }, 512, 100);

            await image.writeAsync(outPath);
            const finalBuffer = fs.readFileSync(outPath);

            // 5. Send result
            const caption = `*${current.title}*\n${current.line.repeat(15)}\n\n😡 *${targetName}* ${current.success}\n\n${current.line.repeat(15)}\n_Powered by VEX AI_`;

            await sock.sendMessage(m.chat, {
                image: finalBuffer,
                caption: caption,
                mentions: [targetUser]
            }, { quoted: m });

            // 6. Cleanup
            fs.existsSync(outPath) && fs.unlinkSync(outPath);

        } catch (error) {
            console.error("VEX TRIGGERED ERROR:", error);
            const errorMsg = `*${current.title}*\n${current.line.repeat(15)}\n${current.fail}`;
            await m.reply(errorMsg);
        }
    }
};
