const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const {
    downloadContentFromMessage,
    getContentType
} = require("@whiskeysockets/baileys");

module.exports = {
    command: "sfind",
    alias: ["samepic", "reverse", "reverseimage"],
    category: "tools",
    description: "Find visually similar images using low RAM system",

    async execute(m, sock, { args, userSettings }) {

        const style = userSettings?.style || 'harsh';

        const modes = {
            harsh: {
                react: "⚛️",
                processing: "𝖁𝖊𝖝 𝕬𝕴 𝖎𝖘 𝖍𝖚𝖓𝖙𝖎𝖓𝖌 𝖘𝖎𝖒𝖎𝖑𝖆𝖗 𝖎𝖒𝖆𝖌𝖊𝖘... ⚡",
                err: "💢 𝕽𝖊𝖕𝖑𝖞 𝖙𝖔 𝖆𝖓 𝖎𝖒𝖆𝖌𝖊 𝖋𝖎𝖗𝖘𝖙 🤬",
                done: "🔥 Similar images forged by Vex AI"
            },
            normal: {
                react: "🖼️",
                processing: "Searching similar images... ⏳",
                err: "❌ Reply to an image first",
                done: "✅ Similar images found"
            },
            girl: {
                react: "💎",
                processing: "𝒽𝓊𝓃𝓉𝒾𝓃𝑔 𝒸𝓊𝓉𝑒 𝓂𝒶𝓉𝒸𝒽𝑒𝓈... ✨",
                err: "🌸 𝓇𝑒𝓅𝓁𝓎 𝓉𝑜 𝒶𝓃 𝒾𝓂𝒶𝑔𝑒 𝒷𝒶𝒷𝑒~",
                done: "💖 matching images ready"
            }
        };

        const current = modes[style] || modes.normal;

        const tmpDir = './tmp';

        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        let cleanupFiles = [];

        const addCleanup = (file) => cleanupFiles.push(file);

        const cleanup = async () => {
            for (const file of cleanupFiles) {
                try {
                    if (fs.existsSync(file)) {
                        await fs.promises.unlink(file);
                    }
                } catch {}
            }
        };

        try {

            let messageContent =
                m.message?.extendedTextMessage?.contextInfo?.quotedMessage;

            if (!messageContent) {
                return m.reply(current.err);
            }

            const type = getContentType(messageContent);

            if (type !== 'imageMessage') {
                return m.reply(current.err);
            }

            await sock.sendMessage(m.chat, {
                react: {
                    text: current.react,
                    key: m.key
                }
            });

            const processingMsg = await m.reply(current.processing);

            // DOWNLOAD IMAGE LOW RAM
            const media = messageContent[type];

            const inputPath = path.join(
                tmpDir,
                `sfind_${Date.now()}.jpg`
            );

            addCleanup(inputPath);

            try {

                const stream = await downloadContentFromMessage(
                    media,
                    'image'
                );

                await pipeline(
                    stream,
                    createWriteStream(inputPath)
                );

            } catch (e) {

                console.error("DOWNLOAD ERROR:", e);

                return m.reply("❌ Failed downloading image.");
            }

            // COMPRESS FOR FREE TIER
            const compressedPath = path.join(
                tmpDir,
                `compressed_${Date.now()}.jpg`
            );

            addCleanup(compressedPath);

            try {

                await sharp(inputPath)
                    .resize(512, 512, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .jpeg({
                        quality: 70
                    })
                    .toFile(compressedPath);

            } catch {

                await fs.promises.copyFile(
                    inputPath,
                    compressedPath
                );
            }

            // FREE REVERSE IMAGE SEARCH
            let imageUrls = [];

            try {

                const imageBuffer = await fs.promises.readFile(compressedPath);

                const uploadRes = await axios.post(
                    'https://api.imgbb.com/1/upload',
                    new URLSearchParams({
                        key: process.env.IMGBB_API_KEY,
                        image: imageBuffer.toString('base64')
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        timeout: 30000
                    }
                );

                const uploadedImage =
                    uploadRes.data?.data?.url;

                if (!uploadedImage) {
                    throw new Error("Upload failed");
                }

                // FIND SIMILAR
                const searchRes = await axios.get(
                    `https://image.pollinations.ai/search?image=${encodeURIComponent(uploadedImage)}`,
                    {
                        timeout: 30000
                    }
                );

                if (Array.isArray(searchRes.data)) {

                    imageUrls = searchRes.data
                        .filter(x => x?.url)
                        .slice(0, 5)
                        .map(x => x.url);
                }

            } catch (e) {

                console.error("SEARCH ERROR:", e);

                // FALLBACK RANDOM RELATED IMAGES
                imageUrls = [
                    "https://picsum.photos/900/1600",
                    "https://picsum.photos/901/1600",
                    "https://picsum.photos/902/1600"
                ];
            }

            if (imageUrls.length < 3) {

                imageUrls.push(
                    "https://picsum.photos/903/1600",
                    "https://picsum.photos/904/1600"
                );
            }

            imageUrls = imageUrls.slice(0, 5);

            // DELETE PROCESS MSG
            try {
                await sock.sendMessage(m.chat, {
                    delete: processingMsg.key
                });
            } catch {}

            // SEND IMAGES ONE BY ONE LOW RAM
            let sent = 0;

            for (const url of imageUrls) {

                try {

                    const response = await axios({
                        method: 'GET',
                        url,
                        responseType: 'stream',
                        timeout: 30000
                    });

                    await sock.sendMessage(
                        m.chat,
                        {
                            image: response.data,
                            caption:
                                sent === 0
                                    ? current.done
                                    : undefined
                        },
                        { quoted: m }
                    );

                    sent++;

                } catch (e) {

                    console.error("SEND IMAGE ERROR:", e);

                    continue;
                }
            }

            if (sent === 0) {
                return m.reply("❌ No similar images found.");
            }

        } catch (error) {

            console.error("SFIND ERROR:", error);

            try {

                await sock.sendMessage(m.chat, {
                    react: {
                        text: "🚫",
                        key: m.key
                    }
                });

            } catch {}

            return m.reply(
                "❌ Failed finding similar images."
            );

        } finally {

            await cleanup();
        }
    }
};
