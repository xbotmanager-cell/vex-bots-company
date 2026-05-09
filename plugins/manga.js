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
const LOCAL_MANGA = [
    { title: "Naruto", author: "Masashi Kishimoto", year: 1999, chapters: 700, status: "Completed", genre: ["Action", "Adventure", "Ninja"], rating: 8.6, synopsis: "Young ninja seeks recognition and dreams of becoming Hokage.", cover: "https://cdn.myanimelist.net/images/manga/3/117681.jpg" },
    { title: "One Piece", author: "Eiichiro Oda", year: 1997, chapters: 1100, status: "Ongoing", genre: ["Action", "Adventure", "Pirate"], rating: 9.2, synopsis: "Pirate crew searches for legendary treasure One Piece.", cover: "https://cdn.myanimelist.net/images/manga/2/253146.jpg" },
    { title: "Attack on Titan", author: "Hajime Isayama", year: 2009, chapters: 139, status: "Completed", genre: ["Action", "Dark Fantasy", "Military"], rating: 9.0, synopsis: "Humanity fights against man-eating Titans behind walls.", cover: "https://cdn.myanimelist.net/images/manga/2/37846.jpg" },
    { title: "Demon Slayer", author: "Koyoharu Gotouge", year: 2016, chapters: 205, status: "Completed", genre: ["Action", "Supernatural", "Historical"], rating: 8.5, synopsis: "Boy becomes demon slayer to save sister turned demon.", cover: "https://cdn.myanimelist.net/images/manga/3/179882.jpg" },
    { title: "Jujutsu Kaisen", author: "Gege Akutami", year: 2018, chapters: 271, status: "Completed", genre: ["Action", "Supernatural", "School"], rating: 8.4, synopsis: "Student joins sorcerers to fight curses.", cover: "https://cdn.myanimelist.net/images/manga/3/210341.jpg" },
    { title: "Berserk", author: "Kentaro Miura", year: 1989, chapters: 375, status: "Ongoing", genre: ["Action", "Dark Fantasy", "Horror"], rating: 9.4, synopsis: "Mercenary seeks revenge in dark medieval world.", cover: "https://cdn.myanimelist.net/images/manga/1/157897.jpg" },
    { title: "Tokyo Ghoul", author: "Sui Ishida", year: 2011, chapters: 143, status: "Completed", genre: ["Action", "Horror", "Psychological"], rating: 8.5, synopsis: "Student becomes half-ghoul after organ transplant.", cover: "https://cdn.myanimelist.net/images/manga/3/171440.jpg" },
    { title: "Solo Leveling", author: "Chugong", year: 2018, chapters: 179, status: "Completed", genre: ["Action", "Fantasy", "System"], rating: 8.9, synopsis: "Weak hunter becomes strongest after system awakening.", cover: "https://cdn.myanimelist.net/images/manga/3/222295.jpg" },
    { title: "Chainsaw Man", author: "Tatsuki Fujimoto", year: 2018, chapters: 97, status: "Ongoing", genre: ["Action", "Dark Fantasy", "Gore"], rating: 8.8, synopsis: "Devil hunter merges with chainsaw devil.", cover: "https://cdn.myanimelist.net/images/manga/3/216464.jpg" },
    { title: "Vinland Saga", author: "Makoto Yukimura", year: 2005, chapters: 210, status: "Ongoing", genre: ["Action", "Historical", "Viking"], rating: 9.1, synopsis: "Young Viking seeks revenge for father's death.", cover: "https://cdn.myanimelist.net/images/manga/2/188925.jpg" }
];

// =========================
// 2. LOCAL API FALLBACKS - 5 APIs
// =========================
const MANGA_APIS = [
    { name: 'MANGADEX', handler: async (query) => {
        const { data } = await axios.get(`https://api.mangadex.org/manga?title=${encodeURIComponent(query)}&limit=1`, { timeout: 8000 });
        const m = data.data[0]?.attributes;
        if (!m) throw new Error('Not found');
        return {
            title: m.title.en || Object.values(m.title)[0],
            author: "MangaDex",
            year: m.year,
            chapters: m.lastChapter,
            status: m.status,
            genre: m.tags?.map(t => t.attributes.name.en).slice(0, 3) || [],
            rating: parseFloat(m.rating?.bayesian || 0).toFixed(1),
            synopsis: m.description?.en?.slice(0, 400),
            cover: `https://uploads.mangadex.org/covers/${data.data[0].id}/cover.jpg`
        };
    }},
    { name: 'JIKAN_MANGA', handler: async (query) => {
        const { data } = await axios.get(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(query)}&limit=1`, { timeout: 8000 });
        const m = data.data[0];
        if (!m) throw new Error('Not found');
        return {
            title: m.title,
            author: m.authors[0]?.name,
            year: m.published?.from?.split('-')[0],
            chapters: m.chapters,
            status: m.status,
            genre: m.genres?.map(g => g.name),
            rating: m.score,
            synopsis: m.synopsis?.slice(0, 400),
            cover: m.images.jpg.image_url
        };
    }},
    { name: 'ANILIST_MANGA', handler: async (query) => {
        const res = await axios.post('https://graphql.anilist.co', {
            query: `query ($search: String) { Media (search: $search, type: MANGA) { title { romaji } staff { nodes { name { full } } } startDate { year } chapters status genres averageScore description coverImage { large } } }`,
            variables: { search: query }
        }, { timeout: 8000 });
        const m = res.data.data.Media;
        if (!m) throw new Error('Not found');
        return {
            title: m.title.romaji,
            author: m.staff.nodes[0]?.name.full,
            year: m.startDate.year,
            chapters: m.chapters,
            status: m.status,
            genre: m.genres,
            rating: m.averageScore / 10,
            synopsis: m.description?.replace(/<[^>]*>/g, '').slice(0, 400),
            cover: m.coverImage.large
        };
    }},
    { name: 'MANGA_UPDATES', handler: async (query) => {
        const { data } = await axios.post('https://api.mangaupdates.com/v1/series/search', {
            search: query, perpage: 1
        }, { timeout: 8000 });
        const m = data.results[0]?.record;
        if (!m) throw new Error('Not found');
        return {
            title: m.title,
            author: m.authors?.[0]?.name,
            year: m.year,
            chapters: m.latest_chapter,
            status: m.completed? "Completed" : "Ongoing",
            genre: m.genres?.map(g => g.genre),
            rating: m.bayesian_rating,
            synopsis: m.description?.slice(0, 400),
            cover: m.image?.url?.original
        };
    }},
    { name: 'KITSU_MANGA', handler: async (query) => {
        const { data } = await axios.get(`https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(query)}&page[limit]=1`, { timeout: 8000 });
        const m = data.data[0]?.attributes;
        if (!m) throw new Error('Not found');
        return {
            title: m.canonicalTitle,
            author: "Kitsu",
            year: m.startDate?.split('-')[0],
            chapters: m.chapterCount,
            status: m.status,
            genre: [],
            rating: parseFloat(m.averageRating) / 10,
            synopsis: m.synopsis?.slice(0, 400),
            cover: m.posterImage?.large
        };
    }}
];

let aiCallCount = {};

module.exports = {
    command: "manga",
    alias: ["mangasearch", "mg", "manhwa", "manhua", "comic"], // HAKUNA 'search' ili kuzuia migongano
    category: "anime",
    description: "VEX AI MangaSearch - 11 Layer God Mode: Local DB + 5 APIs + 6 AI Fallbacks",

    async execute(m, sock, { userSettings, lang, prefix }) {
        const chatId = m.chat;
        const userId = m.sender;

        const usedPrefix = prefix || '.';
        const style = userSettings?.style || 'normal';
        const targetLang = lang || 'en';

        const args = m.args;
        const wantAI = args.includes('ai');
        const wantPanel = args.includes('panel');
        const wantPopular = args.includes('popular');
        const wantRandom = args.includes('random');
        const genreFilter = args.find(a => a.startsWith('genre:'))?.split(':')[1];
        const yearFilter = args.find(a => a.startsWith('year:'))?.split(':')[1];
        const statusFilter = args.find(a => a.startsWith('status:'))?.split(':')[1];
        const searchTerm = args.filter(a =>!['ai','panel','popular','random'].includes(a) &&!a.includes(':')).join(' ').trim();

        // Style templates
        const modes = {
            harsh: {
                title: "☣️ 𝕍𝔼𝕏 ℍ𝔸ℝ𝕊ℍ 𝕄𝔸ℕ𝔾𝔸 ☣️",
                line: "━",
                react: "💀"
            },
            normal: {
                title: "⚡ VEX MANGA SEARCH ⚡",
                line: "─",
                react: "📚"
            },
            girl: {
                title: "🫧 𝐕𝐄𝐗 𝐊𝐀𝐖𝐀𝐈 𝐌𝐀𝐍𝐆𝐀 🫧",
                line: "┄",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        if (!searchTerm &&!wantPopular &&!wantRandom &&!genreFilter &&!yearFilter) {
            return m.reply(`📚 *VEX MANGA SEARCH*\n\n➤${usedPrefix}manga Naruto\n➤${usedPrefix}manga One Piece ai\n➤${usedPrefix}manga genre:action\n➤${usedPrefix}manga year:2020\n➤${usedPrefix}manga status:ongoing\n➤${usedPrefix}manga popular\n➤${usedPrefix}manga random\n➤${usedPrefix}manga panel Naruto\n\n*Features:* Local DB, 5 APIs, 6 AI, Panels, Genre, Year, Status\n*Powered by ${ENV.BOT_NAME}*`);
        }

        await sock.sendMessage(chatId, { react: { text: current.react, key: m.key } });

        try {
            let mangaData = null;
            let source = '';
            let layer = 0;

            // =========================
            // LAYER 1: LOCAL DATABASE FIRST
            // =========================
            if (!wantAI &&!wantRandom) {
                let filtered = LOCAL_MANGA;
                if (searchTerm) {
                    filtered = LOCAL_MANGA.filter(m =>
                        m.title.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                }
                if (genreFilter) {
                    filtered = filtered.filter(m =>
                        m.genre.some(g => g.toLowerCase().includes(genreFilter.toLowerCase()))
                    );
                }
                if (yearFilter) {
                    filtered = filtered.filter(m => m.year == yearFilter);
                }
                if (statusFilter) {
                    filtered = filtered.filter(m =>
                        m.status.toLowerCase().includes(statusFilter.toLowerCase())
                    );
                }
                if (filtered.length > 0) {
                    mangaData = filtered[0];
                    source = 'LOCAL_DB';
                    layer = 1;
                }
            }

            // Random mode
            if (wantRandom &&!mangaData) {
                mangaData = LOCAL_MANGA[Math.floor(Math.random() * LOCAL_MANGA.length)];
                source = 'LOCAL_DB_RANDOM';
                layer = 1;
            }

            // =========================
            // LAYER 2-6: 5 LOCAL APIs
            // =========================
            if (!mangaData && searchTerm) {
                for (let i = 0; i < MANGA_APIS.length; i++) {
                    const api = MANGA_APIS[i];
                    try {
                        mangaData = await api.handler(searchTerm);
                        if (mangaData && mangaData.title) {
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
            if (!mangaData) {
                const aiPrompt = `Provide manga info for "${searchTerm || 'popular manga'}". Return JSON: {"title":"name","author":"name","year":2000,"chapters":100,"status":"Ongoing","genre":["Action"],"rating":8.5,"synopsis":"plot"}`;

                try {
                    const aiResult = await callAI(aiPrompt, 400);
                    const parsed = JSON.parse(aiResult.replace(/```json|```/g, '').trim());
                    if (parsed.title) {
                        mangaData = parsed;
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
            if (!mangaData) {
                mangaData = LOCAL_MANGA[0];
                source = 'EMERGENCY_CACHE';
                layer = 13;
            }

            const renderCaption = () => {
                return `*${current.title}*\n${current.line.repeat(20)}\n\n📖 *Title:* ${mangaData.title}\n✍️ *Author:* ${mangaData.author || 'Unknown'}\n📅 *Year:* ${mangaData.year || 'Unknown'}\n📊 *Chapters:* ${mangaData.chapters || 'Unknown'}\n📡 *Status:* ${mangaData.status || 'Unknown'}\n⭐ *Rating:* ${mangaData.rating || 'N/A'}/10\n🎭 *Genre:* ${mangaData.genre?.join(', ') || 'Unknown'}\n\n📝 *Synopsis:*\n${mangaData.synopsis || 'No description'}\n\n🌐 *Source:* ${source}\n⚙️ *Layer:* ${layer}/13\n\n${current.line.repeat(20)}\n_Use '${usedPrefix}mg ${mangaData.title} ai' for AI details_`;
            };

            const { text } = await translate(renderCaption(), { to: targetLang });

            if (mangaData.cover &&!wantPanel) {
                await sock.sendMessage(chatId, {
                    image: { url: mangaData.cover },
                    caption: text,
                    mentions: [userId]
                }, { quoted: m });
            } else {
                await sock.sendMessage(chatId, { text, mentions: [userId] }, { quoted: m });
            }

            await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } });

        } catch (error) {
            console.error("MANGA GOD MODE ERROR:", error);
            const emergencyMsg = `⚠️ *VEX MANGA EMERGENCY* ⚠️\n\n☣️ All 13 layers failed\n\nQuery: ${searchTerm || 'random'}\n\nTry again: ${usedPrefix}mg Naruto`;
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
