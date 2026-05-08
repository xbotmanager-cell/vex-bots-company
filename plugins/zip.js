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
    alias: ["vexzip"],
    category: "tools",
    description: "Low RAM Zip: Vex AI 1080p watermark for ALL media types",

    async execute(m, sock, { args, userSettings }) {

        const lang = args[0] && args[0].length === 2
            ? args[0]
            : (userSettings?.lang || 'en');

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
                err: "❌ Reply to a file or send media with .zip",
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

        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        let cleanupFiles = [];

        const addCleanup = (p) => cleanupFiles.push(p);

        const doCleanup = async () => {
            for (const file of cleanupFiles) {
                try {
                    if (fs.existsSync(file)) {
                        await fs.promises.unlink(file);
                    }
                } catch {}
            }
        };    

        try {

            // GET MESSAGE
            let messageContent =
                m.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
                m.message;

            let type = getContentType(messageContent);

            // TEXT MODE
            if (
                !messageContent[type] ||
                type === 'conversation' ||
                type === 'extendedTextMessage'
            ) {

                const text =
                    m.message?.conversation ||
                    m.message?.extendedTextMessage?.text ||
                    '';

                if (!text) {
                    return m.reply(current.err);
                }

                const timestamp = Date.now();

                const txtPath = path.join(tmpDir, `text_${timestamp}.txt`);

                await fs.promises.writeFile(
                    txtPath,
                    `VEX AI 1080P\n\n${text}`
                );

                addCleanup(txtPath);

                const zipPath = path.join(tmpDir, `VexAI_${timestamp}.zip`);

                const zip = new AdmZip();

                zip.addLocalFile(txtPath);

                zip.writeZip(zipPath);

                addCleanup(zipPath);

                await sock.sendMessage(
                    m.chat,
                    {
                        document: createReadStream(zipPath),
                        mimetype: 'application/zip',
                        fileName: `VexAI_Text_${timestamp}.zip`,
                        caption: current.msg
                    },
                    { quoted: m }
                );

                return await doCleanup();
            }

            const media = messageContent[type];

            const supportedTypes = [
                'imageMessage',
                'videoMessage',
                'audioMessage',
                'documentMessage',
                'stickerMessage'
            ];

            if (!supportedTypes.includes(type)) {
                return m.reply(current.err);
            }

            await sock.sendMessage(m.chat, {
                react: {
                    text: current.react,
                    key: m.key
                }
            });

            const processMsg = await m.reply(current.processing);

            // MEDIA TYPE
            let mediaType = type.replace('Message', '');

            if (mediaType === 'sticker') mediaType = 'image';

            if (mediaType === 'document') {
                mediaType = media.mimetype?.split('/')[0] || 'document';
            }

            const timestamp = Date.now();

            const ext =
                media.mimetype?.split('/')[1]?.split(';')[0] ||
                (type === 'videoMessage' ? 'mp4' : 'jpg');

            const inputPath = path.join(
                tmpDir,
                `input_${timestamp}.${ext}`
            );

            addCleanup(inputPath);

            // DOWNLOAD
            try {

                const stream = await downloadContentFromMessage(
                    media,
                    mediaType
                );

                await pipeline(
                    stream,
                    createWriteStream(inputPath)
                );

            } catch (e) {

                console.error("DOWNLOAD ERROR:", e);

                return m.reply("❌ Failed downloading media.");
            }

            const outputName = `vex_ai_1080p_${timestamp}`;

            let outputPath = '';

            // WATERMARK SVG
            const watermarkSvg = `
<svg width="420" height="120">
<style>
.title {
fill:white;
font-size:24px;
font-family:Arial;
font-weight:bold;
opacity:0.92;
}
.atom {
fill:none;
stroke:#ffffff;
stroke-width:2;
opacity:0.82;
}
</style>

<g transform="translate(15,15)">
<ellipse class="atom" cx="26" cy="26" rx="22" ry="9"/>
<ellipse class="atom" cx="26" cy="26" rx="22" ry="9" transform="rotate(60 26 26)"/>
<ellipse class="atom" cx="26" cy="26" rx="22" ry="9" transform="rotate(-60 26 26)"/>
<circle cx="26" cy="26" r="4" fill="white"/>
</g>

<text x="70" y="42" class="title">VEX AI</text>
</svg>
`;

            // IMAGE
            if (
                type === 'imageMessage' ||
                type === 'stickerMessage'
            ) {

                outputPath = path.join(
                    tmpDir,
                    `${outputName}.jpg`
                );

                try {

                    const image = sharp(inputPath, {
                        failOnError: false
                    });

                    const metadata = await image.metadata();

                    const finalWidth =
                        metadata.width > 1920
                            ? 1920
                            : metadata.width || 1080;

                    const finalHeight =
                        metadata.height > 1080
                            ? 1080
                            : metadata.height || 1080;

                    await image
                        .resize(finalWidth, finalHeight, {
                            fit: 'inside',
                            withoutEnlargement: true
                        })
                        .composite([
                            {
                                input: Buffer.from(watermarkSvg),
                                gravity: 'southeast',
                                blend: 'over',
                                top: 0,
                                left: 0
                            }
                        ])
                        .jpeg({
                            quality: 97,
                            mozjpeg: true
                        })
                        .toFile(outputPath);

                } catch (e) {

                    console.error("IMAGE PROCESS ERROR:", e);

                    await fs.promises.copyFile(
                        inputPath,
                        outputPath
                    );
                }

                addCleanup(outputPath);
            }

            // VIDEO
            else if (type === 'videoMessage') {

                outputPath = path.join(
                    tmpDir,
                    `${outputName}.mp4`
                );

                try {

                    await new Promise((resolve) => {

                        ffmpeg(inputPath)
                            .videoFilters([
                                "scale='min(1920,iw)':min'(1080,ih)':force_original_aspect_ratio=decrease",
                                "drawtext=text='⚛ VEX AI':fontcolor=white:fontsize=20:box=1:boxcolor=black@0.35:boxborderw=6:x=w-tw-18:y=h-th-18"
                            ])
                            .videoCodec('libx264')
                            .audioCodec('aac')
                            .outputOptions([
                                '-preset ultrafast',
                                '-crf 23',
                                '-movflags +faststart'
                            ])
                            .on('end', resolve)
                            .on('error', async (err) => {

                                console.error("VIDEO PROCESS ERROR:", err);

                                try {
                                    await fs.promises.copyFile(
                                        inputPath,
                                        outputPath
                                    );
                                } catch {}

                                resolve();
                            })
                            .save(outputPath);
                    });

                } catch (e) {

                    console.error("VIDEO OUTER ERROR:", e);

                    try {
                        await fs.promises.copyFile(
                            inputPath,
                            outputPath
                        );
                    } catch {}
                }

                addCleanup(outputPath);
            }

            // AUDIO/DOCUMENT
            else {

                outputPath = path.join(
                    tmpDir,
                    `${outputName}.${ext}`
                );

                try {

                    await fs.promises.copyFile(
                        inputPath,
                        outputPath
                    );

                } catch (e) {

                    console.error("COPY ERROR:", e);

                    return m.reply("❌ Failed processing file.");
                }

                addCleanup(outputPath);
            }

            // ZIP
            const zipPath = path.join(
                tmpDir,
                `VexAI_${timestamp}.zip`
            );

            try {

                const zip = new AdmZip();

                zip.addLocalFile(outputPath);

                zip.writeZip(zipPath);

                addCleanup(zipPath);

            } catch (e) {

                console.error("ZIP ERROR:", e);

                return m.reply("❌ Failed zipping file.");
            }

            // TRANSLATE
            let finalMsg = current.msg;

            if (lang !== 'en') {
                try {
                    finalMsg = (
                        await translate(finalMsg, { to: lang })
                    ).text;
                } catch {}
            }

            // DELETE PROCESS MSG
            try {
                await sock.sendMessage(m.chat, {
                    delete: processMsg.key
                });
            } catch {}

            // SEND
            try {

                await sock.sendMessage(
                    m.chat,
                    {
                        document: createReadStream(zipPath),
                        mimetype: 'application/zip',
                        fileName: `VexAI_1080p_${timestamp}.zip`,
                        caption: finalMsg
                    },
                    { quoted: m }
                );

            } catch (e) {

                console.error("SEND ERROR:", e);

                try {

                    await sock.sendMessage(
                        m.chat,
                        {
                            document: fs.readFileSync(zipPath),
                            mimetype: 'application/zip',
                            fileName: `VexAI_1080p_${timestamp}.zip`,
                            caption: finalMsg
                        },
                        { quoted: m }
                    );

                } catch {

                    return m.reply("❌ Failed sending file.");
                }
            }

        } catch (error) {

            console.error("VEX ZIP ERROR:", error);

            try {

                await sock.sendMessage(m.chat, {
                    react: {
                        text: "🚫",
                        key: m.key
                    }
                });

            } catch {}

            return m.reply(
                "❌ Failed. File too large, unsupported or corrupted."
            );

        } finally {

            await doCleanup();
        }
    }
};
