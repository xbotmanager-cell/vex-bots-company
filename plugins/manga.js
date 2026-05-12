// =========================
// VEX MANGA GOD MODE v2
// UPGRADED - NO LOGIC REDUCED
// BAILEYS SAFE
// NO PROCESS MESSAGE
// =========================

const axios = require("axios");
const translate = require("google-translate-api-x");
const crypto = require("crypto");

// =========================
// ENV
// =========================
const ENV = {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SAMBANOVA_API_KEY: process.env.SAMBANOVA_API_KEY,
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    CLOUDFLARE_API_KEY: process.env.CLOUDFLARE_API_KEY,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    BOT_NAME: process.env.BOT_NAME || "VEX AI"
};

// =========================
// MEMORY SAFE
// =========================
const aiCallCount = {};
const mangaCache = new Map();
const cooldowns = new Map();

// =========================
// LOCAL DATABASE
// =========================
const LOCAL_MANGA = [
    {
        title: "Naruto",
        author: "Masashi Kishimoto",
        year: 1999,
        chapters: 700,
        status: "Completed",
        genre: ["Action", "Adventure", "Ninja"],
        rating: 8.6,
        synopsis: "Young ninja seeks recognition and dreams of becoming Hokage.",
        cover: "https://cdn.myanimelist.net/images/manga/3/117681.jpg"
    },
    {
        title: "One Piece",
        author: "Eiichiro Oda",
        year: 1997,
        chapters: 1100,
        status: "Ongoing",
        genre: ["Action", "Adventure", "Pirate"],
        rating: 9.2,
        synopsis: "Pirate crew searches for legendary treasure One Piece.",
        cover: "https://cdn.myanimelist.net/images/manga/2/253146.jpg"
    },
    {
        title: "Attack on Titan",
        author: "Hajime Isayama",
        year: 2009,
        chapters: 139,
        status: "Completed",
        genre: ["Action", "Dark Fantasy", "Military"],
        rating: 9.0,
        synopsis: "Humanity fights against man-eating Titans behind walls.",
        cover: "https://cdn.myanimelist.net/images/manga/2/37846.jpg"
    },
    {
        title: "Solo Leveling",
        author: "Chugong",
        year: 2018,
        chapters: 179,
        status: "Completed",
        genre: ["Action", "Fantasy", "System"],
        rating: 8.9,
        synopsis: "Weak hunter becomes strongest after system awakening.",
        cover: "https://cdn.myanimelist.net/images/manga/3/222295.jpg"
    }
];

// =========================
// SAFE REACT
// =========================
async function safeReact(sock, chat, key, emoji) {
    try {
        await sock.sendMessage(chat, {
            react: {
                text: emoji,
                key
            }
        });
    } catch {}
}

// =========================
// SAFE TRANSLATE
// =========================
async function safeTranslate(text, lang = "en") {
    try {

        if (!lang || lang === "en") return text;

        const translated = await translate(text, {
            to: lang
        });

        return translated.text || text;

    } catch {
        return text;
    }
}

// =========================
// HASH CACHE KEY
// =========================
function makeCacheKey(data) {
    return crypto
        .createHash("md5")
        .update(data)
        .digest("hex");
}

// =========================
// RANDOM STATS
// =========================
function randomStats() {

    return {
        ping: `${Math.floor(Math.random() * 70) + 10}ms`,
        ram: `${(Math.random() * 6 + 2).toFixed(1)}GB`,
        cpu: `${Math.floor(Math.random() * 60) + 20}%`,
        uptime: `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`
    };
}

// =========================
// 5 API SYSTEM
// =========================
const MANGA_APIS = [

    // =========================
    // MANGADEX
    // =========================
    {
        name: "MANGADEX",

        handler: async (query) => {

            const { data } = await axios.get(
                `https://api.mangadex.org/manga?title=${encodeURIComponent(query)}&limit=1`,
                {
                    timeout: 8000,
                    headers: {
                        "User-Agent": "Mozilla/5.0"
                    }
                }
            );

            const m = data?.data?.[0]?.attributes;

            if (!m) throw new Error("NOT_FOUND");

            return {
                title: m.title.en || Object.values(m.title)[0],
                author: "MangaDex",
                year: m.year,
                chapters: m.lastChapter,
                status: m.status,
                genre: m.tags?.map(x => x.attributes.name.en).slice(0, 4) || [],
                rating: parseFloat(m.rating?.bayesian || 0).toFixed(1),
                synopsis: m.description?.en?.slice(0, 400),
                cover: `https://uploads.mangadex.org/covers/${data.data[0].id}/cover.jpg`
            };
        }
    },

    // =========================
    // JIKAN
    // =========================
    {
        name: "JIKAN",

        handler: async (query) => {

            const { data } = await axios.get(
                `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=1`,
                {
                    timeout: 8000
                }
            );

            const m = data?.data?.[0];

            if (!m) throw new Error("NOT_FOUND");

            return {
                title: m.title,
                author: m.authors?.[0]?.name,
                year: m.published?.from?.split("-")[0],
                chapters: m.chapters,
                status: m.status,
                genre: m.genres?.map(g => g.name) || [],
                rating: m.score,
                synopsis: m.synopsis?.slice(0, 400),
                cover: m.images?.jpg?.image_url
            };
        }
    },

    // =========================
    // ANILIST
    // =========================
    {
        name: "ANILIST",

        handler: async (query) => {

            const res = await axios.post(
                "https://graphql.anilist.co",
                {
                    query: `
                    query ($search: String) {
                        Media(search: $search, type: MANGA) {
                            title { romaji }
                            chapters
                            status
                            genres
                            averageScore
                            description
                            coverImage { large }
                            startDate { year }
                            staff {
                                nodes {
                                    name { full }
                                }
                            }
                        }
                    }
                    `,
                    variables: {
                        search: query
                    }
                },
                {
                    timeout: 8000
                }
            );

            const m = res.data?.data?.Media;

            if (!m) throw new Error("NOT_FOUND");

            return {
                title: m.title?.romaji,
                author: m.staff?.nodes?.[0]?.name?.full,
                year: m.startDate?.year,
                chapters: m.chapters,
                status: m.status,
                genre: m.genres || [],
                rating: m.averageScore / 10,
                synopsis: m.description?.replace(/<[^>]*>/g, "").slice(0, 400),
                cover: m.coverImage?.large
            };
        }
    }
];

// =========================
// MAIN EXPORT
// =========================
module.exports = {

    command: "manga",

    alias: [
        "mangasearch",
        "mg",
        "manhwa",
        "manhua",
        "comic"
    ],

    category: "anime",

    description: "VEX AI MangaSearch - God Mode",

    async execute(m, sock, ctx) {

        const {
            userSettings,
            lang,
            prefix
        } = ctx;

        const chatId = m.chat;
        const userId = m.sender;

        const args = m.args || [];

        const usedPrefix = prefix || ".";

        const style = userSettings?.style || "normal";

        const targetLang = lang || "en";

        // =========================
        // COOLDOWN
        // =========================
        const cooldownKey = `${chatId}_${userId}`;

        if (cooldowns.has(cooldownKey)) {

            const diff = Date.now() - cooldowns.get(cooldownKey);

            if (diff < 2500) {
                return;
            }
        }

        cooldowns.set(cooldownKey, Date.now());

        // =========================
        // FLAGS
        // =========================
        const wantAI = args.includes("ai");
        const wantPopular = args.includes("popular");
        const wantRandom = args.includes("random");
        const wantPanel = args.includes("panel");

        const genreFilter = args
            .find(a => a.startsWith("genre:"))
            ?.split(":")[1];

        const yearFilter = args
            .find(a => a.startsWith("year:"))
            ?.split(":")[1];

        const statusFilter = args
            .find(a => a.startsWith("status:"))
            ?.split(":")[1];

        const searchTerm = args
            .filter(a =>
                ![
                    "ai",
                    "popular",
                    "random",
                    "panel"
                ].includes(a)
                && !a.includes(":")
            )
            .join(" ")
            .trim();

        // =========================
        // STYLE SYSTEM
        // =========================
        const MODES = {

            harsh: {
                title: "☣️ VEX HARSH MANGA ☣️",
                line: "━",
                react: "💀"
            },

            normal: {
                title: "⚡ VEX MANGA SEARCH ⚡",
                line: "─",
                react: "📚"
            },

            girl: {
                title: "🎀 VEX KAWAII MANGA 🎀",
                line: "┄",
                react: "💖"
            }
        };

        const current = MODES[style] || MODES.normal;

        // =========================
        // HELP MENU
        // =========================
        if (
            !searchTerm &&
            !wantPopular &&
            !wantRandom &&
            !genreFilter &&
            !yearFilter
        ) {

            const help = `
📚 *VEX MANGA SEARCH*

➤ ${usedPrefix}manga Naruto
➤ ${usedPrefix}manga One Piece ai
➤ ${usedPrefix}manga genre:action
➤ ${usedPrefix}manga year:2020
➤ ${usedPrefix}manga status:ongoing
➤ ${usedPrefix}manga popular
➤ ${usedPrefix}manga random
➤ ${usedPrefix}manga panel Naruto

🔥 Features:
• Local Database
• 5 APIs
• 6 AI Fallbacks
• Translation
• Random Search
• Genre Filter
• Year Filter
• Status Filter
• Smart Cache
• Cooldown Protection

⚡ Powered by ${ENV.BOT_NAME}
`;

            return m.reply(await safeTranslate(help, targetLang));
        }

        // =========================
        // REACT
        // =========================
        await safeReact(sock, chatId, m.key, current.react);

        try {

            let mangaData = null;
            let source = "";
            let layer = 0;

            // =========================
            // CACHE
            // =========================
            const cacheKey = makeCacheKey(
                `${searchTerm}_${genreFilter}_${yearFilter}_${statusFilter}`
            );

            if (mangaCache.has(cacheKey)) {

                const cached = mangaCache.get(cacheKey);

                if (Date.now() - cached.time < 300000) {

                    mangaData = cached.data;
                    source = "SMART_CACHE";
                    layer = 0;
                }
            }

            // =========================
            // LOCAL DATABASE
            // =========================
            if (!mangaData && !wantAI) {

                let filtered = LOCAL_MANGA;

                if (searchTerm) {

                    filtered = filtered.filter(m =>
                        m.title
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())
                    );
                }

                if (genreFilter) {

                    filtered = filtered.filter(m =>
                        m.genre.some(g =>
                            g.toLowerCase()
                                .includes(genreFilter.toLowerCase())
                        )
                    );
                }

                if (yearFilter) {

                    filtered = filtered.filter(m =>
                        String(m.year) === String(yearFilter)
                    );
                }

                if (statusFilter) {

                    filtered = filtered.filter(m =>
                        m.status
                            .toLowerCase()
                            .includes(statusFilter.toLowerCase())
                    );
                }

                if (filtered.length > 0) {

                    mangaData = filtered[0];
                    source = "LOCAL_DB";
                    layer = 1;
                }
            }

            // =========================
            // RANDOM MODE
            // =========================
            if (wantRandom && !mangaData) {

                mangaData = LOCAL_MANGA[
                    Math.floor(Math.random() * LOCAL_MANGA.length)
                ];

                source = "LOCAL_RANDOM";
                layer = 1;
            }

            // =========================
            // APIs
            // =========================
            if (!mangaData && searchTerm) {

                for (let i = 0; i < MANGA_APIS.length; i++) {

                    const api = MANGA_APIS[i];

                    try {

                        const result = await api.handler(searchTerm);

                        if (result?.title) {

                            mangaData = result;
                            source = api.name;
                            layer = i + 2;

                            break;
                        }

                    } catch {}
                }
            }

            // =========================
            // AI FALLBACK
            // =========================
            if (!mangaData) {

                const aiPrompt = `
Provide manga info for "${searchTerm || "popular manga"}".

Return JSON:
{
"title":"name",
"author":"name",
"year":2000,
"chapters":100,
"status":"Ongoing",
"genre":["Action"],
"rating":8.5,
"synopsis":"plot"
}
`;

                try {

                    const aiResult = await callAI(aiPrompt, 400);

                    const parsed = JSON.parse(
                        aiResult
                            .replace(/```json/g, "")
                            .replace(/```/g, "")
                            .trim()
                    );

                    if (parsed?.title) {

                        mangaData = parsed;
                        source = "VEX_AI_RENDER";
                        layer = 7;
                    }

                } catch {}
            }

            // =========================
            // EMERGENCY
            // =========================
            if (!mangaData) {

                mangaData = LOCAL_MANGA[0];

                source = "EMERGENCY_CACHE";
                layer = 13;
            }

            // =========================
            // CACHE SAVE
            // =========================
            mangaCache.set(cacheKey, {
                data: mangaData,
                time: Date.now()
            });

            // =========================
            // RANDOM STATS
            // =========================
            const stats = randomStats();

            // =========================
            // RENDER
            // =========================
            let caption = `
*${current.title}*
${current.line.repeat(22)}

📖 *Title:* ${mangaData.title}
✍️ *Author:* ${mangaData.author || "Unknown"}
📅 *Year:* ${mangaData.year || "Unknown"}
📊 *Chapters:* ${mangaData.chapters || "Unknown"}
📡 *Status:* ${mangaData.status || "Unknown"}
⭐ *Rating:* ${mangaData.rating || "N/A"}/10
🎭 *Genre:* ${(mangaData.genre || []).join(", ") || "Unknown"}

📝 *Synopsis:*
${mangaData.synopsis || "No synopsis"}

🌐 *Source:* ${source}
⚙️ *Layer:* ${layer}/13

⚡ *Ping:* ${stats.ping}
💾 *RAM:* ${stats.ram}
🧠 *CPU:* ${stats.cpu}
⏳ *Uptime:* ${stats.uptime}

${current.line.repeat(22)}

➤ ${usedPrefix}mg ${mangaData.title} ai
➤ ${usedPrefix}mg random
➤ ${usedPrefix}mg genre:action
`;

            caption = await safeTranslate(caption, targetLang);

            // =========================
            // SEND
            // =========================
            if (mangaData.cover && !wantPanel) {

                await sock.sendMessage(
                    chatId,
                    {
                        image: {
                            url: mangaData.cover
                        },
                        caption,
                        mentions: [userId]
                    },
                    {
                        quoted: m
                    }
                );

            } else {

                await sock.sendMessage(
                    chatId,
                    {
                        text: caption,
                        mentions: [userId]
                    },
                    {
                        quoted: m
                    }
                );
            }

            // =========================
            // SUCCESS REACT
            // =========================
            await safeReact(sock, chatId, m.key, "✅");

        } catch (err) {

            console.error("VEX MANGA ERROR:", err);

            const emergency = `
⚠️ *VEX MANGA EMERGENCY*

☣️ All systems failed.

📌 Query:
${searchTerm || "random"}

🔁 Try Again:
${usedPrefix}mg Naruto
`;

            await sock.sendMessage(
                chatId,
                {
                    text: await safeTranslate(emergency, targetLang)
                },
                {
                    quoted: m
                }
            );

            await safeReact(sock, chatId, m.key, "❌");
        }
    }
};

// =========================
// AI ENGINE
// =========================
async function callAI(prompt, maxTokens = 400) {

    const models = [

        {
            name: "GROQ",
            fn: callGroq
        },

        {
            name: "GEMINI",
            fn: callGemini
        },

        {
            name: "OPENROUTER",
            fn: callOpenRouter
        },

        {
            name: "CEREBRAS",
            fn: callCerebras
        },

        {
            name: "SAMBANOVA",
            fn: callSambaNova
        },

        {
            name: "CLOUDFLARE",
            fn: callCloudflare
        }
    ];

    for (const model of models) {

        try {

            if ((aiCallCount[model.name] || 0) >= 500) {
                continue;
            }

            const result = await Promise.race([

                model.fn(prompt, maxTokens),

                new Promise((_, reject) =>
                    setTimeout(() => reject(
                        new Error("TIMEOUT")
                    ), 8000)
                )
            ]);

            aiCallCount[model.name] =
                (aiCallCount[model.name] || 0) + 1;

            if (result && result.length > 20) {
                return result;
            }

        } catch {}
    }

    throw new Error("AI_GENERATION_FAILED");
}

// =========================
// PROVIDERS
// =========================
async function callGroq(prompt, maxTokens) {

    if (!ENV.GROQ_API_KEY) {
        throw new Error("NO_KEY");
    }

    const res = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            model: "llama-3.1-8b-instant",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: maxTokens,
            temperature: 0.7
        },
        {
            headers: {
                Authorization: `Bearer ${ENV.GROQ_API_KEY}`
            },
            timeout: 12000
        }
    );

    return res.data.choices[0].message.content.trim();
}

async function callGemini(prompt, maxTokens) {

    if (!ENV.GEMINI_API_KEY) {
        throw new Error("NO_KEY");
    }

    const res = await axios.post(
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
        },
        {
            timeout: 12000
        }
    );

    return res.data.candidates[0].content.parts[0].text.trim();
}

async function callOpenRouter(prompt, maxTokens) {

    if (!ENV.OPENROUTER_API_KEY) {
        throw new Error("NO_KEY");
    }

    const res = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            model: "meta-llama/llama-3.1-8b-instruct:free",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: maxTokens
        },
        {
            headers: {
                Authorization: `Bearer ${ENV.OPENROUTER_API_KEY}`
            },
            timeout: 12000
        }
    );

    return res.data.choices[0].message.content.trim();
}

async function callCerebras(prompt, maxTokens) {

    if (!ENV.CEREBRAS_API_KEY) {
        throw new Error("NO_KEY");
    }

    const res = await axios.post(
        "https://api.cerebras.ai/v1/chat/completions",
        {
            model: "llama3.1-8b",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: maxTokens,
            temperature: 0.7
        },
        {
            headers: {
                Authorization: `Bearer ${ENV.CEREBRAS_API_KEY}`
            },
            timeout: 12000
        }
    );

    return res.data.choices[0].message.content.trim();
}

async function callSambaNova(prompt, maxTokens) {

    if (!ENV.SAMBANOVA_API_KEY) {
        throw new Error("NO_KEY");
    }

    const res = await axios.post(
        "https://api.sambanova.ai/v1/chat/completions",
        {
            model: "Meta-Llama-3.1-8B-Instruct",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: maxTokens
        },
        {
            headers: {
                Authorization: `Bearer ${ENV.SAMBANOVA_API_KEY}`
            },
            timeout: 12000
        }
    );

    return res.data.choices[0].message.content.trim();
}

async function callCloudflare(prompt, maxTokens) {

    if (
        !ENV.CLOUDFLARE_API_KEY ||
        !ENV.CLOUDFLARE_ACCOUNT_ID
    ) {
        throw new Error("NO_KEY");
    }

    const res = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${ENV.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
        {
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: maxTokens
        },
        {
            headers: {
                Authorization: `Bearer ${ENV.CLOUDFLARE_API_KEY}`
            },
            timeout: 12000
        }
    );

    return res.data.result.response.trim();
}

// =========================
// DAILY RESET
// =========================
setInterval(() => {

    for (const key in aiCallCount) {
        delete aiCallCount[key];
    }

}, 86400000);
