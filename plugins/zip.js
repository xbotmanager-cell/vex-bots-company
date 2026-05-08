const { downloadContentFromMessage, getContentType } = require("@whiskeysockets/baileys");
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const { createWriteStream, createReadStream } = require('fs');
const { pipeline } = require('stream/promises');
const translate = require('google-translate-api-x');

module.exports = {
    command: "zip",
    alias: ["vexzip", "watermark"],
    category: "tools",
    description: "Low RAM Zip: Vex AI 1080p watermark for ALL media types",

    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        const modes = {
            harsh: {
                msg: "𝖄𝖔𝖚𝖗 𝖋𝖎𝖑𝖊 𝖎𝖘 𝖋𝖔𝖗𝖌𝖊𝖉 𝖇𝖞 𝖁𝖊𝖝 𝕬𝕴. 1080𝖕 𝕼𝖚𝖆𝖑𝖎𝖙𝖞. 🔥⚡",
                react: "⚙️",
                err: "💢 𝕽𝖊𝖕𝖑𝖞 𝖙𝖔 𝖆𝖓𝖞 𝖋𝖎𝖑𝖊 𝖔𝖗 𝖘𝖊𝖓𝖉 𝖜𝖎𝖙𝖍 𝖒𝖊𝖉𝖎𝖆! 🤬",
                processing: "𝕱𝖔𝖗𝖌𝖎𝖓𝖌 𝖜𝖎𝖙𝖍 𝖁𝖊𝖝 𝕬𝕴... ⚡"
            },
            normal: {
                msg: "File processed by Vex AI ✅\n*1080p | Watermarked | Zipped*",
                react: "📦",
                err: "❌ Reply to a file or send media with.zip",
                processing: "Processing with Vex AI... ⏳"
            },
            girl: {
                msg: "𝒽𝑒𝓇𝑒'𝓈 𝓎𝑜𝓊𝓇 𝒻𝒾𝓁𝑒 𝓂𝒶𝒹𝑒 𝒷𝓎 𝓋𝑒𝓍 𝒶𝒾... 🏹✨💎\n*1080p Labeled*",
                react: "💎",
                err: "🌸 𝑜𝑜𝓅𝓈𝒾𝑒! 𝓇𝑒𝓅𝓁𝓎 𝓉𝑜 𝒶𝓃𝓎 𝓂𝑒𝒹𝒾𝒶 𝒷𝒶𝒷𝑒~ 🍭",
                processing: "𝒱𝑒𝓍 𝒜𝐼 𝒾𝓈 𝒸𝓇𝒶𝒻𝓉𝒾𝓃𝑔... ✨"
            }
        };

        const current = modes[style] || modes.normal;
        const tmpDir = './tmp';
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        let cleanupFiles = [];
        const addCleanup = (p) => cleanupFiles.push(p);
        const doCleanup = async () => {
            for (const file of cleanupFiles) {
                try { await fs.promises.unlink(file); } catch {}
            }
        };

        try {
            // 1. Pata media: kutoka reply au message yenyewe
            let messageContent = m.message?.extendedTextMessage?.contextInfo?.quotedMessage || m.message;
            let type = getContentType(messageContent);

            // Handle text/emoji kama.txt
            if (!messageContent[type] || type === 'conversation' || type === 'extendedTextMessage') {
                const text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
                if (!text &&!m.message?.extendedTextMessage?.contextInfo?.quotedMessage) return m.reply(current.err);
                if (!text) return m.reply(current.err); // Haina text na haina quoted

                const timestamp = Date.now();
                const txtPath = path.join(tmpDir, `text_${timestamp}.txt`);
                await fs.promises.writeFile(txtPath, `VEX AI 1080p\n\n${text}`);
                addCleanup(txtPath);

                const zipPath = path.join(tmpDir, `VexAI_${timestamp}.zip`);
                const zip = new AdmZip();
                zip.addLocalFile(txtPath);
                zip.writeZip(zipPath);
                addCleanup(zipPath);

                await m.reply(`${current.msg}\n\n_VEX AI 1080p Text_`, {
                    document: await fs.promises.readFile(zipPath),
                    mimetype: 'application/zip',
                    fileName: `VexAI_Text_${timestamp}.zip`
                }, { quoted: m });
                return await doCleanup();
            }

            const media = messageContent[type];
            const supportedTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
            if (!supportedTypes.includes(type)) return m.reply(current.err);

            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            const processMsg = await m.reply(current.processing);

            // 2. Download kwa stream - LOW RAM
            let mediaType = type.replace('Message', '');
            if (mediaType === 'sticker') mediaType = 'image';
            if (mediaType === 'document') mediaType = media.mimetype.split('/')[0]; // image/video/audio

            const timestamp = Date.now();
            const ext = media.mimetype?.split('/')[1]?.split(';')[0] || 'bin';
            const inputPath = path.join(tmpDir, `input_${timestamp}.${ext}`);
            addCleanup(inputPath);

            const stream = await downloadContentFromMessage(media, mediaType);
            await pipeline(stream, createWriteStream(inputPath)); // Haisomi RAM, anaandika direct

            const outputName = `vex_ai_1080p_${timestamp}`;
            let outputPath = '';

            // 3. Process - LOW RAM: sharp + ffmpeg zote zinatumia file, sio buffer
            if (type === 'imageMessage' || type === 'stickerMessage') {
                outputPath = path.join(tmpDir, `${outputName}.jpg`);
                const watermarkSvg = `<svg width="400" height="80"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="40" fill="white" stroke="black" stroke-width="2" opacity="0.7">VEX AI 1080p</text></svg>`;

                await sharp(inputPath)
                   .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
                   .composite([{ input: Buffer.from(watermarkSvg), gravity: 'southeast' }])
                   .jpeg({ quality: 95 }) // High quality
                   .toFile(outputPath);
                addCleanup(outputPath);

            } else if (type === 'videoMessage') {
                outputPath = path.join(tmpDir, `${outputName}.mp4`);
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                       .videoFilters([
                            "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
                            "drawtext=text='VEX AI 1080p':fontcolor=white:fontsize=40:box=1:boxcolor=black@0.5:boxborderw=5:x=w-tw-20:y=h-th-20"
                        ])
                       .videoCodec('libx264').audioCodec('copy')
                       .outputOptions(['-crf 23', '-preset ultrafast']) // ultrafast = RAM ndogo
                       .save(outputPath)
                       .on('end', resolve).on('error', reject);
                });
                addCleanup(outputPath);

            } else { // audioMessage, documentMessage
                outputPath = path.join(tmpDir, `${outputName}.${ext}`);
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                       .audioCodec('copy')
                       .outputOptions(['-metadata', 'title=VEX AI 1080p', '-metadata', 'artist=Vex AI'])
                       .save(outputPath)
                       .on('end', resolve).on('error', reject);
                });
                addCleanup(outputPath);
            }

            // 4. Zip - LOW RAM
            const zipPath = path.join(tmpDir, `VexAI_${timestamp}.zip`);
            const zip = new AdmZip();
            zip.addLocalFile(outputPath);
            zip.writeZip(zipPath);
            addCleanup(zipPath);

            // 5. Translate + Tuma
            let finalMsg = current.msg;
            if (lang!== 'en') {
                try { finalMsg = (await translate(finalMsg, { to: lang })).text; } catch {}
            }

            await sock.sendMessage(m.chat, { delete: processMsg.key });
            await sock.sendMessage(m.chat, {
                document: createReadStream(zipPath), // Stream tena - LOW RAM
                mimetype: 'application/zip',
                fileName: `VexAI_1080p_${timestamp}.zip`,
                caption: finalMsg
            }, { quoted: m });

        } catch (error) {
            console.error("Vex Zip Error:", error);
            await sock.sendMessage(m.chat, { react: { text: "🚫", key: m.key } });
            m.reply("❌ Failed. File too large for free tier or corrupted.");
        } finally {
            await doCleanup(); // Cleanup hata error ikitokea
        }
    }
};
