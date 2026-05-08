const axios = require('axios');
const { getContentType } = require("@whiskeysockets/baileys");
const translate = require('google-translate-api-x');
const { pipeline } = require('stream/promises');
const fs = require('fs');
const path = require('path');

module.exports = {
    command: "tiktok",
    alias: ["tt", "ttsearch"],
    category: "downloader",
    description: "Search & Download TikTok videos with scroll list. Render friendly.",

    async execute(m, sock, { args, userSettings }) {
        const query = args.join(' ');
        const lang = userSettings?.lang || 'en';
        const style = userSettings?.style || 'normal';

        const modes = {
            harsh: {
                msg: "𝕾𝖈𝖗𝖔𝖑 𝖆𝖓𝖉 𝖕𝖎𝖈𝖐 𝖞𝖔𝖚𝖗 𝖕𝖔𝖎𝖘𝖔𝖓. 𝖁𝖊𝖝 𝕬𝕴 𝖉𝖊𝖑𝖎𝖛𝖊𝖗𝖘. 🔥⚡",
                react: "🔥",
                err: "💢 𝖂𝖍𝖆𝖙 𝖘𝖍𝖔𝖚𝖑𝖉 𝕴 𝖘𝖊𝖆𝖗𝖈𝖍, 𝖋𝖔𝖑?.𝖙𝖎𝖐𝖙𝖔𝖐 cats 🤬",
                searching: "𝕳𝖚𝖓𝖙𝖎𝖓𝖌 𝕿𝖎𝖐𝖙𝖔𝖐... ⚡",
                downloading: "𝕯𝖗𝖔𝖕𝖎𝖓𝖌 𝖞𝖔𝖚𝖗 𝖛𝖎𝖉𝖊𝖔... ⚡"
            },
            normal: {
                msg: "Pick a video from the list below:",
                react: "🔍",
                err: "❌ Usage:.tiktok funny cats",
                searching: "Searching TikTok... ⏳",
                downloading: "Downloading your video... ⏳"
            },
            girl: {
                msg: "𝒸𝒽𝑜𝓈𝑒 𝓎𝑜𝓊𝓇 𝓋𝒾𝒹𝑒𝑜 𝒷𝒶𝒷𝑒... 🏹✨💎",
                react: "💖",
                err: "🌸 𝓌𝒽𝒶𝓉 𝓈𝒽𝑜𝓊𝓁𝒹 𝐼 𝓈𝑒𝒶𝓇𝒸𝒽?.𝓉𝒾𝓀𝓉𝑜𝓀 𝒹𝒶𝓃𝒸𝑒 🍭",
                searching: "𝓈𝑒𝒶𝓇𝒸𝒽𝒾𝓃𝑔 𝓉𝒾𝓀𝓉𝑜𝓀... ✨",
                downloading: "𝓈𝑒𝓃𝒹𝒾𝓃𝑔 𝓎𝑜𝓊𝓇 𝓋𝒾𝒹𝑒𝑜... ✨"
            }
        };

        const current = modes[style] || modes.normal;
        if (!query) return m.reply(current.err);

        const tmpDir = './tmp';
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        let cleanupFiles = [];
        const doCleanup = async () => {
            for (const file of cleanupFiles) {
                try { await fs.promises.unlink(file); } catch {}
            }
        };

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            const searchMsg = await m.reply(current.searching);

            // 1. SEARCH: Tumia API ya tikwm.com - free, no key, render friendly
            const searchRes = await axios.post('https://www.tikwm.com/api/feed/search',
                `keywords=${encodeURIComponent(query)}&count=10&cursor=0&HD=1`, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 15000
            });

            const videos = searchRes.data?.data?.videos;
            if (!videos || videos.length === 0) {
                await sock.sendMessage(m.chat, { delete: searchMsg.key });
                return m.reply("❌ No videos found for that search.");
            }

            // 2. TENGENEZA LIST - hii ndio "scroll" ya WhatsApp
            const sections = [{
                title: "TikTok Results",
                rows: videos.slice(0, 10).map((v, i) => ({
                    title: `#${i + 1} | ${v.duration}s | ${(v.size / 1024 / 1024).toFixed(1)}MB`,
                    description: v.title?.substring(0, 50) || `By @${v.author?.unique_id}`,
                    rowId: `.ttdl ${v.video_id}` // Command ya kudownload
                }))
            }];

            const listMessage = {
                text: `${current.msg}\n\n*Search:* ${query}`,
                footer: "Vex AI TikTok | Reply with number or tap",
                title: "TikTok Downloader",
                buttonText: "Scroll Videos",
                sections
            };

            await sock.sendMessage(m.chat, { delete: searchMsg.key });
            await sock.sendMessage(m.chat, listMessage, { quoted: m });

            // Hifadhi results kwa session fupi ili.ttdl iitumie
            global.tiktokCache = global.tiktokCache || {};
            global.tiktokCache[m.sender] = videos;

        } catch (error) {
            console.error("TikTok Search Error:", error);
            m.reply("❌ TikTok search failed. API might be down.");
        }
    }
};

// Command ya pili ya kudownload baada ya kuchagua
module.exports.download = {
    command: "ttdl",
    async execute(m, sock, { args }) {
        const videoId = args[0];
        const videos = global.tiktokCache?.[m.sender];
        const video = videos?.find(v => v.video_id === videoId);

        if (!video) return m.reply("❌ Video expired. Search again with.tiktok");

        const tmpDir = './tmp';
        const timestamp = Date.now();
        const videoPath = path.join(tmpDir, `tt_${timestamp}.mp4`);
        let cleanupFiles = [videoPath];
        const doCleanup = async () => {
            for (const file of cleanupFiles) {
                try { await fs.promises.unlink(file); } catch {}
            }
        };

        try {
            const processMsg = await m.reply("Downloading your video... ⏳");

            // 3. DOWNLOAD STREAM - LOW RAM
            const videoUrl = video.play; // HD link from API
            const response = await axios({ url: videoUrl, method: 'GET', responseType: 'stream', timeout: 60000 });
            await pipeline(response.data, fs.createWriteStream(videoPath));

            await sock.sendMessage(m.chat, { delete: processMsg.key });

            // 4. TUMA VIDEO - STREAM UPLOAD
            await sock.sendMessage(m.chat, {
                video: fs.createReadStream(videoPath), // Stream - LOW RAM
                caption: `*VEX AI 1080p*\n\n${video.title}\n\n@${video.author?.unique_id}`,
                mimetype: 'video/mp4'
            }, { quoted: m });

        } catch (error) {
            console.error("TikTok DL Error:", error);
            m.reply("❌ Download failed. Video might be too large for free tier.");
        } finally {
            await doCleanup();
        }
    }
};
