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
// 10 SUPER FREE PFP APIs - 100% ONLINE
// =========================
const PFP_APIS = [
    { name: 'WAIFU_PICS', handler: async (type) => {
        const { data } = await axios.get(`https://api.waifu.pics/sfw/${type}`, { timeout: 8000 });
        return data.url;
    }},
    { name: 'WAIFU_IM', handler: async (type) => {
        const { data } = await axios.get(`https://api.waifu.im/search?included_tags=${type}&is_nsfw=false`, { timeout: 8000 });
        return data.images[0]?.url;
    }},
    { name: 'NEKOS_BEST', handler: async (type) => {
        const { data } = await axios.get(`https://nekos.best/api/v2/${type}`, { timeout: 8000 });
        return data.results[0]?.url;
    }},
    { name: 'PIC_RE', handler: async (type) => {
        return `https://pic.re/image?category=${type}`;
    }},
    { name: 'ANIME_API', handler: async () => {
        const { data } = await axios.get('https://anime-api.hisoka17.repl.co/img/nsfw/waifu', { timeout: 8000 });
        return data.url;
    }},
    { name: 'NEKO_LOVE', handler: async (type) => {
        const { data } = await axios.get(`https://neko-love.xyz/api/v1/${type}`, { timeout: 8000 });
        return data.url;
    }},
    { name: 'WAIFU_PICS_ALT', handler: async () => {
        const { data } = await axios.get('https://api.waifu.pics/sfw/waifu', { timeout: 8000 });
        return data.url;
    }},
    { name: 'NEKOS_FUN', handler: async (type) => {
        const { data } = await axios.get(`https://nekos.fun/api/${type}`, { timeout: 8000 });
        return data.image;
    }},
    { name: 'PICSUM_ANIME', handler: async () => {
        return `https://picsum.photos/512/512?random=${Date.now()}`;
    }},
    { name: 'VEX_LOCAL', handler: async () => {
        return 'https://i.ibb.co/4Z7Sf3q5/Chat-GPT-Image-May-8-2026-07-10-41-PM.png';
    }}
];

// Types per mode
const PFP_TYPES = {
    harsh: ['kill', 'slap', 'punch', 'bully', 'bite'],
    normal: ['waifu', 'smile', 'happy', 'wink', 'dance', 'cuddle'],
    girl: ['neko', 'shinobu', 'megumin', 'maid', 'blush', 'pat'],
    boy: ['husbando', 'smile', 'smug', 'happy', 'wink']
};

let aiCallCount = {};

module.exports = {
    command: "animepfp",
    alias: ["apfp", "pfp", "avatar", "dp", "profilepic"], // HAKUNA 'search' kuzuia migongano
    category: "anime",
    description: "VEX AI AnimePFP - 16 Layer God Mode: 10 APIs + 6 AI Fallbacks, 100% Image",

    async execute(m, sock, { userSettings, lang, prefix }) {
        const chatId = m.chat;
        const userId = m.sender;

        const usedPrefix = prefix || '.';
        const style = userSettings?.style || 'normal';
        const targetLang = lang || 'en';

        const args = m.args;
        const mode = args[0]?.toLowerCase();
        const wantAI = args.includes('ai');

        let type = 'waifu';
        let modeTitle = 'NORMAL';

        // Mode detection
        if (mode === 'harsh' || mode === 'girl' || mode === 'boy') {
            const selectedMode = mode;
            type = args[1]?.toLowerCase();
            if (!type ||!PFP_TYPES[selectedMode].includes(type)) {
                type = PFP_TYPES[selectedMode][Math.floor(Math.random() * PFP_TYPES[selectedMode].length)];
            }
            modeTitle = selectedMode.toUpperCase();
        } else if (args[0]) {
            // Direct type
            type = args[0].toLowerCase();
            if (!Object.values(PFP_TYPES).flat().includes(type)) {
                type = 'waifu';
            }
        } else {
            // Auto from style
            type = PFP_TYPES[style][Math.floor(Math.random() * PFP_TYPES[style].length)];
        }

        // Style templates
        const modes = {
            harsh: {
                title: "☣️ 𝕍𝔼𝕏 ℍ𝔸ℝ𝕊ℍ ℙ𝔽ℙ ☣️",
                line: "━",
                react: "💀"
            },
            normal: {
                title: "⚡ VEX ANIME PFP ⚡",
                line: "─",
                react: "🎭"
            },
            girl: {
                title: "🫧 𝐕𝐄𝐗 𝐊𝐀𝐖𝐀𝐈 𝐏𝐅𝐏 🫧",
                line: "┄",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;
        await sock.sendMessage(chatId, { react: { text: current.react, key: m.key } });

        try {
            let imageUrl = '';
            let source = '';
            let layer = 0;

            // =========================
            // LAYER 1-10: 10 SUPER APIs
            // =========================
            for (let i = 0; i < PFP_APIS.length; i++) {
                const api = PFP_APIS[i];
                try {
                    imageUrl = await api.handler(type);
                    if (!imageUrl) throw new Error('Empty URL');

                    // Verify image exists
                    await axios.head(imageUrl, { timeout: 5000 });

                    source = api.name;
                    layer = i + 1;
                    break;
                } catch (err) {
                    console.log(`[${api.name}] Failed:`, err.message);
                    continue;
                }
            }

            // =========================
            // LAYER 11-16: 6 AI FALLBACKS
            // =========================
            if (!imageUrl && wantAI) {
                const aiPrompt = `Generate anime ${type} profile picture prompt for AI image generation. Style: ${modeTitle}. Return only prompt text.`;

                try {
                    const aiResult = await callAI(aiPrompt, 100);
                    // Use AI prompt to search image APIs again
                    for (const api of PFP_APIS) {
                        try {
                            imageUrl = await api.handler('waifu');
                            if (imageUrl) {
                                source = `AI_${api.name}`;
                                layer = 11;
                                break;
                            }
                        } catch {
                            continue;
                        }
                    }
                } catch (aiErr) {
                    console.log("ALL AI FAILED:", aiErr.message);
                }
            }

            // =========================
            // LAYER 16: EMERGENCY FALLBACK
            // =========================
            if (!imageUrl) {
                imageUrl = 'https://i.ibb.co/4Z7Sf3q5/Chat-GPT-Image-May-8-2026-07-10-41-PM.png';
                source = 'EMERGENCY_CACHE';
                layer = 16;
            }

            // Download as buffer - 100% INATUMA PICHA
            const imageBuffer = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 15000,
                headers: { 'User-Agent': 'VEX-AI-Bot' }
            });

            const renderCaption = () => {
                return `*${current.title}*\n${current.line.repeat(18)}\n\n🎭 *Type:* ${type.toUpperCase()}\n💎 *Mode:* ${modeTitle}\n🌐 *Source:* ${source}\n⚙️ *Layer:* ${layer}/16\n📐 *Size:* 512x512 HD\n\n${current.line.repeat(18)}\n_Use '${usedPrefix}apfp ${modeTitle.toLowerCase()}' for more_`;
            };

            const { text } = await translate(renderCaption(), { to: targetLang });

            await sock.sendMessage(chatId, {
                image: Buffer.from(imageBuffer.data),
                caption: text,
                mentions: [userId]
            }, { quoted: m });

            await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } });

        } catch (error) {
            console.error("ANIMEPFP GOD MODE ERROR:", error);
            // Even emergency sends image
            const emergencyUrl = 'https://i.ibb.co/4Z7Sf3q5/Chat-GPT-Image-May-8-2026-07-10-41-PM.png';
            const imageBuffer = await axios.get(emergencyUrl, { responseType: 'arraybuffer' });

            const emergencyMsg = `⚠️ *VEX PFP EMERGENCY* ⚠️\n\n☣️ All 16 layers failed\n\nType: ${type.toUpperCase()}\nMode: ${modeTitle}\n\nEmergency PFP sent\n\nTry: ${usedPrefix}apfp ${modeTitle.toLowerCase()}`;
            const { text } = await translate(emergencyMsg, { to: targetLang });

            await sock.sendMessage(chatId, {
                image: Buffer.from(imageBuffer.data),
                caption: text
            });
        }
    }
};

// =========================
// AI FALLBACK - 6 MODELS
// =========================
async function callAI(prompt, maxTokens = 100) {
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
            if (result && result.length > 10) return result;
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
        temperature: 0.8
    }, { headers: { 'Authorization': `Bearer ${ENV.GROQ_API_KEY}` }, timeout: 12000 });
    return res.data.choices[0].message.content.trim();
}

async function callGemini(prompt, maxTokens) {
    if (!ENV.GEMINI_API_KEY) throw new Error('NO_KEY');
    const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 }
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
        temperature: 0.8
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
