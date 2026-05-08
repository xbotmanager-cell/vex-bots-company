const { downloadContentFromMessage, getContentType } = require("@whiskeysockets/baileys");
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');

module.exports = {
    command: "watermark",
    alias: ["wt", "mark"],
    category: "tools",
    description: "Add Vex AI watermark - same quality, no zip",

    async execute(m, sock, { userSettings }) {
        const style = userSettings?.style || 'normal';

        const modes = {
            harsh: {
                react: "☣️",
                err: "💢 𝕽𝖊𝖕𝖑𝖞 𝖙𝖔 𝖆 𝖕𝖎𝖈𝖙𝖚𝖗𝖊 𝖔𝖗 𝖛𝖎𝖉𝖊𝖔! 🤬",
                done: "☣️ 𝙁𝙊𝙍𝙂𝙀𝘿 𝘽𝙔 𝙑𝙀𝙓 𝘼𝙄 ☣️"
            },
            normal: {
                react: "⚛️",
                err: "❌ Reply to an image or video",
                done: "⚛️ Watermarked by VEX AI"
            },
            girl: {
                react: "💖",
                err: "🌸 𝑅𝑒𝑝𝑙𝑦 𝑡𝑜 𝑎 𝑝𝑖𝑐 𝑜𝑟 𝑣𝑖𝑑𝑒𝑜 𝑏𝑎𝑏𝑒~ 🍭",
                done: "💖 𝑀𝑎𝑟𝑘𝑒𝑑 𝑏𝑦 𝑉𝐸𝑋 𝐴𝐼 ✨"
            }
        };

        const current = modes[style] || modes.normal;
        const tmpDir = './tmp';

        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        let cleanupFiles = [];
        const addCleanup = (p) => cleanupFiles.push(p);
        const doCleanup = async () => {
            for (const file of cleanupFiles) {
                try { if (fs.existsSync(file)) await fs.promises.unlink(file); } catch {}
            }
        };

        try {
            // GET MESSAGE
            let messageContent = m.message?.extendedTextMessage?.contextInfo?.quotedMessage || m.message;
            let type = getContentType(messageContent);

            if (!['imageMessage', 'videoMessage'].includes(type)) {
                return m.reply(current.err);
            }

            await sock.sendMessage(m.chat, {
                react: { text: current.react, key: m.key }
            });

            const media = messageContent[type];
            const mediaType = type.replace('Message', '');
            const timestamp = Date.now();
            const ext = media.mimetype?.split('/')[1]?.split(';')[0] || (type === 'videoMessage'? 'mp4' : 'jpg');
            const inputPath = path.join(tmpDir, `input_${timestamp}.${ext}`);
            addCleanup(inputPath);

            // DOWNLOAD
            const stream = await downloadContentFromMessage(media, mediaType);
            await pipeline(stream, createWriteStream(inputPath));

            const outputName = `vex_wm_${timestamp}`;
            let outputPath = '';

            // WATERMARK SVG - SAME SIZE NA META AI: NDOGO SANA
            const watermarkSvg = `
<svg width="90" height="26">
<style>
.title {
fill:white;
font-size:11px;
font-family:Arial, sans-serif;
font-weight:600;
opacity:0.75;
}
.atom {
fill:none;
stroke:#ffffff;
stroke-width:1.5;
opacity:0.7;
}
</style>
<g transform="translate(3,3)">
<ellipse class="atom" cx="10" cy="10" rx="8" ry="3.5"/>
<ellipse class="atom" cx="10" cy="10" rx="8" ry="3.5" transform="rotate(60 10 10)"/>
<ellipse class="atom" cx="10" cy="10" rx="8" ry="3.5" transform="rotate(-60 10 10)"/>
<circle cx="10" cy="10" r="1.8" fill="white"/>
</g>
<text x="26" y="16" class="title">VEX AI</text>
</svg>
`;

            // IMAGE - SAME QUALITY 100%
            if (type === 'imageMessage') {
                outputPath = path.join(tmpDir, `${outputName}.jpg`);
                addCleanup(outputPath);

                const image = sharp(inputPath, { failOnError: false });
                const metadata = await image.metadata();

                await image
                   .composite([{
                        input: Buffer.from(watermarkSvg),
                        gravity: 'southeast',
                        top: Math.floor(metadata.height * 0.02),
                        left: Math.floor(metadata.width * 0.02),
                        blend: 'over'
                    }])
                   .jpeg({
                        quality: 100,
                        chromaSubsampling: '4:4:4',
                        mozjpeg: true
                    })
                   .toFile(outputPath);

                await sock.sendMessage(m.chat, {
                    image: fs.readFileSync(outputPath),
                    caption: current.done
                }, { quoted: m });

            }

            // VIDEO - SAME QUALITY 100% VIA FFMPEG
            else if (type === 'videoMessage') {
                outputPath = path.join(tmpDir, `${outputName}.mp4`);
                addCleanup(outputPath);

                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                       .videoFilters([
                            "drawtext=text='⚛ VEX AI':fontcolor=white@0.75:fontsize=h*0.018:box=1:boxcolor=black@0.25:boxborderw=4:x=w-tw-w*0.02:y=h-th-h*0.03"
                        ])
                       .videoCodec('libx264')
                       .audioCodec('copy')
                       .outputOptions([
                            '-preset slow',
                            '-crf 18',
                            '-movflags +faststart',
                            '-pix_fmt yuv420p'
                        ])
                       .on('end', resolve)
                       .on('error', (err) => {
                            console.error("FFMPEG ERROR:", err);
                            reject(err);
                        })
                       .save(outputPath);
                });

                await sock.sendMessage(m.chat, {
                    video: fs.readFileSync(outputPath),
                    caption: current.done
                }, { quoted: m });
            }

        } catch (error) {
            console.error("WATERMARK ERROR:", error);
            await sock.sendMessage(m.chat, {
                react: { text: "🚫", key: m.key }
            });
            return m.reply("❌ Failed. File corrupted or too large.");
        } finally {
            await doCleanup();
        }
    }
};
