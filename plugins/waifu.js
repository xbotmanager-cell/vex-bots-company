const axios = require('axios');
const translate = require('google-translate-api-x');

// 5 REAL FALLBACK APIs - God Mode
const WAIFU_APIS = [
    { name: 'waifu.pics', handler: async (type) => {
        const { data } = await axios.get(`https://api.waifu.pics/sfw/${type}`, { timeout: 8000 });
        return data.url;
    }},
    { name: 'waifu.im', handler: async (type) => {
        const { data } = await axios.get(`https://api.waifu.im/search?included_tags=${type}`, { timeout: 8000 });
        return data.images[0]?.url;
    }},
    { name: 'nekos.best', handler: async (type) => {
        const { data } = await axios.get(`https://nekos.best/api/v2/${type}`, { timeout: 8000 });
        return data.results[0]?.url;
    }},
    { name: 'pic.re', handler: async (type) => {
        return `https://pic.re/image?category=${type}`;
    }},
    { name: 'VEX_LOCAL', handler: async () => {
        return 'https://i.ibb.co/4Z7Sf3q5/Chat-GPT-Image-May-8-2026-07-10-41-PM.png'; // Never fails
    }}
];

// Style-based types
const STYLE_TYPES = {
    harsh: ['bully', 'kick', 'slap', 'punch', 'kill'],
    normal: ['waifu', 'smile', 'happy', 'wink', 'dance'],
    girl: ['neko', 'shinobu', 'megumin', 'maid', 'cuddle']
};

const ALL_TYPES = [...STYLE_TYPES.harsh,...STYLE_TYPES.normal,...STYLE_TYPES.girl, 'hug', 'kiss', 'cry'];

module.exports = {
    command: "waifu",
    alias: ["animepic", "girl", "aw"],
    category: "anime",
    description: "VEX AI Waifu - God Mode with 5 API fallback and 3 styles",

    async execute(m, sock, { userSettings, lang, prefix }) {
        const chatId = m.chat;
        const userId = m.sender;

        // Reads prefix from router.js - same as blackjack
        const usedPrefix = prefix || '.';
        const style = userSettings?.style || 'normal';
        const targetLang = lang || 'en';

        let type = m.args[0]?.toLowerCase();

        // Style detection:.waifu harsh OR.waifu girl
        if (type === 'harsh' || type === 'normal' || type === 'girl') {
            const selectedStyle = type;
            type = m.args[1]?.toLowerCase();
            if (!type ||!ALL_TYPES.includes(type)) {
                type = STYLE_TYPES[selectedStyle][Math.floor(Math.random() * STYLE_TYPES[selectedStyle].length)];
            }
        } else if (!type ||!ALL_TYPES.includes(type)) {
            // Auto pick from current style
            type = STYLE_TYPES[style][Math.floor(Math.random() * STYLE_TYPES[style].length)];
        }

        // Style templates - same structure as blackjack
        const modes = {
            harsh: {
                title: "☣️ 𝕍𝔼𝕏 ℍ𝔸ℝ𝕊ℍ 𝕎𝔸𝕀𝔽𝕌 ☣️",
                line: "━",
                quest: "💀 𝕋𝕙𝕖 𝕒𝕟𝕘𝕣𝕪 𝕘𝕚𝕣𝕝 𝕒𝕡𝕖𝕒𝕣𝕤:",
                hint: `⚙️ 𝕌𝕤𝕖 '${usedPrefix}𝕨𝕒𝕚𝕗𝕦 𝕙𝕒𝕣𝕤𝕙' 𝕗𝕠𝕣 𝕞𝕠𝕣𝕖`,
                react: "💀"
            },
            normal: {
                title: "✨ VEX WAIFU ✨",
                line: "─",
                quest: "🎭 Your anime companion:",
                hint: `📝 Try '${usedPrefix}waifu girl' or '${usedPrefix}waifu harsh'`,
                react: "✨"
            },
            girl: {
                title: "🫧 𝐕𝐄𝐗 𝐊𝐀𝐖𝐀𝐈 𝐆𝐈𝐑𝐋 🫧",
                line: "┄",
                quest: "🌸 𝓎𝑜𝓊𝓇 𝓀𝒶𝓌𝒶𝒾 𝓌𝒶𝒾𝒻𝓊:",
                hint: `🫧 𝓊𝓈𝑒 '${usedPrefix}𝓌𝒶𝒾𝒻𝓊 𝓰𝒾𝓇𝓁' 𝒻𝑜𝓇 𝒸𝓊𝓉𝑒`,
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(chatId, { react: { text: current.react, key: m.key } });

            let imageUrl = '';
            let usedApi = '';

            // GOD MODE: Try 5 APIs in sequence - Never Fails
            for (let i = 0; i < WAIFU_APIS.length; i++) {
                const api = WAIFU_APIS[i];
                try {
                    imageUrl = await api.handler(type);
                    if (!imageUrl) throw new Error('Empty URL');
                    usedApi = api.name;
                    break; // Success - exit loop
                } catch (err) {
                    console.log(`[${api.name}] Failed:`, err.message);
                    if (i === WAIFU_APIS.length - 1) throw new Error('ALL_APIS_DOWN');
                    continue; // Try next API
                }
            }

            // Download as buffer - prevents URL errors
            const imageBuffer = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 15000,
                headers: { 'User-Agent': 'VEX-AI-Bot' }
            });

            const renderCaption = () => {
                return `*${current.title}*\n${current.line.repeat(15)}\n${current.quest}\n\n🎭 Type: ${type.toUpperCase()}\n🌐 Source: ${usedApi}\n⚡ Style: ${style.toUpperCase()}\n\n${current.line.repeat(15)}\n_${current.hint}_`;
            };

            const { text } = await translate(renderCaption(), { to: targetLang });

            await sock.sendMessage(chatId, {
                image: Buffer.from(imageBuffer.data),
                caption: text,
                mentions: [userId]
            }, { quoted: m });

            await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } });

        } catch (error) {
            console.error("WAIFU GOD MODE ERROR:", error);

            // Even God Mode fails - send emergency text
            const emergencyMsg = `⚠️ *VEX WAIFU EMERGENCY* ⚠️\n\n☣️ All 5 APIs down\n🎭 Type: ${type.toUpperCase()}\n⚡ Style: ${style.toUpperCase()}\n\n*BACKUP MODE ACTIVATED*\nImage servers offline. VEX AI protecting you.\n\nTry again: ${usedPrefix}waifu ${style}`;

            const { text } = await translate(emergencyMsg, { to: targetLang });
            await sock.sendMessage(chatId, { text });
            await sock.sendMessage(chatId, { react: { text: '⚠️', key: m.key } });
        }
    }
};
