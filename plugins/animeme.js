const axios = require("axios");
const translate = require("google-translate-api-x");

const ENV = {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SAMBANOVA_API_KEY: process.env.SAMBANOVA_API_KEY,
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    CLOUDFLARE_API_KEY: process.env.CLOUDFLARE_API_KEY,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    TENOR_API_KEY: process.env.TENOR_API_KEY || '',
    GIPHY_API_KEY: process.env.GIPHY_API_KEY || '',
    BOT_NAME: process.env.BOT_NAME || 'VEX AI'
};

// =========================
// SAFE AXIOS
// =========================
const safeGet = async (url, config = {}) => {
    try {
        return await axios.get(url, {
            timeout: 12000,
            headers: {
                'User-Agent': 'Mozilla/5.0 VEX-AI'
            },
            ...config
        });
    } catch (e) {
        throw new Error(e?.response?.data?.message || e.message);
    }
};

const safePost = async (url, body = {}, config = {}) => {
    try {
        return await axios.post(url, body, {
            timeout: 12000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 VEX-AI',
                ...(config.headers || {})
            },
            ...config
        });
    } catch (e) {
        throw new Error(e?.response?.data?.message || e.message);
    }
};

// =========================
// MEME CACHE
// =========================
const memeCache = new Map();

// =========================
// SUPER MEME APIs
// =========================
const MEME_APIS = [

    // REDDIT
    {
        name: 'REDDIT_ANIMEMES',
        handler: async (query) => {
            const endpoint = query
                ? `https://www.reddit.com/r/Animemes/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=hot&limit=50`
                : `https://www.reddit.com/r/Animemes/hot.json?limit=50`;

            const { data } = await safeGet(endpoint);

            const posts = data?.data?.children
                ?.map(p => p.data)
                ?.filter(p =>
                    p?.url &&
                    /\.(jpg|jpeg|png|gif|webp)$/i.test(p.url) &&
                    !p.over_18
                );

            if (!posts?.length) throw new Error('No reddit memes');

            const meme = posts[Math.floor(Math.random() * posts.length)];

            return {
                url: meme.url,
                title: meme.title || 'Anime Meme',
                source: 'Reddit Animemes'
            };
        }
    },

    // MEME API
    {
        name: 'MEME_API',
        handler: async (query) => {
            const sub = query ? 'goodanimemes' : 'animemes';

            const { data } = await safeGet(`https://meme-api.com/gimme/${sub}/50`);

            const memes = data?.memes?.filter(m =>
                m?.url &&
                /\.(jpg|jpeg|png|gif|webp)$/i.test(m.url)
            );

            if (!memes?.length) throw new Error('No meme-api memes');

            const meme = memes[Math.floor(Math.random() * memes.length)];

            return {
                url: meme.url,
                title: meme.title || 'Anime Meme',
                source: 'MemeAPI'
            };
        }
    },

    // IMGFLIP
    {
        name: 'IMGFLIP',
        handler: async () => {
            const { data } = await safeGet('https://api.imgflip.com/get_memes');

            const memes = data?.data?.memes;

            if (!memes?.length) throw new Error('No ImgFlip memes');

            const anime = memes.filter(m =>
                /anime|naruto|jojo|dragon|one piece/i.test(m.name)
            );

            const meme = anime.length
                ? anime[Math.floor(Math.random() * anime.length)]
                : memes[Math.floor(Math.random() * memes.length)];

            return {
                url: meme.url,
                title: meme.name,
                source: 'ImgFlip'
            };
        }
    },

    // TENOR
    {
        name: 'TENOR',
        handler: async (query) => {

            if (!ENV.TENOR_API_KEY) {
                throw new Error('NO_TENOR_KEY');
            }

            const q = query || 'anime meme';

            const { data } = await safeGet(
                `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${ENV.TENOR_API_KEY}&limit=25`
            );

            const gifs = data?.results;

            if (!gifs?.length) throw new Error('No Tenor gif');

            const gif = gifs[Math.floor(Math.random() * gifs.length)];

            return {
                url: gif.media_formats?.gif?.url,
                title: gif.content_description || 'Anime GIF',
                source: 'Tenor'
            };
        }
    },

    // GIPHY
    {
        name: 'GIPHY',
        handler: async (query) => {

            if (!ENV.GIPHY_API_KEY) {
                throw new Error('NO_GIPHY_KEY');
            }

            const q = query || 'anime meme';

            const { data } = await safeGet(
                `https://api.giphy.com/v1/gifs/search?api_key=${ENV.GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=25`
            );

            const gifs = data?.data;

            if (!gifs?.length) throw new Error('No Giphy gif');

            const gif = gifs[Math.floor(Math.random() * gifs.length)];

            return {
                url: gif.images?.original?.url,
                title: gif.title || 'Anime GIF',
                source: 'Giphy'
            };
        }
    },

    // WAIFU PICS
    {
        name: 'WAIFU_PICS',
        handler: async () => {

            const { data } = await safeGet('https://api.waifu.pics/sfw/neko');

            if (!data?.url) throw new Error('No waifu image');

            return {
                url: data.url,
                title: 'Anime Waifu',
                source: 'WaifuPics'
            };
        }
    },

    // NEKOS
    {
        name: 'NEKOS',
        handler: async () => {

            const { data } = await safeGet('https://nekos.best/api/v2/hug');

            const item = data?.results?.[0];

            if (!item?.url) throw new Error('No nekos image');

            return {
                url: item.url,
                title: item.anime_name || 'Anime Scene',
                source: 'NekosBest'
            };
        }
    },

    // CATBOY
    {
        name: 'CATBOY',
        handler: async () => {

            const { data } = await safeGet('https://api.catboys.com/img');

            if (!data?.url) throw new Error('No catboy image');

            return {
                url: data.url,
                title: 'Anime Catboy',
                source: 'Catboys API'
            };
        }
    },

    // RANDOM ANIME
    {
        name: 'RANDOM_ANIME',
        handler: async () => {

            const { data } = await safeGet('https://api.jikan.moe/v4/random/anime');

            const anime = data?.data;

            if (!anime?.images?.jpg?.large_image_url) {
                throw new Error('No anime image');
            }

            return {
                url: anime.images.jpg.large_image_url,
                title: anime.title,
                source: 'Jikan Random'
            };
        }
    },

    // BACKUP
    {
        name: 'VEX_BACKUP',
        handler: async () => ({
            url: 'https://i.imgur.com/DPVM1.png',
            title: 'VEX Backup Meme',
            source: 'Backup'
        })
    }
];

// =========================
// AI COUNTER
// =========================
let aiCallCount = {};

// =========================
// MODULE
// =========================
module.exports = {
    command: "animememe",
    alias: ["ameme", "am", "animeme", "memes"],
    category: "anime",
    description: "VEX AI Anime Meme Engine",

    async execute(m, sock, { userSettings, lang, prefix, args }) {

        const chatId = m.chat;
        const userId = m.sender;

        const usedPrefix = prefix || '.';
        const style = userSettings?.style || 'normal';
        const targetLang = lang || 'en';

        const query = (args || []).join(" ").trim();

        const modes = {
            harsh: {
                title: "☣️ 𝕍𝔼𝕏 ℍ𝔸ℝ𝕊ℍ 𝕄𝔼𝕄𝔼 ☣️",
                react: "💀"
            },
            normal: {
                title: "⚡ VEX ANIME MEME ⚡",
                react: "😂"
            },
            girl: {
                title: "🫧 𝐕𝐄𝐗 𝐊𝐀𝐖𝐀𝐈 𝐌𝐄𝐌𝐄 🫧",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        try {

            await sock.sendMessage(chatId, {
                react: {
                    text: current.react,
                    key: m.key
                }
            });

            // =========================
            // CACHE HIT
            // =========================
            if (memeCache.has(query)) {

                const cached = memeCache.get(query);

                await sock.sendMessage(chatId, {
                    image: { url: cached.url },
                    caption: cached.caption,
                    mentions: [userId]
                }, { quoted: m });

                return;
            }

            let memeData = null;
            let source = 'UNKNOWN';
            let layer = 0;

            // =========================
            // LAYER 1-10 APIs
            // =========================
            for (let i = 0; i < MEME_APIS.length; i++) {

                const api = MEME_APIS[i];

                try {

                    const result = await api.handler(query);

                    if (!result?.url) continue;

                    // VERIFY IMAGE
                    await axios.head(result.url, {
                        timeout: 7000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0'
                        }
                    });

                    memeData = result;
                    source = api.name;
                    layer = i + 1;

                    break;

                } catch (err) {

                    console.log(`[${api.name}] FAILED =>`, err.message);

                    continue;
                }
            }

            // =========================
            // AI FALLBACK
            // =========================
            if (!memeData) {

                try {

                    const aiPrompt = `
Generate REAL anime meme JSON.

Topic: ${query || 'anime meme'}

Return ONLY JSON:
{
"url":"direct image url",
"title":"funny caption",
"source":"website"
}
`;

                    const aiResult = await callAI(aiPrompt, 250);

                    const cleaned = aiResult
                        .replace(/```json/gi, '')
                        .replace(/```/g, '')
                        .trim();

                    const parsed = JSON.parse(cleaned);

                    if (parsed?.url) {

                        memeData = parsed;
                        source = 'AI_GENERATED';
                        layer = 11;
                    }

                } catch (e) {
                    console.log("AI FALLBACK FAILED:", e.message);
                }
            }

            // =========================
            // EMERGENCY
            // =========================
            if (!memeData) {

                memeData = {
                    url: 'https://i.imgur.com/DPVM1.png',
                    title: 'Emergency Anime Meme',
                    source: 'EMERGENCY'
                };

                source = 'EMERGENCY';
                layer = 12;
            }

            // =========================
            // DOWNLOAD IMAGE
            // =========================
            const image = await axios.get(memeData.url, {
                responseType: 'arraybuffer',
                timeout: 20000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            // =========================
            // CAPTION
            // =========================
            let caption = `
*${current.title}*

😂 *Caption:* ${memeData.title || 'Anime Meme'}

🌐 *Source:* ${source}
⚙️ *Layer:* ${layer}/12

👤 *Requested By:* @${userId.split('@')[0]}

🤖 *Powered By:* ${ENV.BOT_NAME}
`.trim();

            // TRANSLATE
            try {

                if (targetLang !== 'en') {

                    const translated = await translate(caption, {
                        to: targetLang
                    });

                    caption = translated.text || caption;
                }

            } catch {}

            // =========================
            // SEND
            // =========================
            await sock.sendMessage(chatId, {
                image: Buffer.from(image.data),
                caption,
                mentions: [userId]
            }, { quoted: m });

            // CACHE SAVE
            memeCache.set(query, {
                url: memeData.url,
                caption
            });

            // CACHE CLEAN
            setTimeout(() => {
                memeCache.delete(query);
            }, 1000 * 60 * 15);

            // SUCCESS REACT
            await sock.sendMessage(chatId, {
                react: {
                    text: '✅',
                    key: m.key
                }
            });

        } catch (error) {

            console.error("ANIMEMEME ERROR:", error);

            try {

                await sock.sendMessage(chatId, {
                    text:
`⚠️ *VEX MEME ERROR*

Failed to fetch anime meme.

Try:
${usedPrefix}ameme naruto
${usedPrefix}ameme one piece
${usedPrefix}ameme waifu`
                }, { quoted: m });

            } catch {}
        }
    }
};

// =========================
// AI SYSTEM
// =========================
async function callAI(prompt, maxTokens = 300) {

    const models = [
        { name: 'GROQ', fn: callGroq },
        { name: 'GEMINI', fn: callGemini },
        { name: 'OPENROUTER', fn: callOpenRouter },
        { name: 'CEREBRAS', fn: callCerebras },
        { name: 'SAMBANOVA', fn: callSambaNova },
        { name: 'CLOUDFLARE', fn: callCloudflare }
    ];

    for (const model of models) {

        try {

            if ((aiCallCount[model.name] || 0) >= 500) {
                continue;
            }

            const result = await Promise.race([
                model.fn(prompt, maxTokens),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('TIMEOUT')), 15000)
                )
            ]);

            aiCallCount[model.name] =
                (aiCallCount[model.name] || 0) + 1;

            if (result && result.length > 10) {
                return result;
            }

        } catch (e) {

            console.log(`${model.name} FAILED =>`, e.message);

            continue;
        }
    }

    throw new Error('ALL_AI_FAILED');
}

// =========================
// GROQ
// =========================
async function callGroq(prompt, maxTokens) {

    if (!ENV.GROQ_API_KEY) {
        throw new Error('NO_GROQ_KEY');
    }

    const res = await safePost(
        'https://api.groq.com/openai/v1/chat/completions',
        {
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: maxTokens,
            temperature: 0.3
        },
        {
            headers: {
                Authorization: `Bearer ${ENV.GROQ_API_KEY}`
            }
        }
    );

    return res.data.choices?.[0]?.message?.content?.trim();
}

// =========================
// GEMINI
// =========================
async function callGemini(prompt, maxTokens) {

    if (!ENV.GEMINI_API_KEY) {
        throw new Error('NO_GEMINI_KEY');
    }

    const res = await safePost(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`,
        {
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ],
            generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: 0.3
            }
        }
    );

    return res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
}

// =========================
// OPENROUTER
// =========================
async function callOpenRouter(prompt, maxTokens) {

    if (!ENV.OPENROUTER_API_KEY) {
        throw new Error('NO_OPENROUTER_KEY');
    }

    const res = await safePost(
        'https://openrouter.ai/api/v1/chat/completions',
        {
            model: 'meta-llama/llama-3.1-8b-instruct:free',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: maxTokens
        },
        {
            headers: {
                Authorization: `Bearer ${ENV.OPENROUTER_API_KEY}`
            }
        }
    );

    return res.data.choices?.[0]?.message?.content?.trim();
}

// =========================
// CEREBRAS
// =========================
async function callCerebras(prompt, maxTokens) {

    if (!ENV.CEREBRAS_API_KEY) {
        throw new Error('NO_CEREBRAS_KEY');
    }

    const res = await safePost(
        'https://api.cerebras.ai/v1/chat/completions',
        {
            model: 'llama3.1-8b',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: maxTokens,
            temperature: 0.3
        },
        {
            headers: {
                Authorization: `Bearer ${ENV.CEREBRAS_API_KEY}`
            }
        }
    );

    return res.data.choices?.[0]?.message?.content?.trim();
}

// =========================
// SAMBANOVA
// =========================
async function callSambaNova(prompt, maxTokens) {

    if (!ENV.SAMBANOVA_API_KEY) {
        throw new Error('NO_SAMBANOVA_KEY');
    }

    const res = await safePost(
        'https://api.sambanova.ai/v1/chat/completions',
        {
            model: 'Meta-Llama-3.1-8B-Instruct',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: maxTokens
        },
        {
            headers: {
                Authorization: `Bearer ${ENV.SAMBANOVA_API_KEY}`
            }
        }
    );

    return res.data.choices?.[0]?.message?.content?.trim();
}

// =========================
// CLOUDFLARE
// =========================
async function callCloudflare(prompt, maxTokens) {

    if (!ENV.CLOUDFLARE_API_KEY || !ENV.CLOUDFLARE_ACCOUNT_ID) {
        throw new Error('NO_CF_KEY');
    }

    const res = await safePost(
        `https://api.cloudflare.com/client/v4/accounts/${ENV.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
        {
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: maxTokens
        },
        {
            headers: {
                Authorization: `Bearer ${ENV.CLOUDFLARE_API_KEY}`
            }
        }
    );

    return res.data?.result?.response?.trim();
}

// =========================
// RESET AI COUNTS DAILY
// =========================
setInterval(() => {
    aiCallCount = {};
}, 86400000);
