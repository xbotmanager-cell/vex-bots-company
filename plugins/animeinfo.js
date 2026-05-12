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
    BOT_NAME: process.env.BOT_NAME || 'VEX AI'
};

// =========================
// SAFE AXIOS INSTANCE
// =========================
const api = axios.create({
    timeout: 15000,
    headers: {
        "User-Agent": "VEX-AI-ANIME-SEARCH"
    }
});

// =========================
// LOCAL CACHE
// =========================
const responseCache = new Map();

// =========================
// LOCAL DATABASE - INSTANT
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
// API FALLBACKS
// =========================
const ANIME_APIS = [

    // =========================
    // JIKAN
    // =========================
    {
        name: 'JIKAN',
        handler: async (query) => {

            const { data } = await api.get(
                `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`
            );

            const a = data?.data?.[0];

            if (!a) throw new Error('NOT_FOUND');

            return {
                title: a.title,
                year: a.year || a.aired?.from?.split("-")[0],
                eps: a.episodes,
                genre: a.genres?.map(g => g.name) || [],
                rating: a.score,
                synopsis: a.synopsis?.slice(0, 500),
                studio: a.studios?.[0]?.name || "Unknown",
                image: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url,
                sourceUrl: a.url
            };
        }
    },

    // =========================
    // ANILIST
    // =========================
    {
        name: 'ANILIST',
        handler: async (query) => {

            const res = await api.post(
                'https://graphql.anilist.co',
                {
                    query: `
                    query ($search: String) {
                      Media(search: $search, type: ANIME) {
                        title { romaji english }
                        startDate { year }
                        episodes
                        genres
                        averageScore
                        description
                        status
                        studios {
                          nodes { name }
                        }
                        coverImage {
                          large
                        }
                      }
                    }`,
                    variables: { search: query }
                }
            );

            const a = res.data?.data?.Media;

            if (!a) throw new Error("NOT_FOUND");

            return {
                title: a.title.english || a.title.romaji,
                year: a.startDate?.year,
                eps: a.episodes,
                genre: a.genres || [],
                rating: a.averageScore ? (a.averageScore / 10).toFixed(1) : "N/A",
                synopsis: a.description?.replace(/<[^>]*>/g, '').slice(0, 500),
                studio: a.studios?.nodes?.[0]?.name || "Unknown",
                image: a.coverImage?.large,
                status: a.status
            };
        }
    },

    // =========================
    // KITSU
    // =========================
    {
        name: 'KITSU',
        handler: async (query) => {

            const { data } = await api.get(
                `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=1`
            );

            const a = data?.data?.[0]?.attributes;

            if (!a) throw new Error("NOT_FOUND");

            return {
                title: a.canonicalTitle,
                year: a.startDate?.split("-")[0],
                eps: a.episodeCount,
                genre: [],
                rating: a.averageRating ? (a.averageRating / 10).toFixed(1) : "N/A",
                synopsis: a.synopsis?.slice(0, 500),
                studio: "Kitsu",
                image: a.posterImage?.large,
                status: a.status
            };
        }
    },

    // =========================
    // CONSUMET API
    // =========================
    {
        name: 'CONSUMET',
        handler: async (query) => {

            const { data } = await api.get(
                `https://api.consumet.org/anime/gogoanime/${encodeURIComponent(query)}`
            );

            const a = data?.results?.[0];

            if (!a) throw new Error("NOT_FOUND");

            return {
                title: a.title,
                year: "Unknown",
                eps: a.totalEpisodes || "Unknown",
                genre: a.genres || [],
                rating: "N/A",
                synopsis: a.releaseDate || "No synopsis",
                studio: "Unknown",
                image: a.image
            };
        }
    }
];

// =========================
// AI LIMITER
// =========================
let aiCallCount = {};

// =========================
// MODULE EXPORT
// =========================
module.exports = {

    command: "animesearch",

    alias: [
        "anisearch",
        "aninfo",
        "as",
        "findanime",
        "animefind",
        "animeinfo"
    ],

    category: "anime",

    description:
        "VEX AI AnimeSearch - GOD MODE SEARCH ENGINE",

    async execute(m, sock, { userSettings, lang, prefix }) {

        try {

            const chatId = m.chat;
            const userId = m.sender;

            const usedPrefix = prefix || '.';
            const style = userSettings?.style || 'normal';
            const targetLang = lang || 'en';

            // =========================
            // SAFE ARGS FIX
            // =========================
            const args = Array.isArray(m.args)
                ? m.args
                : [];

            const query = args.join(" ").trim();

            // =========================
            // EMPTY QUERY
            // =========================
            if (!query) {

                return await sock.sendMessage(chatId, {
                    text:
`🔍 *VEX ANIME SEARCH*

➤ ${usedPrefix}animesearch Naruto
➤ ${usedPrefix}as One Piece
➤ ${usedPrefix}as Bleach ai
➤ ${usedPrefix}as genre:action
➤ ${usedPrefix}as year:2020
➤ ${usedPrefix}as random
➤ ${usedPrefix}as top

🔥 Features:
• Local Database
• Multi API Fallback
• AI Fallback
• Smart Cache
• Genre Filter
• Year Filter
• Random Search
• Top Anime
• Auto Translation
• Smart Recovery

⚡ Powered by ${ENV.BOT_NAME}`
                }, { quoted: m });
            }

            // =========================
            // STYLE MODES
            // =========================
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

            // =========================
            // REACT
            // =========================
            await sock.sendMessage(chatId, {
                react: {
                    text: current.react,
                    key: m.key
                }
            });

            // =========================
            // FEATURES
            // =========================
            const wantAI = query.toLowerCase().includes("ai");
            const wantTop = query.toLowerCase().includes("top");
            const wantRandom = query.toLowerCase().includes("random");

            const genreFilter =
                query.match(/genre:(\w+)/i)?.[1];

            const yearFilter =
                query.match(/year:(\d{4})/i)?.[1];

            const searchTerm = query
                .replace(/ai|top|random|genre:\w+|year:\d{4}/gi, '')
                .trim();

            // =========================
            // CACHE CHECK
            // =========================
            if (responseCache.has(query)) {

                const cached = responseCache.get(query);

                return await sock.sendMessage(chatId, cached, {
                    quoted: m
                });
            }

            let animeData = null;
            let source = '';
            let layer = 0;

            // =========================
            // RANDOM MODE
            // =========================
            if (wantRandom) {

                animeData =
                    LOCAL_ANIME[
                        Math.floor(Math.random() * LOCAL_ANIME.length)
                    ];

                source = "LOCAL_RANDOM";
                layer = 1;
            }

            // =========================
            // TOP MODE
            // =========================
            if (wantTop && !animeData) {

                animeData = [...LOCAL_ANIME]
                    .sort((a, b) => b.rating - a.rating)[0];

                source = "LOCAL_TOP";
                layer = 1;
            }

            // =========================
            // LOCAL SEARCH
            // =========================
            if (!animeData && !wantAI) {

                let filtered = LOCAL_ANIME;

                if (searchTerm) {

                    filtered = filtered.filter(a =>
                        a.title.toLowerCase()
                            .includes(searchTerm.toLowerCase())
                    );
                }

                if (genreFilter) {

                    filtered = filtered.filter(a =>
                        a.genre.some(g =>
                            g.toLowerCase()
                                .includes(genreFilter.toLowerCase())
                        )
                    );
                }

                if (yearFilter) {

                    filtered = filtered.filter(a =>
                        String(a.year) === String(yearFilter)
                    );
                }

                if (filtered.length > 0) {

                    animeData = filtered[0];
                    source = 'LOCAL_DB';
                    layer = 1;
                }
            }

            // =========================
            // API FALLBACKS
            // =========================
            if (!animeData) {

                for (let i = 0; i < ANIME_APIS.length; i++) {

                    const animeAPI = ANIME_APIS[i];

                    try {

                        const result =
                            await animeAPI.handler(searchTerm || query);

                        if (result?.title) {

                            animeData = result;
                            source = animeAPI.name;
                            layer = i + 2;

                            break;
                        }

                    } catch (err) {

                        console.log(
                            `[${animeAPI.name}] ERROR:`,
                            err.message
                        );

                        continue;
                    }
                }
            }

            // =========================
            // AI FALLBACK
            // =========================
            if (!animeData) {

                try {

                    const aiPrompt =
`Provide anime info for "${searchTerm || query}"

Return STRICT JSON ONLY:
{
"title":"name",
"year":2000,
"eps":24,
"genre":["Action"],
"rating":8.5,
"synopsis":"plot",
"studio":"studio"
}`;

                    const aiResult =
                        await callAI(aiPrompt, 400);

                    const clean =
                        aiResult
                            .replace(/```json/gi, '')
                            .replace(/```/g, '')
                            .trim();

                    const parsed = JSON.parse(clean);

                    if (parsed?.title) {

                        animeData = parsed;
                        source = "VEX_AI_RENDER";
                        layer = 7;
                    }

                } catch (err) {

                    console.log(
                        "AI FALLBACK FAILED:",
                        err.message
                    );
                }
            }

            // =========================
            // EMERGENCY FALLBACK
            // =========================
            if (!animeData) {

                animeData = LOCAL_ANIME[0];

                source = "EMERGENCY_CACHE";
                layer = 13;
            }

            // =========================
            // SAFE DATA FIX
            // =========================
            animeData.genre =
                Array.isArray(animeData.genre)
                    ? animeData.genre
                    : [];

            // =========================
            // CAPTION
            // =========================
            const renderCaption = () => {

                return `*${current.title}*
${current.line.repeat(20)}

📺 *Title:* ${animeData.title || "Unknown"}
📅 *Year:* ${animeData.year || "Unknown"}
📊 *Episodes:* ${animeData.eps || "Unknown"}
⭐ *Rating:* ${animeData.rating || "N/A"}/10
🎭 *Genre:* ${animeData.genre.join(", ") || "Unknown"}
🎬 *Studio:* ${animeData.studio || "Unknown"}

📝 *Synopsis:*
${animeData.synopsis || "No description"}

🌐 *Source:* ${source}
⚙️ *Layer:* ${layer}/13

${current.line.repeat(20)}

⚡ Powered By ${ENV.BOT_NAME}
_Use '${usedPrefix}as ${animeData.title} ai'_`;
            };

            // =========================
            // TRANSLATION SAFE FIX
            // =========================
            let finalText = renderCaption();

            try {

                if (targetLang !== 'en') {

                    const translated =
                        await translate(finalText, {
                            to: targetLang
                        });

                    finalText = translated.text;
                }

            } catch (translateError) {

                console.log(
                    "TRANSLATION FAILED:",
                    translateError.message
                );
            }

            // =========================
            // FINAL MESSAGE
            // =========================
            let finalPayload;

            if (animeData.image) {

                finalPayload = {
                    image: {
                        url: animeData.image
                    },
                    caption: finalText,
                    mentions: [userId]
                };

            } else {

                finalPayload = {
                    text: finalText,
                    mentions: [userId]
                };
            }

            // =========================
            // SEND MESSAGE
            // =========================
            await sock.sendMessage(
                chatId,
                finalPayload,
                { quoted: m }
            );

            // =========================
            // SAVE CACHE
            // =========================
            responseCache.set(query, finalPayload);

            // =========================
            // SUCCESS REACTION
            // =========================
            await sock.sendMessage(chatId, {
                react: {
                    text: "✅",
                    key: m.key
                }
            });

        } catch (error) {

            console.error(
                "ANIMESEARCH GOD MODE ERROR:",
                error
            );

            try {

                await sock.sendMessage(m.chat, {
                    text:
`⚠️ *VEX SEARCH EMERGENCY*

☣️ System recovered from fatal crash.

Try:
.as Naruto
.as One Piece
.as random

⚡ Engine stabilized successfully.`
                }, { quoted: m });

            } catch {}
        }
    }
};

// =========================
// AI FALLBACK SYSTEM
// =========================
async function callAI(prompt, maxTokens = 400) {

    const models = [

        {
            name: 'GROQ',
            fn: callGroq
        },

        {
            name: 'GEMINI',
            fn: callGemini
        },

        {
            name: 'OPENROUTER',
            fn: callOpenRouter
        },

        {
            name: 'CEREBRAS',
            fn: callCerebras
        },

        {
            name: 'SAMBANOVA',
            fn: callSambaNova
        },

        {
            name: 'CLOUDFLARE',
            fn: callCloudflare
        }
    ];

    for (const model of models) {

        try {

            if (aiCallCount[model.name] >= 500) {
                continue;
            }

            const result = await Promise.race([

                model.fn(prompt, maxTokens),

                new Promise((_, reject) =>
                    setTimeout(() =>
                        reject(new Error('TIMEOUT')),
                        10000
                    )
                )
            ]);

            aiCallCount[model.name] =
                (aiCallCount[model.name] || 0) + 1;

            if (result && result.length > 20) {
                return result;
            }

        } catch (err) {

            console.log(
                `[AI ${model.name}] FAILED:`,
                err.message
            );

            continue;
        }
    }

    throw new Error("AI_GENERATION_FAILED");
}

// =========================
// GROQ
// =========================
async function callGroq(prompt, maxTokens) {

    if (!ENV.GROQ_API_KEY) {
        throw new Error("NO_KEY");
    }

    const res = await api.post(
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
            temperature: 0.7
        },
        {
            headers: {
                Authorization:
                    `Bearer ${ENV.GROQ_API_KEY}`
            }
        }
    );

    return res.data.choices[0].message.content.trim();
}

// =========================
// GEMINI
// =========================
async function callGemini(prompt, maxTokens) {

    if (!ENV.GEMINI_API_KEY) {
        throw new Error("NO_KEY");
    }

    const res = await api.post(
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
                temperature: 0.7
            }
        }
    );

    return res.data.candidates[0].content.parts[0].text.trim();
}

// =========================
// OPENROUTER
// =========================
async function callOpenRouter(prompt, maxTokens) {

    if (!ENV.OPENROUTER_API_KEY) {
        throw new Error("NO_KEY");
    }

    const res = await api.post(
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
                Authorization:
                    `Bearer ${ENV.OPENROUTER_API_KEY}`
            }
        }
    );

    return res.data.choices[0].message.content.trim();
}

// =========================
// CEREBRAS
// =========================
async function callCerebras(prompt, maxTokens) {

    if (!ENV.CEREBRAS_API_KEY) {
        throw new Error("NO_KEY");
    }

    const res = await api.post(
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
            temperature: 0.7
        },
        {
            headers: {
                Authorization:
                    `Bearer ${ENV.CEREBRAS_API_KEY}`
            }
        }
    );

    return res.data.choices[0].message.content.trim();
}

// =========================
// SAMBANOVA
// =========================
async function callSambaNova(prompt, maxTokens) {

    if (!ENV.SAMBANOVA_API_KEY) {
        throw new Error("NO_KEY");
    }

    const res = await api.post(
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
                Authorization:
                    `Bearer ${ENV.SAMBANOVA_API_KEY}`
            }
        }
    );

    return res.data.choices[0].message.content.trim();
}

// =========================
// CLOUDFLARE
// =========================
async function callCloudflare(prompt, maxTokens) {

    if (
        !ENV.CLOUDFLARE_API_KEY ||
        !ENV.CLOUDFLARE_ACCOUNT_ID
    ) {
        throw new Error("NO_KEY");
    }

    const res = await api.post(
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
                Authorization:
                    `Bearer ${ENV.CLOUDFLARE_API_KEY}`
            }
        }
    );

    return res.data.result.response.trim();
}

// =========================
// RESET AI LIMIT
// =========================
setInterval(() => {

    aiCallCount = {};

}, 86400000);
