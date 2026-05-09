const axios = require("axios");
const translate = require('google-translate-api-x');

const ENV = {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SAMBANOVA_API_KEY: process.env.SAMBANOVA_API_KEY,
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    CLOUDFLARE_API_KEY: process.env.CLOUDFLARE_API_KEY,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    BOT_NAME: process.env.BOT_NAME || 'VEX AI'
};

// =========================
// 1. LOCAL DATABASE - INSTANT
// =========================
const LOCAL_ANIME = [
    { title: "Naruto", year: 2002, eps: 220, genre: ["Action", "Adventure", "Ninja"], rating: 8.3, synopsis: "Young ninja seeks recognition and dreams of becoming Hokage.", studio: "Pierrot" },
    { title: "One Piece", year: 1999, eps: 1000, genre: ["Action", "Adventure", "Pirate"], rating: 9.0, synopsis: "Pirate crew searches for legendary treasure One Piece.", studio: "Toei" },
    { title: "Attack on Titan", year: 2013, eps: 87, genre: ["Action", "Dark Fantasy", "Military"], rating: 9.1, synopsis: "Humanity fights against man-eating Titans behind walls.", studio: "Wit Studio" },
    { title: "Demon Slayer", year: 2019, eps: 44, genre: ["Action", "Supernatural", "Historical"], rating: 8.7, synopsis: "Boy becomes demon slayer to save sister turned demon.", studio: "Ufotable" },
    { title: "Jujutsu Kaisen", year: 2020, eps: 47, genre: ["Action", "Supernatural", "School"], rating: 8.6, synopsis: "Student joins sorcerers to fight curses.", studio: "MAPPA" },
    { title: "Death Note", year: 2006, eps: 37, genre: ["Psychological", "Thriller", "Supernatural"], rating: 9.0, synopsis: "Student finds notebook that kills anyone whose name is written.", studio: "Madhouse" },
    { title: "Dragon Ball Z", year: 1989, eps: 291, genre: ["Action", "Martial Arts", "Sci-Fi"], rating: 8.8, synopsis: "Saiyan warrior protects Earth from powerful enemies.", studio: "Toei" },
    { title: "My Hero Academia", year: 2016, eps: 138, genre: ["Action", "Superhero", "School"], rating: 8.4, synopsis: "Boy born without powers in superhero world.", studio: "Bones" },
    { title: "Spy x Family", year: 2022, eps: 37, genre: ["Action", "Comedy", "Family"], rating: 8.5, synopsis: "Spy creates fake family for mission.", studio: "Wit Studio" },
    { title: "Chainsaw Man", year: 2022, eps: 12, genre: ["Action", "Dark Fantasy", "Gore"], rating: 8.7, synopsis: "Devil hunter merges with chainsaw devil.", studio: "MAPPA" }
];

// =========================
// 2. LOCAL API FALLBACKS - 5 APIs
// =========================
const ANIME_APIS = [
    { name: 'JIKAN', handler: async (query) => {
        const { data } = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`, { timeout: 8000 });
        const a = data.data[0];
        if (!a) throw new Error('Not found');
        return {
            title: a.title,
            year: a.year,
            eps: a.episodes,
            genre: a.genres.map(g => g.name),
            rating: a.score,
            synopsis: a.synopsis?.slice(0, 400),
            studio: a.studios[0]?.name,
            image: a.images.jpg.image_url
        };
    }},
    { name: 'ANILIST', handler: async (query) => {
        const res = await axios.post('https://graphql.anilist.co', {
            query: `query ($search: String) { Media (search: $search, type: ANIME) { title { romaji } startDate { year } episodes genres averageScore description studios { nodes { name } } coverImage { large } } }`,
            variables: { search: query }
        }, { timeout: 8000 });
        const a = res.data.data.Media;
        if (!a) throw new Error('Not found');
        return {
            title: a.title.romaji,
            year: a.startDate.year,
            eps: a.episodes,
            genre: a.genres,
            rating: a.averageScore / 10,
            synopsis: a.description?.replace(/<[^>]*>/g, '').slice(0, 400),
            studio: a.studios.nodes[0]?.name,
            image: a.coverImage.large
        };
    }},
    { name: 'KITSU', handler: async (query) => {
        const { data } = await axios.get(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=1`, { timeout: 8000 });
        const a = data.data[0]?.attributes;
        if (!a) throw new Error('Not found');
        return {
            title: a.canonicalTitle,
            year: a.startDate?.split('-')[0],
            eps: a.episodeCount,
            genre: [],
            rating: a.averageRating / 10,
            synopsis: a.synopsis?.slice(0, 400),
            studio: "Kitsu",
            image: a.posterImage?.large
        };
    }},
    { name: 'ANIME_FACT', handler: async (query) => {
        const { data } = await axios.get(`https://anime-facts-rest-api.herokuapp.com/api/v1/${query.toLowerCase().replace(/\s/g, '_')}`, { timeout: 8000 });
        if (!data.success) throw new Error('Not found');
        return {
            title: data.data.anime_name,
            year: 2020,
            eps: 0,
            genre: ["Fact"],
            rating: 0,
            synopsis: data.data.facts?.join(' '),
            studio: "API",
            image: null
        };
    }},
    { name: 'ANIME_DB', handler: async (query) => {
        const { data } = await axios.get(`https://api.anime-db.net/v1/anime?search=${encodeURIComponent(query)}&limit=1`, { timeout: 8000 });
        const a = data.data[0];
        if (!a) throw new Error('Not found');
        return {
            title: a.title,
            year: a.year,
            eps: a.episodes,
            genre: a.genres,
            rating: a.rating,
            synopsis: a.description?.slice(0, 400),
            studio: a.studios[0],
            image: a.image
        };
    }}
];

let aiCallCount = {};

module.exports = {
    command: "animesearch",
    alias: ["anisearch", "aninfo", "as", "findanime"], // HAKUNA 'search' ili kuzuia migongano
    category: "anime",
    description: "VEX AI AnimeSearch - 11 Layer God Mode: Local DB + 5 APIs + 6 AI Fallbacks",

    async execute(m, sock, { userSettings, lang, prefix }) {
        const chatId = m.chat;
        const userId = m.sender;

        const usedPrefix = prefix || '.';
        const style = userSettings?.style || 'normal';
        const targetLang = lang || 'en';

        const query = m.args.join(" ").trim();
        if (!query) {
            return m.reply(`🔍 *VEX ANIME SEARCH*\n\n➤${usedPrefix}animesearch Naruto\n➤${usedPrefix}animesearch One Piece ai\n➤${usedPrefix}animesearch genre:action\n➤${usedPrefix}animesearch year:2020\n\n*Features:* Local DB, 5 APIs, 6 AI, Image, Genre, Year\n*Powered by ${ENV.BOT_NAME}*`);
        }

        const wantAI = m.args.includes('ai');
        const genreFilter = query.match(/genre:(\w+)/i)?.[1];
        const yearFilter = query.match(/year:(\d{4})/i)?.[1];
        const searchTerm = query.replace(/ai|genre:\w+|year:\d{4}/gi, '').trim();

        // Style templates
        const modes = {
            harsh: {
                title: "☣️ 𝕍𝔼𝕏 ℍ𝔸ℝ𝕊ℍ 𝕊𝔼𝔸ℝℂℍ ☣️",
                line: "━",
                react: "💀"
            },
            normal: {
                title: "⚡ VEX ANIME SEARCH ⚡",
                line: "─",
                react: "🔍"
            },
            girl: {
                title: "🫧 𝐕𝐄𝐗 𝐊𝐀𝐖𝐀𝐈 𝐒𝐄𝐀𝐑𝐂𝐇 🫧",
                line: "┄",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;
        await sock.sendMessage(chatId, { react: { text: current.react, key: m.key } });

        try {
            let animeData = null;
            let source = '';
            let layer = 0;

            // =========================
            // LAYER 1: LOCAL DATABASE FIRST
            // =========================
            if (!wantAI) {
                let filtered = LOCAL_ANIME;
                if (searchTerm) {
                    filtered = LOCAL_ANIME.filter(a =>
                        a.title.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                }
                if (genreFilter) {
                    filtered = filtered.filter(a =>
                        a.genre.some(g => g.toLowerCase().includes(genreFilter.toLowerCase()))
                    );
                }
                if (yearFilter) {
                    filtered = filtered.filter(a => a.year == yearFilter);
                }
                if (filtered.length > 0) {
                    animeData = filtered[0];
                    source = 'LOCAL_DB';
                    layer = 1;
                }
            }

            // =========================
            // LAYER 2-6: 5 LOCAL APIs
            // =========================
            if (!animeData) {
                for (let i = 0; i < ANIME_APIS.length; i++) {
                    const api = ANIME_APIS[i];
                    try {
                        animeData = await api.handler(searchTerm || query);
                        if (animeData && animeData.title) {
                            source = api.name;
                            layer = i + 2;
                            break;
                        }
                    } catch (err) {
                        console.log(`[${api.name}] Failed:`, err.message);
                        continue;
                    }
                }
            }

            // =========================
            // LAYER 7-12: 6 AI FALLBACKS
            // =========================
            if (!animeData) {
                const aiPrompt = `Provide anime info for "${searchTerm || query}". Return JSON: {"title":"name","year":2000,"eps":24,"genre":["Action"],"rating":8.5,"synopsis":"plot","studio":"name"}`;

                try {
                    const aiResult = await callAI(aiPrompt, 400);
                    const parsed = JSON.parse(aiResult.replace(/```json|```/g, '').trim());
                    if (parsed.title) {
                        animeData = parsed;
                        source = 'VEX_AI_RENDER';
                        layer = 7;
                    }
                } catch (aiErr) {
                    console.log("ALL AI FAILED:", aiErr.message);
                }
            }

            // =========================
            // LAYER 13: EMERGENCY FALLBACK
            // =========================
            if (!animeData) {
                animeData = LOCAL_ANIME[0];
                source = 'EMERGENCY_CACHE';
                layer = 13;
            }

            const renderCaption = () => {
                return `*${current.title}*\n${current.line.repeat(20)}\n\n📺 *Title:* ${animeData.title}\n📅 *Year:* ${animeData.year || 'Unknown'}\n📊 *Episodes:* ${animeData.eps || 'Unknown'}\n⭐ *Rating:* ${animeData.rating || 'N/A'}/10\n🎭 *Genre:* ${animeData.genre?.join(', ') || 'Unknown'}\n🎬 *Studio:* ${animeData.studio || 'Unknown'}\n\n📝 *Synopsis:*\n${animeData.synopsis || 'No description'}\n\n🌐 *Source:* ${source}\n⚙️ *Layer:* ${layer}/13\n\n${current.line.repeat(20)}\n_Use '${usedPrefix}as ${animeData.title} ai' for AI details_`;
            };

            const { text } = await translate(renderCaption(), { to: targetLang });

            if (animeData.image) {
                await sock.sendMessage(chatId, {
                    image: { url: animeData.image },
                    caption: text,
                    mentions: [userId]
                }, { quoted: m });
            } else {
                await sock.sendMessage(chatId, { text, mentions: [userId] }, { quoted: m });
            }

            await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } });

        } catch (error) {
            console.error("ANIMESEARCH GOD MODE ERROR:", error);
            const emergencyMsg = `⚠️ *VEX SEARCH EMERGENCY* ⚠️\n\n☣️ All 13 layers failed\n\nQuery: ${query}\n\nTry again: ${usedPrefix}as Naruto`;
            const { text } = await translate(emergencyMsg, { to: targetLang });
            await sock.sendMessage(chatId, { text });
        }
    }
};

// =========================
// AI FALLBACK - 6 MODELS
// =========================
async function callAI(prompt, maxTokens = 400) {
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
            if (aiCallCount[model.name] >= 500) continue;
            const result = await Promise.race([
                model.fn(prompt, maxTokens),
                new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 8000))
            ]);
            aiCallCount[model.name] = (aiCallCount[model.name] || 0) + 1;
            if (result && result.length > 20) return result;
        } catch {
            continue;
        }
    }
    throw new Error('AI_GENERATION_FAILED');
}

async function callGroq(prompt, maxTokens) {
    if (!ENV.GROQ_API_KEY) throw new Error('NO_KEY');
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
    }, { headers: { 'Authorization': `Bearer ${ENV.GROQ_API_KEY}` }, timeout: 12000 });
    return res.data.choices[0].message.content.trim();
}

async function callGemini(prompt, maxTokens) {
    if (!ENV.GEMINI_API_KEY) throw new Error('NO_KEY');
    const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 }
    }, { timeout: 12000 });
    return res.data.candidates[0].content.parts[0].text.trim();
}

async function callOpenRouter(prompt, maxTokens) {
    if (!ENV.OPENROUTER_API_KEY) throw new Error('NO_KEY');
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
    }, { headers: { 'Authorization': `Bearer ${ENV.OPENROUTER_API_KEY}` }, timeout: 12000 });
    return res.data.choices[0].message.content.trim();
}

async function callCerebras(prompt, maxTokens) {
    if (!ENV.CEREBRAS_API_KEY) throw new Error('NO_KEY');
    const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
        model: 'llama3.1-8b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
    }, { headers: { 'Authorization': `Bearer ${ENV.CEREBRAS_API_KEY}` }, timeout: 12000 });
    return res.data.choices[0].message.content.trim();
}

async function callSambaNova(prompt, maxTokens) {
    if (!ENV.SAMBANOVA_API_KEY) throw new Error('NO_KEY');
    const res = await axios.post('https://api.sambanova.ai/v1/chat/completions', {
        model: 'Meta-Llama-3.1-8B-Instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
    }, { headers: { 'Authorization': `Bearer ${ENV.SAMBANOVA_API_KEY}` }, timeout: 12000 });
    return res.data.choices[0].message.content.trim();
}

async function callCloudflare(prompt, maxTokens) {
    if (!ENV.CLOUDFLARE_API_KEY ||!ENV.CLOUDFLARE_ACCOUNT_ID) throw new Error('NO_KEY');
    const res = await axios.post(`https://api.cloudflare.com/client/v4/accounts/${ENV.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
    }, { headers: { 'Authorization': `Bearer ${ENV.CLOUDFLARE_API_KEY}` }, timeout: 12000 });
    return res.data.result.response.trim();
}

setInterval(() => { aiCallCount = {}; }, 86400000);
