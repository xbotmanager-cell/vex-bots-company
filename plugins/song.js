const yts = require('yt-search');
const ytdl = require('ytdl-core');
const translate = require('google-translate-api-x');

// Cache ya muda kuhifadhi data ya search kwa ajili ya Step 2
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
                downloading: "📥 𝕯𝖔𝖜𝖓𝖑𝖔𝖆𝖉𝖎𝖓𝖌... 𝖐𝖊𝖊𝖕 𝖞𝖔𝖚𝖗 𝖘𝖍𝖎𝖙 𝖙𝖔𝖌𝖊𝖙𝖍𝖊𝖗. ⚙️",
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
                selectType: "𝒽𝑜𝓌 𝓈𝒽𝑜𝓊𝓁𝚍 𝒾 𝓈𝑒𝓃𝒹 𝒾𝓉, 𝒷𝒶𝒷𝑒?\n1. 𝒜𝓊𝒹𝒾𝑜 (𝓂𝓅3) 🎶\n2. 𝒱𝒾𝒹𝑒𝑜 (𝓂𝓅4) 🎥\n\n_VEX SYSTEM SELECTION_",
                react: "💖",
                downloading: "📥 𝒹𝑜𝓌𝓃𝓁𝑜𝒶𝒹𝒾𝓃𝑔 𝒻𝑜𝓎 𝓎𝑜𝓊, 𝓂𝓎 𝓁𝑜𝓋𝑒𝓁𝓎 𝐿𝓊𝓅𝒾𝓃... ✨",
                err: "🌸 𝑜𝑜𝓅𝓈𝒾𝑒! 𝒾 𝒸𝒶𝓃't 𝒻𝒾𝓃𝒹 𝓉𝒽𝒶𝓉 𝓈𝑜𝓃𝑔~ 🍭"
            }
        };

        const current = modes[style] || modes.normal;

        // Logic ya Sikio: Kama mtumiaji amejibu list (Numeric Response)
        const quotedText = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage?.caption || "";
        if (quotedText.includes("VEX SYSTEM SELECTION") && !isNaN(args[0])) {
            const selection = parseInt(args[0]);
            const cached = searchCache.get(m.sender);
            
            if (!cached || (selection !== 1 && selection !== 2)) return;

            await sock.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });
            await m.reply(current.downloading);

            try {
                if (selection === 1) { // AUDIO DOWNLOAD
                    const stream = ytdl(cached.url, { filter: 'audioonly', quality: 'highestaudio' });
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    await sock.sendMessage(m.chat, { 
                        audio: buffer, 
                        mimetype: 'audio/mpeg',
                        fileName: `${cached.title}.mp3`
                    }, { quoted: m });
                } else { // VIDEO DOWNLOAD
                    const stream = ytdl(cached.url, { filter: 'itemrendered', quality: 'highestvideo' });
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    await sock.sendMessage(m.chat, { 
                        video: buffer, 
                        caption: `🎬 ${cached.title}`,
                        mimetype: 'video/mp4',
                        fileName: `${cached.title}.mp4`
                    }, { quoted: m });
                }
                return searchCache.delete(m.sender);
            } catch (err) {
                return m.reply(`🛑 Error: ${err.message}`);
            }
        }

        // Search Phase (Step 1)
        const query = args.join(" ");
        if (!query) return m.reply(current.err);

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            const search = await yts(query);
            const video = search.videos[0];

            if (!video) return m.reply(current.err);

            // Tunahifadhi data ya video kwenye cache
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
            console.error("Song Error:", error);
            await sock.sendMessage(m.chat, { react: { text: "🚫", key: m.key } });
        }
    }
};
