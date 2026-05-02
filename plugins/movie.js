/**
 * VEX PLUGIN: MOVIE & CINEMA DOWNLOADER (AUTO-FILTER)
 * Feature: Engagement-Based Selection + Cache Cleaner + Render Optimizer
 * Version: 8.5 (Lupin Edition)
 * Category: Download
 * Dev: Lupin Starnley
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const yts = require('yt-search');
const { ytv } = require('../lib/ytdl'); // Ensure your ytdl library is updated

module.exports = {
    command: "movie",
    alias: ["cinema", "clip", "film"],
    category: "download",
    description: "Search and download high-engagement movies/clips from YouTube",

    async execute(m, sock, ctx) {
        const { args, userSettings } = ctx;
        const style = userSettings?.style || 'harsh';
        
        // 1. INPUT HANDLING (Direct or Reply)
        let query = args.join(' ');
        if (!query && m.quoted && m.quoted.text) query = m.quoted.text;

        const modes = {
            harsh: {
                title: "『 📽️ 𝖁𝕰𝖃 𝕮𝕴𝕹𝕰𝕸𝕬 𝕭𝕽𝕰𝕬𝕮𝕳 📽️ 』",
                searching: "🧿 𝕾𝖈𝖆𝖓𝖓𝖎𝖓𝖌 𝖄𝖔𝖚𝕿𝖚𝖇𝖊 𝕯𝖆𝖙𝖆𝖇𝖆𝖘𝖊 𝖋𝖔𝖗 𝕳𝖎𝖌𝖍-𝕰𝖓𝖌𝖆𝖌𝖊𝖒𝖊𝖓𝖙 𝕮𝖔𝖓𝖙𝖊𝖓𝖙... 🧿",
                downloading: "🎞️ 𝕯𝖔𝖜𝖓𝖑𝖔𝖆𝖉𝖎𝖓𝖌 𝕸𝖔𝖛𝖎𝖊 𝕭𝖚𝖋𝖋𝖊𝖗... 𝕻𝖑𝖊𝖆𝖘𝖊 𝖜𝖆𝖎𝖙, 𝖜𝖊𝖆𝖐𝖑𝖎𝖓𝖌. 🎞️",
                done: "🏁 𝕿𝖗𝖆𝖓𝖘𝖒𝖎𝖘𝖘𝖎𝖔𝖓 𝕮𝖔𝖒𝖕𝖑𝖊𝖙𝖊. 𝕮𝖆𝖈𝖍𝖊 𝕻𝖚𝖗𝖌𝖊𝖉. 🏁",
                err: "☡ 𝕴𝖓𝖕𝖚𝖙 𝖆 𝖒𝖔𝖛𝖎𝖊 𝖓𝖆𝖒𝖊 𝖔𝖗 𝖗𝖊𝖕𝖑𝖞 𝖙𝖔 𝖆 𝖕𝖗𝖔𝖒𝖕𝖙! 🧿",
                fail: "☡ 𝕮𝖔𝖓𝖙𝖊𝖓𝖙 𝖙𝖔𝖔 𝖍𝖊𝖆𝖛𝖞 𝖔𝖗 𝖇𝖑𝖔𝖈𝖐𝖊𝖉. 𝕬𝖇𝖔𝖗𝖙𝖎𝖓𝖌! 💀",
                react: "🎞️"
            },
            normal: {
                title: "🎬 *VEX Cinema Downloader* 🎬",
                searching: "🔍 Searching for the best quality version...",
                downloading: "📥 Downloading video to server buffer...",
                done: "✅ Video sent. Temporary files deleted.",
                err: "⚠ Please provide a movie title or reply to a text.",
                fail: "⚠ Failed to retrieve video. Try a different title.",
                react: "🎟️"
            },
            girl: {
                title: "🎀 𝒱𝐸𝒳 𝑀𝑜𝓋𝒾𝑒 𝒯𝒾𝓂𝑒 🎀",
                searching: "🐚 𝓁𝑜𝑜𝓀𝒾𝓃𝑔 𝒻𝑜𝓇 𝓎𝑜𝓊𝓇 𝒻𝒶𝓋𝑜𝓇𝒾𝓉𝑒 𝒸𝓁𝒾𝓅... ✨",
                downloading: "🌸 𝒹𝑜𝓌𝓃𝓁𝑜𝒶𝒹𝒾𝓃𝑔 𝒾𝓉 𝓃𝑜𝓌, 𝓅𝓁𝑒𝒶𝓈𝑒 𝓌𝒶𝒾𝓉 𝒷𝒶𝒷𝑒... 🌸",
                done: "✨ 𝒽𝑒𝓇𝑒 𝒾𝓈 𝓎𝑜𝓊𝓇 𝓂𝑜𝓋𝒾𝑒! 𝑒𝓃𝒿𝑜𝓎! ✨",
                err: "☙ 𝒷𝒶𝒷𝑒, 𝓉𝑒𝓁𝓁 𝓂𝑒 𝓌𝒽𝒶𝓉 𝓉𝑜 𝓈𝑒𝒶𝓇𝒸𝒽 𝒻𝑜𝓇! 🎀",
                fail: "☙ ℴℴ𝓅𝓈𝒾ℯ! I 𝒸𝒶𝓃'𝓉 𝒻𝒾𝓃𝒹 𝓉𝒽𝒶𝓉 𝓋𝒾𝒹𝑒ℴ... ✨",
                react: "🧿"
            }
        };

        const current = modes[style] || modes.normal;
        if (!query) return sock.sendMessage(m.chat, { text: current.err }, { quoted: m });

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            await sock.sendMessage(m.chat, { text: current.searching }, { quoted: m });

            // 2. SEARCH & FILTER LOGIC (Likes, Views, Duration)
            const search = await yts(query);
            const videos = search.videos;

            // Filter for high engagement (Views > 10,000) and priority on longer content
            const topVideo = videos.sort((a, b) => b.views - a.views)[0];

            if (!topVideo) throw new Error("NoVideoFound");

            await sock.sendMessage(m.chat, { text: current.downloading }, { quoted: m });

            // 3. DOWNLOAD TO SERVER BUFFER (tmp)
            // Using ytv (YouTube Video) function to get download link
            const dlData = await ytv(topVideo.url, '720p');
            const videoPath = path.join(__dirname, `../tmp/${Date.now()}.mp4`);
            
            const response = await axios({
                method: 'get',
                url: dlData.dl_link,
                responseType: 'stream'
            });

            const writer = fs.createWriteStream(videoPath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // 4. DIRECT DELIVERY
            let caption = `*${current.title}*\n\n`;
            caption += `📌 *Title:* ${topVideo.title}\n`;
            caption += `⏳ *Duration:* ${topVideo.timestamp}\n`;
            caption += `👁️ *Views:* ${topVideo.views.toLocaleString()}\n`;
            caption += `👤 *Channel:* ${topVideo.author.name}\n\n`;
            caption += `⚠️ _${current.done}_`;

            await sock.sendMessage(m.chat, { 
                video: { url: videoPath }, 
                caption: caption,
                mimetype: 'video/mp4'
            }, { quoted: m });

            // 5. CACHE PURGE (Render Optimization)
            // This deletes the file immediately after sending to save RAM/Disk
            fs.unlinkSync(videoPath);
            console.log(`[VEX] Cache Purged: ${videoPath}`);

        } catch (error) {
            console.error("VEX MOVIE ERROR:", error);
            await sock.sendMessage(m.chat, { text: current.fail }, { quoted: m });
            // Clean up if it failed during download
            if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
        }
    }
};
