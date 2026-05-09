const Jimp = require('jimp');
const jsQR = require('jsqr');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    command: "readqr",
    category: "tools",
    description: "Scan and decode any QR code from image",

    async execute(m, sock, { userSettings, lang, prefix }) {
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';

        const modes = {
            harsh: {
                title: "☣️ 𝕍𝔼𝕏 ℚℝ 𝕊ℂ𝔸ℕℕ𝔼ℝ ☣️",
                line: "━",
                noImage: "⚠️ Reply to an image containing a QR code",
                usage: `Example: Reply to QR image with ${prefix}readqr`,
                notFound: "☠️ No QR code detected in the image",
                success: "☠️ QR code decoded successfully",
                react: "🔍"
            },
            normal: {
                title: "📱 QR READER 📱",
                line: "─",
                noImage: "⚠️ Reply to an image with a QR code",
                usage: `Example: Reply to image with ${prefix}readqr`,
                notFound: "❌ No QR code found in the image",
                success: "✅ QR code scanned successfully",
                react: "📱"
            },
            girl: {
                title: "🫧 QR Scanner 🫧",
                line: "┄",
                noImage: "🫧 Please reply to an image with a QR code~ 🫧",
                usage: `🫧 Example: Reply to image with ${prefix}readqr 🫧`,
                notFound: "🫧 No QR code found in this image~ 🫧",
                success: "🫧 QR code scanned perfectly~ 🫧",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            const quoted = m.quoted ? m.quoted : m;
            let imageMessage = null;

            // 1. Check if replied to image or sent image with caption
            if (quoted.message?.imageMessage) {
                imageMessage = quoted.message.imageMessage;
            } else if (quoted.message?.viewOnceMessageV2?.message?.imageMessage) {
                imageMessage = quoted.message.viewOnceMessageV2.message.imageMessage;
            } else if (quoted.message?.viewOnceMessage?.message?.imageMessage) {
                imageMessage = quoted.message.viewOnceMessage.message.imageMessage;
            } else if (m.message?.imageMessage) {
                imageMessage = m.message.imageMessage;
            }

            if (!imageMessage) {
                const msg = `*${current.title}*\n${current.line.repeat(15)}\n${current.noImage}\n\n${current.usage}`;
                return await m.reply(msg);
            }

            // 2. Download image buffer
            const stream = await downloadContentFromMessage(imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 3. Read image with Jimp
            const image = await Jimp.read(buffer);
            const { data, width, height } = image.bitmap;

            // 4. Decode QR using jsQR
            const code = jsQR(new Uint8ClampedArray(data), width, height);

            if (!code || !code.data) {
                const msg = `*${current.title}*\n${current.line.repeat(15)}\n${current.notFound}`;
                return await m.reply(msg);
            }

            // 5. Send decoded result
            const resultText = code.data.trim();
            const msg = `*${current.title}*\n${current.line.repeat(15)}\n${current.success}\n\n📋 *Content:*\n${resultText}`;

            await sock.sendMessage(m.chat, { text: msg }, { quoted: m });

        } catch (error) {
            console.error("VEX READQR ERROR:", error);
            const errorMsg = `*${current.title}*\n${current.line.repeat(15)}\n☠️ Failed to read QR. Image may be blurry or invalid.`;
            await m.reply(errorMsg);
        }
    }
};
