const axios = require('axios');

module.exports = {
    command: "waifu",
    alias: ["anime", "husbando", "neko", "kitsune"],
    category: "anime",
    description: "VEX AI Anime - Random waifu, neko, husbando SFW images",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style?.value || userSettings?.style || 'normal';
        const type = args[0]?.toLowerCase() || 'waifu';

        const ui = {
            harsh: { react: "⚡", prefix: "⚡ 𝙑𝙀𝙓 𝘼𝙉𝙄𝙈𝙀:" },
            normal: { react: "🌸", prefix: "🌸 VEX ANIME:" },
            girl: { react: "💖", prefix: "💖 𝑽𝑬𝑿 𝑨𝑵𝑰𝑴𝑬:" }
        };

        const current = ui[style] || ui.normal;
        await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

        try {
            // =========================
            // SFW CATEGORIES ONLY
            // =========================
            const validTypes = {
                'waifu': 'waifu',
                'neko': 'neko',
                'shinobu': 'shinobu',
                'megumin': 'megumin',
                'bully': 'bully',
                'cuddle': 'cuddle',
                'cry': 'cry',
                'hug': 'hug',
                'awoo': 'awoo',
                'kiss': 'kiss',
                'lick': 'lick',
                'pat': 'pat',
                'smug': 'smug',
                'bonk': 'bonk',
                'yeet': 'yeet',
                'blush': 'blush',
                'smile': 'smile',
                'wave': 'wave',
                'highfive': 'highfive',
                'handhold': 'handhold',
                'nom': 'nom',
                'bite': 'bite',
                'glomp': 'glomp',
                'slap': 'slap',
                'kill': 'kill',
                'kick': 'kick',
                'happy': 'happy',
                'wink': 'wink',
                'poke': 'poke',
                'dance': 'dance',
                'cringe': 'cringe',
                'husbando': 'husbando',
                'kitsune': 'kitsune'
            };

            const selectedType = validTypes[type] || 'waifu';

            // =========================
            // FREE API - waifu.pics
            // =========================
            const res = await axios.get(`https://api.waifu.pics/sfw/${selectedType}`, { timeout: 5000 });

            if (!res.data.url) throw 'No image found';

            const caption = `${current.prefix} *${selectedType.toUpperCase()}*\n\nRequested by @${m.sender.split('@')[0]}`;

            await sock.sendMessage(m.chat, {
                image: { url: res.data.url },
                caption: caption,
                mentions: [m.sender]
            }, { quoted: m });

        } catch (err) {
            console.log("WAIFU ERROR:", err.message);

            // Fallback list
            const types = ['waifu', 'neko', 'shinobu', 'megumin', 'hug', 'kiss', 'pat', 'husbando', 'kitsune'];
            await sock.sendMessage(m.chat, {
                text: `${current.prefix} Failed to fetch. Try:\n\n${types.map(t => `➤.waifu ${t}`).join('\n')}`
            }, { quoted: m });
        }
    }
};
