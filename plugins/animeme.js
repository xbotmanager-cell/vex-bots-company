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
// 10 SUPER MEME APIs FROM WEBSITES
// =========================
const MEME_APIS = [
    { name: 'REDDIT_ANIME', handler: async (query) => {
        const sub = query? `search.json?q=${query}&restrict_sr=on` : 'hot.json';
        const { data } = await axios.get(`https://www.reddit.com/r/Animemes/${sub}?limit=50`, {
            headers: { 'User-Agent': 'VEX-AI-Bot' }, timeout: 8000
        });
        const posts = data.data.children.filter(p => p.data.post_hint === 'image' &&!p.data.over_18);
        if (!posts.length) throw new Error('No meme');
        const meme = posts[Math.floor(Math.random() * posts.length)].data;
        return { url: meme.url, title: meme.title, source: 'r/Animemes' };
    }},
    { name: 'IMGFLIP', handler: async () => {
        const { data } = await axios.get('https://api.imgflip.com/get_memes', { timeout: 8000 });
        const animeTemplates = data.data.memes.filter(m =>
            m.name.toLowerCase().includes('anime') || m.name.toLowerCase().includes('jojo') || m.name.toLowerCase().includes('naruto')
        );
        const meme = animeTemplates[Math.floor(Math.random() * animeTemplates.length)] || data.data.memes[Math.floor(Math.random() * 100)];
        return { url: meme.url, title: meme.name, source: 'ImgFlip' };
    }},
    { name: 'MEME_API', handler: async () => {
        const { data } = await axios.get('https://meme-api.com/gimme/animemes/1', { timeout: 8000 });
        const meme = data.memes[0];
        return { url: meme.url, title: meme.title, source: 'Meme-API' };
    }},
    { name: 'HUMOR_API', handler: async () => {
        const { data } = await axios.get('https://api.humorapi.com/memes/search?keywords=anime&number=1&media-type=image', { timeout: 8000 });
        const meme = data.memes[0];
        if (!meme) throw new Error('No meme');
        return { url: meme.url, title: meme.description, source: 'HumorAPI' };
    }},
    { name: 'TENOR_GIF', handler: async (query) => {
        const { data } = await axios.get(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query || 'anime meme')}&key=AIzaSyAyimkuYQYF_FXVALexVkuaCtB_HJI3SyM&limit=20`, { timeout: 8000 });
        const gif = data.results[Math.floor(Math.random() * data.results.length)];
        if (!gif) throw new Error('No gif');
        return { url: gif.media_formats.gif.url, title: gif.content_description, source: 'Tenor' };
    }},
    { name: 'GIPHY', handler: async (query) => {
        const { data } = await axios.get(`https://api.giphy.com/v1/gifs/search?api_key=Gc7131jiJuvI7IdN0HZ1D7mqKra5rYLC&q=${encodeURIComponent(query || 'anime meme')}&limit=20`, { timeout: 8000 });
        const gif = data.data[Math.floor(Math.random() * data.data.length)];
        if (!gif) throw new Error('No gif');
        return { url: gif.images.original.url, title: gif.title, source: 'GIPHY' };
    }},
    { name: 'NINEGAG', handler: async () => {
        const { data } = await axios.get('https://9gag.com/v1/group-posts/group/anime/type/hot', {
            headers: { 'User-Agent': 'VEX-AI-Bot' }, timeout: 8000
        });
        const posts = data.data.posts.filter(p => p.type === 'Photo');
        const meme = posts[Math.floor(Math.random() * posts.length)];
        if (!meme) throw new Error('No meme');
        return { url: meme.images.image700.url, title: meme.title, source: '9GAG' };
    }},
    { name: 'MEMEDROID', handler: async () => {
        const { data } = await axios.get('https://www.memedroid.com/memes/tag/anime', {
            headers: { 'User-Agent': 'VEX-AI-Bot' }, timeout: 8000
        });
        const match = data.match(/https:\/\/images\.memedroid\.com\/images\/UPLOADED\/[^"]+\.jpeg/g);
        if (!match) throw new Error('No meme');
        const url = match[Math.floor(Math.random() * match.length)];
        return { url, title: 'Anime Meme', source: 'MemeDroid' };
    }},
    { name: 'PINTEREST', handler: async (query) => {
        const { data } = await axios.get(`https://www.pinterest.com/resource/BaseSearchResource/get/?data={"options":{"query":"${query || 'anime meme'}","scope":"pins"}}`, {
            headers: { 'User-Agent': 'VEX-AI-Bot' }, timeout: 8000
        });
        const pins = data.resource_response.data.results;
        const pin = pins[Math.floor(Math.random() * pins.length)];
        if (!pin) throw new Error('No meme');
        return { url: pin.images.orig.url, title: pin.description, source: 'Pinterest' };
    }},
    { name: 'VEX_BACKUP', handler: async () => {
        return { url: 'https://i.ibb.co/4Z7Sf3q5/Chat-GPT-Image-May-8-2026-07-10-41-PM.png', title: 'VEX Backup Meme', source: 'VEX_LOCAL' };
    }}
];

let aiCallCount = {};

module.exports = {
    command: "animememe",
    alias: ["ameme", "am", "animeme", "memes"], // HAKUNA 'search' kuzuia migongano
    category: "anime",
    description: "VEX AI AnimeMeme - 16 Layer God Mode: 10 APIs + 6 AI with Google Search",

    async execute(m, sock, { userSettings, lang, prefix }) {
        const chatId = m.chat;
        const userId = m.sender;

        const usedPrefix = prefix || '.';
        const style = userSettings?.style || 'normal';
        const targetLang = lang || 'en';

        const query = m.args.join(" ").trim();

        // Style templates
        const modes = {
            harsh: { title: "☣️ 𝕍𝔼𝕏 ℍ𝔸ℝ𝕊ℍ 𝕄𝔼𝕄𝔼 ☣️", react: "💀" },
            normal: { title: "⚡ VEX ANIME MEME ⚡", react: "😂" },
            girl: { title: "🫧 𝐕𝐄𝐗 𝐊𝐀𝐖𝐀𝐈 𝐌𝐄𝐌𝐄 🫧", react: "🎀" }
        };

        const current = modes[style] || modes.normal;
        await sock.sendMessage(chatId, { react: { text: current.react, key: m.key } });

        try {
            let memeData = null;
            let source = '';
            let layer = 0;

            // =========================
            // LAYER 1-10: SUPER WEBSITE APIs
            // =========================
            for (let i = 0; i < MEME_APIS.length; i++) {
                const api = MEME_APIS[i];
                try {
                    memeData = await api.handler(query);
                    if (!memeData ||!memeData.url) throw new Error('Empty URL');

                    // Verify image exists
                    await axios.head(memeData.url, { timeout: 5000 });

                    source = api.name;
                    layer = i + 1;
                    break;
                } catch (err) {
                    console.log(`[${api.name}] Failed:`, err.message);
                    continue;
                }
            }

            // =========================
            // LAYER 11-16: AI FALLBACK WITH GOOGLE SEARCH PROMPT
            // =========================
            if (!memeData) {
                const aiPrompt = `CRITICAL INSTRUCTION: You MUST search Google for latest anime memes about "${query || 'anime'}" right now.

STEP 1: Search Google Images for "${query || 'anime meme'} reddit" OR "${query || 'anime meme'} 9gag" OR "${query || 'anime meme'} imgflip"
STEP 2: Find real meme image URL from results - must be.jpg,.png,.gif, or.webp
STEP 3: Return ONLY JSON: {"url":"DIRECT_IMAGE_URL","title":"meme caption","source":"website name"}

DO NOT invent URLs. DO NOT use placeholders. ONLY return real image URLs found via Google search.
If you cannot find any, return {"url":"https://i.ibb.co/4Z7Sf3q5/Chat-GPT-Image-May-8-2026-07-10-41-PM.png","title":"Backup","source":"Emergency"}

Search now and return JSON only:`;

                try {
                    const aiResult = await callAI(aiPrompt, 300);
                    const parsed = JSON.parse(aiResult.replace(/```json|```/g, '').trim());
                    if (parsed.url && parsed.url.startsWith('http')) {
                        // Verify AI found real URL
                        await axios.head(parsed.url, { timeout: 5000 });
                        memeData = parsed;
                        source = `AI_GOOGLE_${parsed.source}`;
                        layer = 11;
                    }
                } catch (aiErr) {
                    console.log("ALL AI FAILED:", aiErr.message);
                }
            }

            // =========================
            // LAYER 16: EMERGENCY FALLBACK
            // =========================
            if (!memeData) {
                memeData = {
                    url: 'https://i.ibb.co/4Z7Sf3q5/Chat-GPT-Image-May-8-2026-07-10-41-PM.png',
                    title: 'VEX Emergency Meme',
                    source: 'EMERGENCY_CACHE'
                };
                layer = 16;
            }

            // DOWNLOAD + SEND IMAGE CHAPU
            const imageBuffer = await axios.get(memeData.url, {
                responseType: 'arraybuffer',
                timeout: 20000,
                headers: { 'User-Agent': 'VEX-AI-Bot' }
            });

            const renderCaption = () => {
                return `*${current.title}*\n\n😂 *Caption:* ${memeData.title || 'Anime Meme'}\n🌐 *Source:* ${source}\n⚙️ *Layer:* ${layer}/16\n\n*Powered by ${ENV.BOT_NAME}*`;
            };

            const { text } = await translate(renderCaption(), { to: targetLang });

            await sock.sendMessage(chatId, {
                image: Buffer.from(imageBuffer.data),
                caption: text,
                mentions: [userId]
            }, { quoted: m });

            await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } });

        } catch (error) {
            console.error("ANIMEMEME GOD MODE ERROR:", error);

            // EVEN EMERGENCY SENDS IMAGE
            const emergencyUrl = 'https://i.ibb.co/4Z7Sf3q5/Chat-GPT-Image-May-8-2026-07-10-41-PM.png';
            const imageBuffer = await axios.get(emergencyUrl, { responseType: 'arraybuffer' });

            const emergencyMsg = `⚠️ *VEX MEME EMERGENCY* ⚠️\n\n☣️ All 16 layers failed\n\nQuery: ${query || 'random'}\n\nEmergency meme sent\n\nTry: ${usedPrefix}ameme Naruto`;
            const { text } = await translate(emergencyMsg, { to: targetLang });

            await sock.sendMessage(chatId, {
                image: Buffer.from(imageBuffer.data),
                caption: text
            });
        }
    }
};

// =========================
// AI FALLBACK - 6 MODELS WITH GOOGLE SEARCH INSTRUCTION
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
            if (aiCallCount[model.name] >= 500) continue;
            const result = await Promise.race([
                model.fn(prompt, maxTokens),
                new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 12000))
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
        temperature: 0.2 // Low temp for accurate URLs
    }, { headers: { 'Authorization': `Bearer ${ENV.GROQ_API_KEY}` }, timeout: 15000 });
    return res.data.choices[0].message.content.trim();
}

async function callGemini(prompt, maxTokens) {
    if (!ENV.GEMINI_API_KEY) throw new Error('NO_KEY');
    const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 }
    }, { timeout: 15000 });
    return res.data.candidates[0].content.parts[0].text.trim();
}

async function callOpenRouter(prompt, maxTokens) {
    if (!ENV.OPENROUTER_API_KEY) throw new Error('NO_KEY');
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
    }, { headers: { 'Authorization': `Bearer ${ENV.OPENROUTER_API_KEY}` }, timeout: 15000 });
    return res.data.choices[0].message.content.trim();
}

async function callCerebras(prompt, maxTokens) {
    if (!ENV.CEREBRAS_API_KEY) throw new Error('NO_KEY');
    const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
        model: 'llama3.1-8b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.2
    }, { headers: { 'Authorization': `Bearer ${ENV.CEREBRAS_API_KEY}` }, timeout: 15000 });
    return res.data.choices[0].message.content.trim();
}

async function callSambaNova(prompt, maxTokens) {
    if (!ENV.SAMBANOVA_API_KEY) throw new Error('NO_KEY');
    const res = await axios.post('https://api.sambanova.ai/v1/chat/completions', {
        model: 'Meta-Llama-3.1-8B-Instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
    }, { headers: { 'Authorization': `Bearer ${ENV.SAMBANOVA_API_KEY}` }, timeout: 15000 });
    return res.data.choices[0].message.content.trim();
}

async function callCloudflare(prompt, maxTokens) {
    if (!ENV.CLOUDFLARE_API_KEY ||!ENV.CLOUDFLARE_ACCOUNT_ID) throw new Error('NO_KEY');
    const res = await axios.post(`https://api.cloudflare.com/client/v4/accounts/${ENV.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
    }, { headers: { 'Authorization': `Bearer ${ENV.CLOUDFLARE_API_KEY}` }, timeout: 15000 });
    return res.data.result.response.trim();
}

setInterval(() => { aiCallCount = {}; }, 86400000);
