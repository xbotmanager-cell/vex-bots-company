const yts = require('yt-search');
const ytdl = require('ytdl-core');
const translate = require('google-translate-api-x');

module.exports = {
    command: "video",
    alias: ["playvideo", "youtube", "ytv"],
    category: "download",
    description: "Search and download video from YouTube",

    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';
        const query = args.join(" ");

        const modes = {
            harsh: {
                title: "⛓️ 𝕬set 𝕯𝖊𝖘𝖙𝖗𝖔𝖞𝖊𝖗 ⛓️",
                msg: "𝕳𝖊𝖗𝖊 𝖎𝖘 𝖞𝖔𝖚𝖗 𝖋𝖚𝖈𝖐𝖎𝖓𝖌 𝖛𝖎𝖉𝖊𝖔. 🖕",
                react: "🖕",
                err: "💢 𝖂𝖍𝖊𝖗𝖊 𝖎𝖘 𝖙𝖍𝖊 𝖙𝖎𝖙𝖑𝖊? 𝖄𝖔𝖚 𝖉𝖚𝖒𝖇𝖆𝖘𝖘. 🖕"
            },
            normal: {
                title: "🎥 Video Downloader 🎥",
                msg: "Your video is ready. ✅",
                react: "📥",
                err: "❌ Please provide a video name."
            },
            girl: {
                title: "🎀 𝒴𝑜𝓊𝒯𝓊𝒷𝑒 𝒮𝓌𝑒𝑒𝓉𝒾𝑒 🎀",
                msg: "𝒽𝑒𝓇𝑒 𝒾𝓈 𝓉𝒽𝑒 𝓋𝒾𝒹𝑒𝑜 𝓎𝑜𝓊 𝓁𝑜𝓋𝑒, 𝓂𝓎 𝒦𝒾𝓃𝑔 ... 💍✨",
                react: "👑",
                err: "🌸 𝑜𝑜𝓅𝓈𝒾𝑒! 𝓌𝒽𝒶𝓉 𝓋𝒾𝒹𝑒𝑜 𝒹𝑜 𝓎𝑜𝓊 𝓌𝒶𝓃𝓉, 𝒹𝒶𝓇𝓁𝒾𝓃𝑔? 🍭"
            }
        };

        const current = modes[style] || modes.normal;
        if (!query) return m.reply(current.err);

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            const search = await yts(query);
            const video = search.videos[0];
            if (!video) return m.reply(current.err);

            let finalCaption = current.msg;
            if (lang !== 'en') {
                try {
                    const res = await translate(finalCaption, { to: lang });
                    finalCaption = res.text;
                } catch { /* Silent */ }
            }

            let report = `${current.title}\n\n`;
            report += `📌 **Title:** ${video.title}\n`;
            report += `⏳ **Duration:** ${video.timestamp}\n\n`;
            report += `${finalCaption}`;

            await sock.sendMessage(m.chat, { 
                video: { url: video.url }, 
                caption: report,
                mimetype: 'video/mp4'
            }, { quoted: m });

        } catch (error) {
            console.error("Video Error:", error);
            // Fallback reaction for error
            await sock.sendMessage(m.chat, { react: { text: "⚠️", key: m.key } });
        }
    }
};
