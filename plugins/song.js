const yts = require('yt-search');
const ytdl = require('ytdl-core');
const translate = require('google-translate-api-x');

// Tunatumia Map ya muda kuhifadhi searches ili sikio la index.js lipate data
const searchCache = new Map();

module.exports = {
    command: "song",
    alias: ["audio", "nyimbo", "play"],
    category: "download",
    description: "Search and download audio/video",

    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';
        const body = m.text;

        const modes = {
            harsh: {
                title: "🎧 𝕬𝖚𝖉𝖎𝖔 𝕰𝖝𝖊𝖈𝖚𝖙𝖎𝖔𝖓𝖊𝖗 🎧",
                selectType: "𝕹𝖔𝖜 𝖈𝖍𝖔𝖔𝖘𝖊 𝖙𝖍𝖊 𝖋𝖔𝖗𝖒𝖆𝖙:\n1. 𝕬𝖚𝖉𝖎𝖔 (𝖒𝖕3)\n2. 𝖁𝖎𝖉𝖊𝖔 (𝖒𝖕4)\n\n𝕳𝖚𝖗𝖗𝖞 𝖚𝖕! 🖕",
                react: "🦾",
                downloading: "📥 𝕯𝖔𝖜𝖓𝖑𝖔𝖆𝖉𝖎𝖓𝖌... 𝖐𝖊𝖊𝖕 𝖞𝖔𝖚𝖗 𝖘𝖍𝖎𝖙 𝖙𝖔𝖌𝖊𝖙𝖍𝖊𝖗. ⚙️",
                err: "💢 𝖂𝖍𝖆𝖙 𝖙𝖍𝖊 𝖋𝖚𝖈𝖐 𝖎𝖘 𝖙𝖍𝖎𝖘? 𝕾𝖊𝖓𝖉 𝖆 𝖗𝖊𝖆𝖑 𝖓𝖆𝖒𝖊. 🖕"
            },
            normal: {
                title: "🎵 Music Finder 🎵",
                selectType: "Select Format:\n1. Audio (MP3)\n2. Video (MP4)",
                react: "🎧",
                downloading: "📥 Downloading your file...",
                err: "❌ Video not found."
            },
            girl: {
                title: "🎼 𝐿𝓊𝓅𝒾𝓃'𝓈 𝑀𝑒𝓁𝑜𝒹𝓎 🎼",
                selectType: "𝒽𝑜𝓌 𝓈𝒽𝑜𝓊𝓁𝒹 𝒾 𝓈𝑒𝓃𝒹 𝒾𝓉, 𝒷𝒶𝒷𝑒?\n1. 𝒜𝓊𝒹𝒾𝑜 (𝓂𝓅3) 🎶\n2. 𝒱𝒾𝒹𝑒𝑜 (𝓂𝓅4) 🎥",
                react: "💖",
                downloading: "📥 𝒹𝑜𝓌𝓃𝓁𝑜𝒶𝒹𝒾𝓃𝑔 𝒻𝑜𝓇 𝓎𝑜𝓊, 𝓂𝓎 𝓁𝑜𝓋𝑒𝓁𝓎 𝐿𝓊𝓅𝒾𝓃... ✨",
                err: "🌸 𝑜𝑜𝓅𝓈𝒾𝑒! 𝒾 𝒸𝒶𝓃'𝓉 𝒻𝒾𝓃𝒹 𝓉𝒽𝒶𝓉 𝓈𝑜𝓃𝑔~ 🍭"
            }
        };

        const current = modes[style] || modes.normal;

        // Logic ya kukamata majibu ya namba kupitia "Sikio"
        const quotedText = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || 
                           m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage?.caption || "";

        // STEP 2: Mtumiaji ameshaulizwa MP3 au MP4
        if (quotedText.includes("1. Audio") || quotedText.includes("𝕬𝖚𝖉𝖎𝖔")) {
            const selection = parseInt(args[0]);
            const cached = searchCache.get(m.sender);
            if (!cached || (selection !== 1 && selection !== 2)) return;

            await sock.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });
            const videoUrl = cached.url;

            if (selection === 1) { // AUDIO
                await sock.sendMessage(m.chat, { 
                    audio: { url: videoUrl }, 
                    mimetype: 'audio/mpeg' 
                }, { quoted: m });
            } else { // VIDEO
                await sock.sendMessage(m.chat, { 
                    video: { url: videoUrl }, 
                    caption: `🎬 ${cached.title}`,
                    mimetype: 'video/mp4' 
                }, { quoted: m });
            }
            return searchCache.delete(m.sender);
        }

        // STEP 1: Search ya mwanzo
        try {
            const query = args.join(" ");
            if (!query) return m.reply(current.err);

            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            const search = await yts(query);
            const video = search.videos[0];
            if (!video) return m.reply(current.err);

            // Tunahifadhi matokeo kwenye cache kwa ajili ya Step 2
            searchCache.set(m.sender, { url: video.url, title: video.title });

            let menuText = `*${current.title}*\n\n`;
            menuText += `📌 **Found:** ${video.title}\n`;
            menuText += `⏳ **Length:** ${video.timestamp}\n\n`;
            menuText += `${current.selectType}`;

            await sock.sendMessage(m.chat, { 
                image: { url: video.thumbnail }, 
                caption: menuText 
            }, { quoted: m });

        } catch (error) {
            console.error("Master Lupin, kuna hitilafu:", error);
        }
    }
};
