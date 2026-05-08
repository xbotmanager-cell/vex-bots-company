const yts = require('yt-search');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const translate = require('google-translate-api-x');

const sessionCache = new Map();

module.exports = {
    command: "video",
    alias: ["playvideo", "youtube", "ytv"],
    category: "download",
    description: "Advanced YouTube Search + MP3/MP4 Downloader",

    async execute(m, sock, { args, userSettings }) {

        const lang = userSettings?.lang || 'en';
        const style = userSettings?.style || 'harsh';

        const modes = {
            harsh: {
                title: "⛓️ 𝖁𝕰𝖃 𝖁𝕴𝕯𝕰𝕺 𝕯𝕰𝕾𝕿𝕽𝕺𝖄𝕰𝕽 ⛓️",
                msg: "𝕮𝖍𝖔𝖔𝖘𝖊 𝖆 𝖓𝖚𝖒𝖇𝖊𝖗 ⚡",
                format: "𝕹𝖔𝖜 𝖈𝖍𝖔𝖔𝖘𝖊:\n1. MP3 🎧\n2. MP4 🎬",
                react: "🦾",
                downloading: "📥 𝕯𝖔𝖜𝖓𝖑𝖔𝖆𝖉𝖎𝖓𝖌... ⚙️",
                err: "💢 𝕿𝖞𝖕𝖊 𝖆 𝖛𝖎𝖉𝖊𝖔 𝖓𝖆𝖒𝖊 🤬"
            },
            normal: {
                title: "🎥 Video Inspector 🎥",
                msg: "Choose a number below",
                format: "Choose format:\n1. MP3\n2. MP4",
                react: "🛰️",
                downloading: "📥 Downloading...",
                err: "❌ Enter video name"
            },
            girl: {
                title: "🎀 𝒴𝑜𝓊𝒯𝓊𝒷𝑒 𝒮𝓌𝑒𝑒𝓉𝒾𝑒 🎀",
                msg: "𝓈𝑒𝓁𝑒𝒸𝓉 𝓎𝑜𝓊𝓇 𝓋𝒾𝒹𝑒𝑜 💖",
                format: "𝒸𝒽𝑜𝑜𝓈𝑒:\n1. MP3 🎶\n2. MP4 🎥",
                react: "💎",
                downloading: "📥 𝒹𝑜𝓌𝓃𝓁𝑜𝒶𝒹𝒾𝓃𝑔... ✨",
                err: "🌸 𝓌𝒽𝒶𝓉 𝓋𝒾𝒹𝑒𝑜 𝒹𝑜 𝓎𝑜𝓊 𝓌𝒶𝓃𝓉?"
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

            const quotedText =
                m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage?.caption || "";

            const userSession = sessionCache.get(m.sender);

            // ======================
            // STEP 2 - SELECT VIDEO
            // ======================

            if (
                quotedText.includes("VEX VIDEO RESULTS") &&
                !isNaN(args[0])
            ) {

                const number = parseInt(args[0]);

                if (!userSession?.results) {
                    return m.reply("❌ Session expired.");
                }

                if (number < 1 || number > userSession.results.length) {
                    return m.reply("❌ Invalid number.");
                }

                const selected = userSession.results[number - 1];

                sessionCache.set(m.sender, {
                    selected
                });

                let formatText = `*${selected.title}*\n\n`;
                formatText += `${current.format}\n\n`;
                formatText += `_VEX FORMAT SELECTION_`;

                return await sock.sendMessage(
                    m.chat,
                    {
                        image: { url: selected.thumbnail },
                        caption: formatText
                    },
                    { quoted: m }
                );
            }

            // ======================
            // STEP 3 - SELECT FORMAT
            // ======================

            if (
                quotedText.includes("VEX FORMAT SELECTION") &&
                !isNaN(args[0])
            ) {

                const choice = parseInt(args[0]);

                if (![1, 2].includes(choice)) {
                    return m.reply("❌ Select 1 or 2");
                }

                const selected = userSession?.selected;

                if (!selected) {
                    return m.reply("❌ Session expired.");
                }

                await sock.sendMessage(m.chat, {
                    react: {
                        text: "⏳",
                        key: m.key
                    }
                });

                const processMsg =
                    await m.reply(current.downloading);

                const safeTitle = selected.title
                    .replace(/[\\/:*?"<>|]/g, '')
                    .slice(0, 60);

                // ======================
                // MP3 DOWNLOAD
                // ======================

                if (choice === 1) {

                    const audioPath = path.join(
                        tmpDir,
                        `audio_${Date.now()}.mp3`
                    );

                    addCleanup(audioPath);

                    try {

                        await new Promise((resolve, reject) => {

                            const stream = ytdl(selected.url, {
                                filter: 'audioonly',
                                quality: 'highestaudio',
                                highWaterMark: 1 << 25
                            });

                            const write =
                                fs.createWriteStream(audioPath);

                            stream.pipe(write);

                            stream.on('error', reject);

                            write.on('finish', resolve);

                            write.on('error', reject);
                        });

                        const stats =
                            fs.statSync(audioPath);

                        if (stats.size < 10000) {
                            throw new Error("Bad audio");
                        }

                        try {
                            await sock.sendMessage(m.chat, {
                                delete: processMsg.key
                            });
                        } catch {}

                        await sock.sendMessage(
                            m.chat,
                            {
                                audio: fs.readFileSync(audioPath),
                                mimetype: 'audio/mpeg',
                                ptt: false,
                                fileName: `${safeTitle}.mp3`
                            },
                            { quoted: m }
                        );

                    } catch (e) {

                        console.error("MP3 ERROR:", e);

                        return m.reply(
                            "❌ Failed downloading MP3."
                        );
                    }
                }

                // ======================
                // MP4 DOWNLOAD
                // ======================

                else if (choice === 2) {

                    const videoPath = path.join(
                        tmpDir,
                        `video_${Date.now()}.mp4`
                    );

                    addCleanup(videoPath);

                    try {

                        await new Promise((resolve, reject) => {

                            const stream = ytdl(selected.url, {
                                quality: '18',
                                highWaterMark: 1 << 25
                            });

                            const write =
                                fs.createWriteStream(videoPath);

                            stream.pipe(write);

                            stream.on('error', reject);

                            write.on('finish', resolve);

                            write.on('error', reject);
                        });

                        const stats =
                            fs.statSync(videoPath);

                        if (stats.size < 10000) {
                            throw new Error("Bad video");
                        }

                        try {
                            await sock.sendMessage(m.chat, {
                                delete: processMsg.key
                            });
                        } catch {}

                        await sock.sendMessage(
                            m.chat,
                            {
                                video: fs.readFileSync(videoPath),
                                caption:
                                    `🎬 ${selected.title}`,
                                mimetype: 'video/mp4',
                                fileName: `${safeTitle}.mp4`
                            },
                            { quoted: m }
                        );

                    } catch (e) {

                        console.error("MP4 ERROR:", e);

                        return m.reply(
                            "❌ Failed downloading MP4."
                        );
                    }
                }

                sessionCache.delete(m.sender);

                return await cleanup();
            }

            // ======================
            // STEP 1 - SEARCH
            // ======================

            const query = args.join(" ");

            if (!query) {
                return m.reply(current.err);
            }

            await sock.sendMessage(m.chat, {
                react: {
                    text: current.react,
                    key: m.key
                }
            });

            const search = await yts(query);

            const results =
                search.videos
                    .filter(v =>
                        v.seconds < 3600 &&
                        v.title &&
                        v.url
                    )
                    .slice(0, 5);

            if (!results.length) {
                return m.reply(current.err);
            }

            sessionCache.set(m.sender, {
                results
            });

            setTimeout(() => {
                sessionCache.delete(m.sender);
            }, 300000);

            let menu = `*${current.title}*\n\n`;

            results.forEach((v, i) => {

                menu +=
                    `*${i + 1}.* ${v.title}\n`;

                menu +=
                    `⏱️ ${v.timestamp}\n`;

                menu +=
                    `👁️ ${v.views?.toLocaleString() || '0'} Views\n\n`;
            });

            menu += `${current.msg}\n\n`;
            menu += `_VEX VIDEO RESULTS_`;

            // DOWNLOAD THUMB FIRST
            let thumb = results[0].thumbnail;

            try {

                const thumbRes =
                    await fetch(results[0].thumbnail);

                thumb = Buffer.from(
                    await thumbRes.arrayBuffer()
                );

            } catch {}

            await sock.sendMessage(
                m.chat,
                {
                    image: thumb,
                    caption: menu
                },
                { quoted: m }
            );

        } catch (error) {

            console.error("VIDEO ERROR:", error);

            try {

                await sock.sendMessage(m.chat, {
                    react: {
                        text: "🚫",
                        key: m.key
                    }
                });

            } catch {}

            return m.reply(
                "❌ Failed processing request."
            );

        } finally {

            setTimeout(async () => {
                await cleanup();
            }, 10000);
        }
    }
};
