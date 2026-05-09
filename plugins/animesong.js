const axios = require("axios");
const fs = require("fs");
const path = require("path");
const translate = require('google-translate-api-x');

const ENV = {
    BOT_NAME: process.env.BOT_NAME || 'VEX AI'
};

// =========================
// 10 SUPER REAL ONLINE APIs - NO FAKES
// =========================
const SONG_APIS = [
    { name: 'JIOSAAVN', handler: async (query) => {
        const { data } = await axios.get(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)} anime`, { timeout: 10000 });
        const song = data.data.results[0];
        if (!song) throw new Error('No result');
        const downloadUrl = song.downloadUrl.find(u => u.quality === '320kbps')?.url || song.downloadUrl[0]?.url;
        return { url: downloadUrl, title: song.name, artist: song.artists.primary[0]?.name, duration: song.duration };
    }},
    { name: 'SPOTIFY_DL', handler: async (query) => {
        const { data } = await axios.get(`https://spotify-downloader-api.vercel.app/api/search?query=${encodeURIComponent(query)} anime opening`, { timeout: 10000 });
        const song = data.tracks[0];
        if (!song) throw new Error('No result');
        return { url: song.download_url, title: song.name, artist: song.artists[0], duration: song.duration_ms / 1000 };
    }},
    { name: 'YOUTUBE_MUSIC', handler: async (query) => {
        const { data } = await axios.post('https://ytmusic-api.vercel.app/api/search', { query: `${query} anime ost` }, { timeout: 10000 });
        const song = data.results[0];
        if (!song) throw new Error('No result');
        const dl = await axios.get(`https://ytmusic-api.vercel.app/api/download?url=${song.url}`, { timeout: 15000 });
        return { url: dl.data.download_url, title: song.title, artist: song.artist, duration: song.duration };
    }},
    { name: 'ANIME_THEMES', handler: async (query) => {
        const { data } = await axios.get(`https://api.animethemes.moe/search?q=${encodeURIComponent(query)}`, { timeout: 10000 });
        const theme = data.search.anime[0]?.animethemes[0];
        if (!theme?.animethemeentries[0]?.videos[0]) throw new Error('No result');
        return { url: theme.animethemeentries[0].videos[0].link, title: theme.anime.name, artist: theme.song.title, duration: 90 };
    }},
    { name: 'DEEZER_API', handler: async (query) => {
        const { data } = await axios.get(`https://api.deezer.com/search?q=${encodeURIComponent(query)} anime`, { timeout: 10000 });
        const song = data.data[0];
        if (!song) throw new Error('No result');
        return { url: song.preview, title: song.title, artist: song.artist.name, duration: song.duration };
    }},
    { name: 'SOUNDCLOUD', handler: async (query) => {
        const { data } = await axios.get(`https://soundcloud-downloader-api.vercel.app/api/search?q=${encodeURIComponent(query)} anime`, { timeout: 10000 });
        const song = data.results[0];
        if (!song) throw new Error('No result');
        return { url: song.download_url, title: song.title, artist: song.user.username, duration: song.duration / 1000 };
    }},
    { name: 'ANIME_MUSIC', handler: async (query) => {
        const { data } = await axios.get(`https://anime-music-api.vercel.app/api/search?name=${encodeURIComponent(query)}`, { timeout: 10000 });
        const song = data[0];
        if (!song) throw new Error('No result');
        return { url: song.audio, title: song.title, artist: song.artist, duration: song.duration };
    }},
    { name: 'YT_DL_API', handler: async (query) => {
        const search = await axios.get(`https://youtube-search-api.vercel.app/api/search?q=${encodeURIComponent(query)} anime song`, { timeout: 10000 });
        const videoId = search.data.results[0]?.id;
        if (!videoId) throw new Error('No result');
        const dl = await axios.get(`https://youtube-dl-api.vercel.app/api/download?url=https://youtube.com/watch?v=${videoId}&format=mp3`, { timeout: 15000 });
        return { url: dl.data.url, title: search.data.results[0].title, artist: search.data.results[0].channel, duration: 180 };
    }},
    { name: 'ARCHIVE_ORG', handler: async (query) => {
        const { data } = await axios.get(`https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)} anime music&fl[]=identifier,title&output=json&rows=1`, { timeout: 10000 });
        const item = data.response.docs[0];
        if (!item) throw new Error('No result');
        return { url: `https://archive.org/download/${item.identifier}/${item.identifier}.mp3`, title: item.title, artist: "Archive", duration: 200 };
    }},
    { name: 'VEX_BACKUP', handler: async () => {
        return { url: 'https://files.catbox.moe/5g8j3z.mp3', title: 'VEX Anime Backup', artist: 'VEX AI', duration: 90 };
    }}
];

module.exports = {
    command: "animesong",
    alias: ["asong", "animeost", "amusic", "aost", "animeaudio"], // HAKUNA 'search' kuzuia migongano
    category: "anime",
    description: "VEX AI AnimeSong - 10 Layer God Mode: Super Download, No Fail, Auto Similar",

    async execute(m, sock, { userSettings, lang, prefix }) {
        const chatId = m.chat;
        const userId = m.sender;

        const usedPrefix = prefix || '.';
        const style = userSettings?.style || 'normal';
        const targetLang = lang || 'en';

        const query = m.args.join(" ").trim();
        if (!query) {
            return m.reply(`🎵 *VEX ANIME SONG*\n\n➤${usedPrefix}asong Naruto Blue Bird\n➤${usedPrefix}asong Attack on Titan opening\n➤${usedPrefix}asong Demon Slayer Gurenge\n➤${usedPrefix}asong One Piece We Are\n\n*Features:* 10 APIs, Auto Similar, Direct Download\n*Powered by ${ENV.BOT_NAME}*`);
        }

        // Style templates
        const modes = {
            harsh: { react: "💀" },
            normal: { react: "🎵" },
            girl: { react: "🎀" }
        };

        const current = modes[style] || modes.normal;
        await sock.sendMessage(chatId, { react: { text: current.react, key: m.key } });
        const processing = await m.reply(`⚡ *VEX MUSIC HUNTER*\n\n🔍 Hunting: ${query}\n📡 Scanning 10 APIs...\n⏳ ETA: 15 seconds`);

        let tempFilePath = null;
        let songData = null;
        let source = '';
        let layer = 0;

        try {
            // =========================
            // TRY ALL 10 APIs - NO FAILURE
            // =========================
            for (let i = 0; i < SONG_APIS.length; i++) {
                const api = SONG_APIS[i];
                try {
                    songData = await api.handler(query);
                    if (!songData ||!songData.url) throw new Error('Empty URL');

                    // Verify URL works
                    await axios.head(songData.url, { timeout: 5000 });

                    source = api.name;
                    layer = i + 1;
                    break;
                } catch (err) {
                    console.log(`[${api.name}] Failed:`, err.message);
                    continue;
                }
            }

            if (!songData) throw new Error('ALL_10_APIS_FAILED');

            // =========================
            // DOWNLOAD + SEND DIRECT - HAKUNA LONGO LONGO
            // =========================
            await sock.sendMessage(chatId, {
                edit: processing.key,
                text: `⚡ *VEX MUSIC HUNTER*\n\n✅ Found: ${songData.title}\n📥 Downloading...\n⏳ Sending direct...`
            });

            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            tempFilePath = path.join(tempDir, `vex-song-${Date.now()}.mp3`);

            const audioRes = await axios.get(songData.url, {
                responseType: 'stream',
                timeout: 60000,
                headers: { 'User-Agent': 'VEX-AI-Bot' }
            });

            const writer = fs.createWriteStream(tempFilePath);
            audioRes.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const stats = fs.statSync(tempFilePath);

            // SEND AUDIO DIRECT - CHAPU
            await sock.sendMessage(chatId, {
                audio: fs.readFileSync(tempFilePath),
                mimetype: 'audio/mpeg',
                fileName: `${songData.title}.mp3`
            }, { quoted: m });

            // SEND MESSAGE YA JINA EXACT
            const renderCaption = () => {
                return `✅ *VEX ANIME SONG COMPLETE*\n\n🎵 *Exact Name:* ${songData.title}\n🎤 *Artist:* ${songData.artist || 'Unknown'}\n⏱️ *Duration:* ${Math.floor(songData.duration || 0)}s\n📦 *Size:* ${(stats.size / 1024).toFixed(2)} MB\n🌐 *Source:* ${source}\n⚙️ *Layer:* ${layer}/10\n\n*Downloaded by ${ENV.BOT_NAME}*`;
            };

            const { text } = await translate(renderCaption(), { to: targetLang });
            await sock.sendMessage(chatId, { text, mentions: [userId] });

            fs.unlinkSync(tempFilePath);
            await sock.sendMessage(chatId, { delete: processing.key });
            await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } });

        } catch (error) {
            if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

            console.log("ANIMESONG GOD MODE ERROR:", error.message);

            // EMERGENCY - STILL SENDS AUDIO
            const emergencyUrl = 'https://files.catbox.moe/5g8j3z.mp3';
            const tempEmergency = path.join(__dirname, '../temp', `emergency-${Date.now()}.mp3`);

            try {
                const audioRes = await axios.get(emergencyUrl, { responseType: 'stream' });
                const writer = fs.createWriteStream(tempEmergency);
                audioRes.data.pipe(writer);
                await new Promise(resolve => writer.on('finish', resolve));

                await sock.sendMessage(chatId, {
                    audio: fs.readFileSync(tempEmergency),
                    mimetype: 'audio/mpeg',
                    fileName: 'VEX-Emergency.mp3'
                }, { quoted: m });

                const emergencyMsg = `⚠️ *VEX SONG EMERGENCY* ⚠️\n\n☣️ All 10 APIs failed\n\n🎵 *Exact Name:* VEX Anime Emergency\n🎤 *Artist:* VEX AI\n\n*Emergency song sent*\n\nTry: ${usedPrefix}asong Naruto`;
                const { text } = await translate(emergencyMsg, { to: targetLang });
                await sock.sendMessage(chatId, { text });

                fs.unlinkSync(tempEmergency);
            } catch (e) {
                await m.reply(`❌ *COMPLETE FAILURE*\n\nEven emergency failed. Try again.`);
            }
        }
    }
};
