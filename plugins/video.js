const yts = require('yt-search');
const ytdl = require('ytdl-core');
const translate = require('google-translate-api-x');

// Cache ya muda kuzuia kutafuta tena
const videoCache = new Map();

module.exports = {
    command: "video",
    alias: ["playvideo", "youtube", "ytv"],
    category: "download",
    description: "Search and download high-quality YouTube video",

    async execute(m, sock, { args, userSettings }) {
        const lang = userSettings?.lang || 'en';
        const style = userSettings?.style || 'harsh';
        const query = args.join(" ");

        const modes = {
            harsh: {
                title: "⛓️ 𝖁𝕰𝖃 𝖁𝕴𝕯𝕰𝕺 𝕯𝕰𝕾𝕿𝕽𝕺𝖄𝕰𝕽 ⛓️",
                msg: "𝕮𝖍𝖔𝖔𝖘𝖊 𝖆 𝖓𝖚𝖒𝖇𝖊𝖗 𝖔𝖗 𝖉𝖎𝖊. 🖕",
                react: "🦾",
                downloading: "📥 𝕯𝖔𝖜𝖓𝖑𝖔𝖆𝖉𝖎𝖓𝖌... 𝖉𝖔𝖓'𝖙 𝖗𝖚𝖘𝖍 𝖒𝖊. 🤬",
                err: "💢 𝕿𝖞𝖕𝖊 𝖆 𝖛𝖎𝖉𝖊𝖔 𝖓𝖆𝖒𝖊, 𝖞𝖔𝖚 𝖜𝖔𝖗𝖙𝖍𝖑𝖊𝖘𝖘 𝖕𝖎ece 𝖔𝖋 𝖘𝖍𝖎𝖙. 🖕"
            },
            normal: {
                title: "🎥 Video Inspector 🎥",
                msg: "Select a number to download the video. ✅",
                react: "🛰️",
                downloading: "📥 Processing your video, please wait...",
                err: "❌ Please provide a video name."
            },
            girl: {
                title: "🎀 𝒴𝑜𝓊𝒯𝓊𝒷𝑒 𝒮𝓌𝑒𝑒𝓉𝒾𝑒 🎀",
                msg: "𝓌𝒽𝒾𝒸𝒽 𝓋𝒾𝒹𝑒𝑜 𝓈𝒽𝑜𝓊𝓁𝒹 𝒾 𝓅𝓁𝒶𝓎 𝒻𝑜𝓇 𝓎𝑜𝓊, 𝓂𝓎 𝒦𝒾𝓃𝑔? 💍✨",
                react: "💎",
                downloading: "📥 𝒹𝑜𝓌𝓃𝓁𝑜𝒶𝒹𝒾𝓃𝑔 𝒻𝑜𝓇 𝓎𝑜𝓊, 𝒷𝒶𝒷𝑒... 🌸",
                err: "🌸 𝑜𝑜𝓅𝓈𝒾𝑒! 𝓌𝒽𝒶𝓉 𝓋𝒾𝒹𝑒𝑜 𝒹𝑜 𝓎𝑜𝓊 𝓌𝒶𝓃𝓉, 𝒹𝒶𝓇𝓁𝒾𝓃𝑔? 🍭"
            }
        };

        const current = modes[style] || modes.normal;

        // Logic ya Sikio la Namba (Selection)
        const quotedText = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage?.caption || "";
        if (quotedText.includes("VEX VIDEO SELECTION") && !isNaN(args[0])) {
            const index = parseInt(args[0]) - 1;
            const cached = videoCache.get(m.sender);
            if (!cached || !cached[index]) return;

            const selected = cached[index];
            await sock.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });
            await m.reply(current.downloading);

            try {
                // FIXED: Stream download kuhakikisha video inafunguka WhatsApp
                const stream = ytdl(selected.url, { 
                    filter: 'itemrendered', 
                    quality: 'highestvideo' 
                });

                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }

                await sock.sendMessage(m.chat, { 
                    video: buffer, 
                    caption: `🎬 ${selected.title}`,
                    mimetype: 'video/mp4',
                    fileName: `${selected.title}.mp4`
                }, { quoted: m });

                return videoCache.delete(m.sender);
            } catch (e) {
                return m.reply(`🛑 Critical Error: ${e.message}`);
            }
        }

        // Search Phase
        if (!query) return m.reply(current.err);
        await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

        try {
            const search = await yts(query);
            const results = search.videos.slice(0, 5);
            if (results.length === 0) return m.reply(current.err);

            videoCache.set(m.sender, results);

            let menuText = `*${current.title}*\n\n`;
            results.forEach((vid, i) => {
                menuText += `*${i + 1}*. ${vid.title} (${vid.timestamp})\n`;
            });
            menuText += `\n${current.msg}\n\n_VEX VIDEO SELECTION_`;

            await sock.sendMessage(m.chat, { 
                image: { url: results[0].thumbnail }, 
                caption: menuText 
            }, { quoted: m });

        } catch (error) {
            console.error("Video Search Error:", error);
            await sock.sendMessage(m.chat, { react: { text: "🚫", key: m.key } });
        }
    }
};
