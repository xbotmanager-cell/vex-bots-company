const yts = require('yt-search');
const ytdl = require('ytdl-core');
const translate = require('google-translate-api-x');
const fs = require('fs');
const path = require('path');

const searchCache = new Map();

module.exports = {
    command: "song",
    alias: ["audio", "nyimbo", "play"],
    category: "download",
    description: "Search and download audio or video with format selection",

    async execute(m, sock, { args, userSettings }) {

        const lang = userSettings?.lang || 'en';
        const style = userSettings?.style || 'harsh';

        const modes = {
            harsh: {
                title: "🎧 𝕬𝖚𝖉𝖎𝖔 𝕰𝖝𝖊𝖈𝖚𝖙𝖎𝖔𝖓𝖊𝖗 🎧",
                selectType: "𝕹𝖔𝖜 𝖈𝖍𝖔𝖔𝖘𝖊 𝖙𝖍𝖊 𝖋𝖔𝖗𝖒𝖆𝖙:\n1. 𝕬𝖚𝖉𝖎𝖔 (𝖒𝖕3)\n2. 𝖁𝖎𝖉𝖊𝖔 (𝖒𝖕4)\n\n𝕳𝖚𝖗𝖗𝖞 𝖚𝖕! 🖕\n_VEX SYSTEM SELECTION_",
                react: "🦾",
                downloading: "📥 𝕯𝖔𝖜𝖓𝖑𝖔𝖆𝖉𝖎𝖓𝖌... ⚙️",
                err: "💢 𝖂𝖍𝖆𝖙 𝖙𝖍𝖊 𝖋𝖚𝖈𝖐 𝖎𝖘 𝖙𝖍𝖎𝖘? 𝕾𝖊𝖓𝖉 𝖆 𝖗𝖊𝖆𝖑 𝖓𝖆𝖒𝖊. 🖕"
            },
            normal: {
                title: "🎵 Music Finder 🎵",
                selectType: "Select Format:\n1. Audio (MP3)\n2. Video (MP4)\n\n_VEX SYSTEM SELECTION_",
                react: "🎧",
                downloading: "📥 Downloading your file...",
                err: "❌ Video not found."
            },
            girl: {
                title: "🎼 𝐿𝓊𝓅𝒾𝓃'𝓈 𝑀𝑒𝓁𝑜𝒹𝓎 🎼",
                selectType: "𝒽𝑜𝓌 𝓈𝒽𝑜𝓊𝓁𝒹 𝒾 𝓈𝑒𝓃𝒹 𝒾𝓉?\n1. 𝒜𝓊𝒹𝒾𝑜 (𝓂𝓅3) 🎶\n2. 𝒱𝒾𝒹𝑒𝑜 (𝓂𝓅4) 🎥\n\n_VEX SYSTEM SELECTION_",
                react: "💖",
                downloading: "📥 𝒹𝑜𝓌𝓃𝓁𝑜𝒶𝒹𝒾𝓃𝑔... ✨",
                err: "🌸 𝑜𝑜𝓅𝓈𝒾𝑒! 𝒾 𝒸𝒶𝓃'𝓉 𝒻𝒾𝓃𝒹 𝓉𝒽𝒶𝓉 𝓈𝑜𝓃𝑔~ 🍭"
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

            // ===== SIKIO SYSTEM =====
            const quotedText =
                m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage?.caption ||
                "";

            if (
                quotedText.includes("VEX SYSTEM SELECTION") &&
                !isNaN(args[0])
            ) {

                const selection = parseInt(args[0]);

                const cached = searchCache.get(m.sender);

                if (!cached) {
                    return m.reply("❌ Session expired. Search again.");
                }

                if (![1, 2].includes(selection)) {
                    return m.reply("❌ Select 1 or 2");
                }

                await sock.sendMessage(m.chat, {
                    react: {
                        text: "⏳",
                        key: m.key
                    }
                });

                const loadingMsg = await m.reply(current.downloading);

                try {

                    const safeTitle = cached.title
                        .replace(/[\\/:*?"<>|]/g, '')
                        .slice(0, 60);

                    // ===== AUDIO =====
                    if (selection === 1) {

                        const audioPath = path.join(
                            tmpDir,
                            `audio_${Date.now()}.mp3`
                        );

                        addCleanup(audioPath);

                        await new Promise((resolve, reject) => {

                            const stream = ytdl(cached.url, {
                                filter: 'audioonly',
                                quality: 'highestaudio',
                                highWaterMark: 1 << 25
                            });

                            const writeStream =
                                fs.createWriteStream(audioPath);

                            stream.pipe(writeStream);

                            stream.on('error', reject);

                            writeStream.on('finish', resolve);

                            writeStream.on('error', reject);
                        });

                        const stats = fs.statSync(audioPath);

                        if (stats.size < 10000) {
                            throw new Error("Invalid audio downloaded");
                        }

                        try {
                            await sock.sendMessage(m.chat, {
                                delete: loadingMsg.key
                            });
                        } catch {}

                        // SEND AS REAL AUDIO
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
                    }

                    // ===== VIDEO =====
                    else if (selection === 2) {

                        const videoPath = path.join(
                            tmpDir,
                            `video_${Date.now()}.mp4`
                        );

                        addCleanup(videoPath);

                        await new Promise((resolve, reject) => {

                            const stream = ytdl(cached.url, {
                                quality: '18',
                                highWaterMark: 1 << 25
                            });

                            const writeStream =
                                fs.createWriteStream(videoPath);

                            stream.pipe(writeStream);

                            stream.on('error', reject);

                            writeStream.on('finish', resolve);

                            writeStream.on('error', reject);
                        });

                        const stats = fs.statSync(videoPath);

                        if (stats.size < 10000) {
                            throw new Error("Invalid video downloaded");
                        }

                        try {
                            await sock.sendMessage(m.chat, {
                                delete: loadingMsg.key
                            });
                        } catch {}

                        // SEND AFTER FULL DOWNLOAD
                        await sock.sendMessage(
                            m.chat,
                            {
                                video: fs.readFileSync(videoPath),
                                caption: `🎬 ${cached.title}`,
                                mimetype: 'video/mp4',
                                fileName: `${safeTitle}.mp4`
                            },
                            { quoted: m }
                        );
                    }

                    searchCache.delete(m.sender);

                    return await cleanup();

                } catch (err) {

                    console.error("DOWNLOAD ERROR:", err);

                    searchCache.delete(m.sender);

                    return m.reply(
                        `❌ Failed downloading media.\n${err.message}`
                    );
                }
            }

            // ===== SEARCH PHASE =====
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

            const video = search.videos[0];

            if (!video) {
                return m.reply(current.err);
            }

            // CACHE
            searchCache.set(m.sender, {
                url: video.url,
                title: video.title,
                timestamp: Date.now()
            });

            // AUTO CLEAN OLD CACHE
            setTimeout(() => {
                searchCache.delete(m.sender);
            }, 300000);

            let menuText = `*${current.title}*\n\n`;

            menuText += `📌 *Found:* ${video.title}\n`;
            menuText += `⏳ *Length:* ${video.timestamp}\n`;
            menuText += `👀 *Views:* ${video.views?.toLocaleString() || 'Unknown'}\n\n`;

            menuText += `${current.selectType}`;

            // THUMB DOWNLOAD FIRST
            let thumb = video.thumbnail;

            try {

                const thumbRes = await fetch(video.thumbnail);

                const thumbBuffer = Buffer.from(
                    await thumbRes.arrayBuffer()
                );

                thumb = thumbBuffer;

            } catch {}

            // SEND MENU
            await sock.sendMessage(
                m.chat,
                {
                    image: thumb,
                    caption: menuText
                },
                { quoted: m }
            );

        } catch (error) {

            console.error("SONG ERROR:", error);

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
            }, 15000);
        }
    }
};
