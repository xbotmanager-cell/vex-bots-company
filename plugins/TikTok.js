const axios = require('axios');
const { pipeline } = require('stream/promises');
const fs = require('fs');
const path = require('path');

// --- SUPER POWER CACHE + MEMORY MANAGEMENT ---
global.tiktokCache = global.tiktokCache || {};

// Auto-cleanup old cache entries (every 10 minutes)
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of Object.entries(global.tiktokCache)) {
        if (now - data.timestamp > 900000) { // 15 min
            delete global.tiktokCache[key];
        }
    }
    // Force GC hint on low-memory hosts
    if (global.gc) global.gc();
}, 600000);

module.exports = {
    command: "tsearch",
    alias: ["tt", "ttsearch", "tiktok"],
    category: "downloader",
    description: "Vex AI TikTok Search & Download",

    async execute(m, sock, { args, userSettings }) {
        const query = args.join(' ').trim();
        const style = userSettings?.style || 'normal';

        const themes = {
            harsh: { search: "⚡", download: "📥", err: "💢 Keywords are missing! .tsearch <search>", listMsg: "𝕻𝖎𝖈𝖐 𝖞𝖔𝖚𝖗 𝖛𝖎𝖉𝖊𝖔, 𝕷𝖚𝖕𝖎𝖓... 🔥" },
            normal: { search: "🔍", download: "⏳", err: "❌ Please provide search keywords.", listMsg: "Vex AI: Select a video from the results:" },
            girl: { search: "💖", download: "🎀", err: "🌸 Tell me what to search, darling~", listMsg: "𝒸𝒽𝑜𝓈𝑒 𝓎𝑜𝓊𝓇 𝒻𝒶𝓋𝑜𝓇𝒾𝓉𝑒 𝓋𝒾𝒹𝒆𝑜... ✨" }
        };
        const theme = themes[style] || themes.normal;

        if (!query) return m.reply(theme.err);

        try {
            await sock.sendMessage(m.chat, { react: { text: theme.search, key: m.key } });

            // TikWM Search (still working in 2026)
            const searchRes = await axios.post(
                'https://www.tikwm.com/api/feed/search',
                `keywords=${encodeURIComponent(query)}&count=10&cursor=0&HD=1`,
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    timeout: 15000
                }
            );

            const videos = searchRes.data?.data?.videos || [];
            if (videos.length === 0) {
                return m.reply("❌ No results found. Try different keywords.");
            }

            // Cache per user
            global.tiktokCache[m.sender] = {
                videos,
                timestamp: Date.now()
            };

            const sections = [{
                title: "🔥 TRENDING RESULTS",
                rows: videos.map((v, i) => ({
                    title: `Video #${i + 1} | ${v.duration || '?'}s`,
                    description: `👁️ ${Number(v.play_count || 0).toLocaleString()} | ❤️ ${Number(v.digg_count || 0).toLocaleString()}\n${(v.title || "No title").substring(0, 55)}...`,
                    rowId: `.ttdl ${v.video_id || v.id}`
                }))
            }];

            const listMessage = {
                text: `${theme.listMsg}\n\n*Query:* _${query}_`,
                footer: "Vex AI • TikWM Powered",
                buttonText: "Choose Video",
                sections
            };

            await sock.sendMessage(m.chat, listMessage, { quoted: m });

        } catch (error) {
            console.error("TikTok Search Error:", error.message);
            m.reply("❌ Search failed. TikTok/TikWM might be slow. Try again.");
        }
    }
};

// ====================== DOWNLOADER ======================
module.exports.download = {
    command: "ttdl",
    async execute(m, sock, { args }) {
        const videoId = args[0];
        const cache = global.tiktokCache?.[m.sender];

        if (!cache || (Date.now() - cache.timestamp > 900000)) {
            return m.reply("❌ Session expired. Search again with .tsearch");
        }

        const video = cache.videos.find(v => String(v.video_id || v.id) === String(videoId));
        if (!video) return m.reply("❌ Video not found in cache.");

        const tmpDir = './tmp';
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const videoPath = path.join(tmpDir, `vex_tt_${Date.now()}.mp4`);

        try {
            await sock.sendMessage(m.chat, { react: { text: "📥", key: m.key } });

            // Prefer no-watermark HD link from TikWM response
            let downloadUrl = video.play || video.video_url || video.url;

            const response = await axios({
                url: downloadUrl,
                method: 'GET',
                responseType: 'stream',
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            await pipeline(response.data, fs.createWriteStream(videoPath));

            await sock.sendMessage(m.chat, {
                video: { url: videoPath },
                caption: `✅ *VEX AI TIKTOK DOWNLOADER*\n\n` +
                        `*Title:* ${video.title || "TikTok Video"}\n` +
                        `*Author:* @${video.author?.unique_id || video.author?.nickname || "Unknown"}\n` +
                        `*Views:* ${Number(video.play_count || 0).toLocaleString()}`,
                mimetype: 'video/mp4',
                fileName: `${video.title?.replace(/[^a-z0-9]/gi, '_').slice(0, 30) || 'tiktok'}.mp4`
            }, { quoted: m });

            await sock.sendMessage(m.chat, { react: { text: "✅", key: m.key } });

        } catch (error) {
            console.error("Download Error:", error.message);
            m.reply("❌ Download failed (video may be private or link expired).");
        } finally {
            // Aggressive cleanup for Render free tier
            setTimeout(() => {
                if (fs.existsSync(videoPath)) {
                    fs.unlink(videoPath, () => {});
                }
            }, 5000);
        }
    }
};
