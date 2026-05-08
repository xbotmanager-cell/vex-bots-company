const axios = require('axios');
const { pipeline } = require('stream/promises');
const fs = require('fs');
const path = require('path');

// --- SUPER POWER CACHE SYSTEM ---
global.tiktokCache = global.tiktokCache || {};

module.exports = {
    command: "tsearch",
    alias: ["tt", "ttsearch", "tiktok"],
    category: "downloader",
    description: "Vex AI TikTok Search & Download - Professional Edition",

    async execute(m, sock, { args, userSettings }) {
        const query = args.join(' ');
        const style = userSettings?.style || 'normal';

        // Custom reaction themes based on user style
        const themes = {
            harsh: { search: "⚡", download: "📥", err: "💢 Keywords are missing! .tsearch <search>", listMsg: "𝕻𝖎𝖈𝖐 𝖞𝖔𝖚𝖗 𝖛𝖎𝖉𝖊𝖔, 𝕷𝖚𝖕𝖎𝖓... 🔥" },
            normal: { search: "🔍", download: "⏳", err: "❌ Please provide search keywords.", listMsg: "Vex AI: Select a video from the results:" },
            girl: { search: "💖", download: "🎀", err: "🌸 Tell me what to search, darling~", listMsg: "𝒸𝒽𝑜𝓈𝑒 𝓎𝑜𝓊𝓇 𝒻𝒶𝓋𝑜𝓇𝒾𝓉𝑒 𝓋𝒾𝒹𝑒𝑜... ✨" }
        };

        const theme = themes[style] || themes.normal;

        // 1. Validation
        if (!query) return m.reply(theme.err);

        try {
            // 2. React to indicate start (Silent Mode)
            await sock.sendMessage(m.chat, { react: { text: theme.search, key: m.key } });

            // 3. Search API Logic
            const searchRes = await axios.post('https://www.tikwm.com/api/feed/search',
                `keywords=${encodeURIComponent(query)}&count=12&cursor=0&HD=1`, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 20000
            });

            const videos = searchRes.data?.data?.videos;
            if (!videos || videos.length === 0) {
                return m.reply("❌ No results found. Try different keywords.");
            }

            // 4. Build Professional List Message
            const sections = [{
                title: "🔥 TRENDING RESULTS",
                rows: videos.map((v, i) => ({
                    title: `Video #${i + 1} | ${v.duration}s`,
                    description: `👁️ ${v.play_count.toLocaleString()} | ❤️ ${v.digg_count.toLocaleString()}\n📝 ${v.title?.substring(0, 40) || "No Title"}`,
                    rowId: `.ttdl ${v.video_id}`
                }))
            }];

            const listMessage = {
                text: `${theme.listMsg}\n\n*Query:* _${query}_`,
                footer: "Vex AI Super Agent • Powered by Lupin Starnley",
                buttonText: "Scroll Results 🖱️",
                sections
            };

            // 5. Store in global cache for 15 minutes
            global.tiktokCache[m.sender] = {
                videos,
                timestamp: Date.now()
            };

            await sock.sendMessage(m.chat, listMessage, { quoted: m });

        } catch (error) {
            console.error("TikTok Search Fail:", error.message);
            m.reply("❌ API Connection failed. Try again in a moment.");
        }
    }
};

// --- DOWNLOADER COMPONENT (SUPER POWERED) ---
module.exports.download = {
    command: "ttdl",
    async execute(m, sock, { args }) {
        const videoId = args[0];
        const cache = global.tiktokCache?.[m.sender];
        
        // Safety: Auto-expire cache after 15 minutes
        if (!cache || (Date.now() - cache.timestamp > 900000)) {
            return m.reply("❌ Session expired. Please search again.");
        }

        const video = cache.videos.find(v => v.video_id === videoId);
        if (!video) return;

        const tmpDir = './tmp';
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        
        const videoPath = path.join(tmpDir, `vex_tt_${Date.now()}.mp4`);

        try {
            // React for downloading
            await sock.sendMessage(m.chat, { react: { text: "📥", key: m.key } });

            // 1. Optimized Stream Download (Render-Friendly)
            const response = await axios({
                url: video.play, 
                method: 'GET', 
                responseType: 'stream',
                timeout: 90000
            });

            await pipeline(response.data, fs.createWriteStream(videoPath));

            // 2. High-Quality Video Send
            await sock.sendMessage(m.chat, {
                video: { url: videoPath },
                caption: `✅ *VEX AI DOWNLOADER*\n\n*Title:* ${video.title || "TikTok Video"}\n*Author:* @${video.author?.unique_id}\n*Views:* ${video.play_count.toLocaleString()}\n*Music:* ${video.music_info?.title || "Original Sound"}`,
                mimetype: 'video/mp4',
                fileName: `vex_tiktok.mp4`
            }, { quoted: m });

            // Success Reaction
            await sock.sendMessage(m.chat, { react: { text: "✅", key: m.key } });

        } catch (error) {
            console.error("TikTok DL Fail:", error.message);
            m.reply("❌ Download failed. The video link might be broken.");
        } finally {
            // Clean up files immediately to save Render disk space
            if (fs.existsSync(videoPath)) {
                fs.promises.unlink(videoPath).catch(console.error);
            }
        }
    }
};
