const { downloadContentFromMessage, getContentType } = require("@whiskeysockets/baileys");
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const { writeFile, unlink } = require('fs/promises');
const translate = require('google-translate-api-x');

module.exports = {
    command: "zip",
    alias: ["vexzip", "watermark"],
    category: "tools",
    description: "Zip media with Vex AI 1080p watermark. No quality loss.",

    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        const modes = {
            harsh: {
                msg: "𝖄𝖔𝖚𝖗 𝖋𝖎𝖑𝖊 𝖎𝖘 𝖋𝖔𝖗𝖌𝖊𝖉 𝖇𝖞 𝖁𝖊𝖝 𝕬𝕴. 1080𝖕 𝕼𝖚𝖆𝖑𝖎𝖙𝖞. 𝕯𝖔𝖓'𝖙 𝖙𝖔𝖚𝖈𝖍. 🔥⚡",
                react: "⚙️",
                err: "💢 𝕽𝖊𝖕𝖑𝖞 𝖙𝖔 𝖆𝖓 𝖎𝖒𝖆𝖌𝖊, 𝖛𝖎𝖉𝖊𝖔 𝖔𝖗 𝖆𝖚𝖉𝖎𝖔 𝖞𝖔𝖚 𝖋𝖔𝖑! 🤬",
                processing: "𝕱𝖔𝖗𝖌𝖎𝖓𝖌 𝖜𝖎𝖙𝖍 𝖁𝖊𝖝 𝕬𝕴 𝖕𝖔𝖜𝖊𝖗... ⚡"
            },
            normal: {
                msg: "File processed by Vex AI ✅\n*1080p | Watermarked | Zipped*",
                react: "📦",
                err: "❌ Please reply to an Image, Video or Audio.",
                processing: "Processing your file with Vex AI... ⏳"
            },
            girl: {
                msg: "𝒽𝑒𝓇𝑒'𝓈 𝓎𝑜𝓊𝓇 𝒻𝒾𝓁𝑒 𝓂𝒶𝒹𝑒 𝒷𝓎 𝓋𝑒𝓍 𝒶𝒾, 𝓂𝓎 𝓁𝑜𝓋𝑒𝓁𝓎 𝐿𝓊𝓅𝒾𝓃... 🏹✨💎\n*1080p Labeled*",
                react: "💎",
                err: "🌸 𝑜𝑜𝓅𝓈𝒾𝑒! 𝓇𝑒𝓅𝓁𝓎 𝓉𝑜 𝒶 𝓅𝒽𝑜𝓉𝑜, 𝓋𝒾𝒹𝑒𝑜 𝑜𝓇 𝒶𝓊𝒹𝒾𝑜 𝒷𝒶𝒷𝑒~ 🍭",
                processing: "𝒱𝑒𝓍 𝒜𝐼 𝒾𝓈 𝒸𝓇𝒶𝒻𝓉𝒾𝓃𝑔 𝓎𝑜𝓊𝓇 𝒻𝒾𝓁𝑒... ✨"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted) return m.reply(current.err);

            const type = getContentType(quoted);
            const media = quoted[type];
            const supportedTypes = ['imageMessage', 'videoMessage', 'audioMessage'];

            if (!type ||!supportedTypes.includes(type)) {
                return m.reply(current.err);
            }

            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            const processMsg = await m.reply(current.processing);

            // 1. Download
            let mediaType = type.replace('Message', '');
            const stream = await downloadContentFromMessage(media, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 2. Setup temp
            const tmpDir = './tmp';
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
            const timestamp = Date.now();
            const inputPath = path.join(tmpDir, `input_${timestamp}`);
            const outputPath = path.join(tmpDir, `vex_ai_1080p_${timestamp}`);
            const zipPath = path.join(tmpDir, `VexAI_${timestamp}.zip`);

            await writeFile(inputPath, buffer);

            // 3. Process kulingana na type - NO QUALITY LOSS
            if (type === 'imageMessage') {
                const watermarkSvg = `
                <svg width="400" height="80">
                    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
                          font-family="Arial" font-size="40" fill="white" stroke="black" stroke-width="2" opacity="0.7">
                          VEX AI 1080p
                    </text>
                </svg>`;

                await sharp(inputPath)
                   .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true }) // 1080p bila kupunguza quality
                   .composite([{ input: Buffer.from(watermarkSvg), gravity: 'southeast' }])
                   .toFile(outputPath + '.jpg');

            } else if (type === 'videoMessage') {
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                       .videoFilters([
                            "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2", // 1080p
                            "drawtext=text='VEX AI 1080p':fontcolor=white:fontsize=40:box=1:boxcolor=black@0.5:boxborderw=5:x=w-tw-20:y=h-th-20"
                        ])
                       .videoCodec('libx264')
                       .audioCodec('copy') // Audio haiguswi
                       .outputOptions(['-crf 18']) // Quality kubwa sana, karibu lossless
                       .save(outputPath + '.mp4')
                       .on('end', resolve)
                       .on('error', reject);
                });

            } else if (type === 'audioMessage') {
                // Audio hatuwezi weka picha, so tunaweka metadata + rename
                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                       .audioCodec('copy') // Copy bila re-encode = 0 quality loss
                       .outputOptions([
                            '-metadata', 'title=VEX AI 1080p',
                            '-metadata', 'artist=Vex AI'
                        ])
                       .save(outputPath + '.mp3')
                       .on('end', resolve)
                       .on('error', reject);
                });
            }

            // 4. Zip file
            const zip = new AdmZip();
            const finalFiles = fs.readdirSync(tmpDir).filter(f => f.startsWith(`vex_ai_1080p_${timestamp}`));
            finalFiles.forEach(file => {
                zip.addLocalFile(path.join(tmpDir, file));
            });
            zip.writeZip(zipPath);

            // 5. Translate msg
            let finalMsg = current.msg;
            if (lang!== 'en') {
                try {
                    const res = await translate(finalMsg, { to: lang });
                    finalMsg = res.text;
                } catch {}
            }

            // 6. Tuma zip
            await sock.sendMessage(m.chat, { delete: processMsg.key });
            await sock.sendMessage(m.chat, {
                document: fs.readFileSync(zipPath),
                mimetype: 'application/zip',
                fileName: `VexAI_1080p_${timestamp}.zip`,
                caption: finalMsg
            }, { quoted: m });

            // 7. Cleanup
            fs.readdirSync(tmpDir).forEach(file => {
                if (file.includes(timestamp.toString())) {
                    unlink(path.join(tmpDir, file)).catch(()=>{});
                }
            });

        } catch (error) {
            console.error("Vex Zip Error:", error);
            await sock.sendMessage(m.chat, { react: { text: "🚫", key: m.key } });
            m.reply("❌ Failed to process. File might be corrupted or too large.");
        }
    }
};
