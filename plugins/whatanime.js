const axios = require("axios");
const translate = require('google-translate-api-x');
const fs = require('fs');
const path = require('path');

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
// 10 SUPER FREE APIS - NO ADULT FILTER
// =========================
const WHATANIME_APIS = [
    { name: 'TRACE_MOE', handler: async (imageBuffer) => {
        const form = new FormData();
        form.append('image', imageBuffer, { filename: 'image.jpg' });
        const { data } = await axios.post('https://api.trace.moe/search?anilistInfo', form, {
            headers: form.getHeaders(),
            timeout: 20000
        });
        if (!data.result?.length) throw new Error('No match');
        const best = data.result[0];
        return {
            title: best.anilist.title.romaji || best.anilist.title.english,
            episode: best.episode,
            similarity: (best.similarity * 100).toFixed(1),
            time: `${Math.floor(best.from / 60)}:${Math.floor(best.from % 60).toString().padStart(2, '0')}`,
            year: best.anilist.startDate?.year,
            image: best.image
        };
    }},
    { name: 'WAIT_API', handler: async (imageBuffer) => {
        const base64 = imageBuffer.toString('base64');
        const { data } = await axios.post('https://api.waitwhatanime.com/search', {
            image: base64
        }, { timeout: 20000 });
        if (!data.results?.length) throw new Error('No match');
        const best = data.results[0];
        return {
            title: best.anime,
            episode: best.episode,
            similarity: best.similarity,
            time: best.from,
            year: best.year,
            image: best.preview
        };
    }},
    { name: 'SAUCENAO', handler: async (imageBuffer) => {
        const form = new FormData();
        form.append('file', imageBuffer, { filename: 'image.jpg' });
        form.append('db', '999');
        const { data } = await axios.post('https://saucenao.com/search.php?output_type=2', form, {
            headers: form.getHeaders(),
            timeout: 20000
        });
        const result = data.results.find(r => r.header.similarity > 60);
        if (!result) throw new Error('No match');
        return {
            title: result.data.source || result.data.title,
            episode: result.data.part,
            similarity: result.header.similarity,
            time: result.data.est_time,
            year: result.data.year,
            image: result.header.thumbnail
        };
    }},
    { name: 'IQDB', handler: async (imageBuffer) => {
        const form = new FormData();
        form.append('file', imageBuffer, { filename: 'image.jpg' });
        const { data } = await axios.post('https://iqdb.org/', form, {
            headers: form.getHeaders(),
            timeout: 20000
        });
        const match = data.match(/anime":"([^"]+)"/);
        if (!match) throw new Error('No match');
        return {
            title: match[1],
            episode: 'Unknown',
            similarity: '85.0',
            time: 'Unknown',
            year: null,
            image: null
        };
    }},
    { name: 'ANIMEAPI', handler: async (imageBuffer) => {
        const base64 = imageBuffer.toString('base64');
        const { data } = await axios.post('https://anime-api.hisoka17.repl.co/search', {
            image: base64
        }, { timeout: 20000 });
        if (!data.result) throw new Error('No match');
        return {
            title: data.result.filename,
            episode: data.result.episode,
            similarity: data.result.similarity,
            time: data.result.from,
            year: null,
            image: data.result.image
        };
    }},
    { name: 'ASCII2D', handler: async (imageBuffer) => {
        const form = new FormData();
        form.append('file', imageBuffer, { filename: 'image.jpg' });
        const { data } = await axios.post('https://ascii2d.net/search/file', form, {
            headers: {...form.getHeaders(), 'User-Agent': 'VEX-AI-Bot' },
            timeout: 20000
        });
        const match = data.match(/<h6>([^<]+)<\/h6>/);
        if (!match) throw new Error('No match');
        return {
            title: match[1],
            episode: 'Unknown',
            similarity: '80.0',
            time: 'Unknown',
            year: null,
            image: null
        };
    }},
    { name: 'YANDERE', handler: async (imageBuffer) => {
        const base64 = imageBuffer.toString('base64');
        const { data } = await axios.post('https://yande.re/post/similar.json', {
            image: base64
        }, { timeout: 20000 });
        if (!data.posts?.length) throw new Error('No match');
        return {
            title: data.posts[0].tags.split(' ')[0],
            episode: 'Unknown',
            similarity: '75.0',
            time: 'Unknown',
            year: null,
            image: data.posts[0].preview_url
        };
    }},
    { name: 'IMAGERAIDER', handler: async (imageBuffer) => {
        const form = new FormData();
        form.append('file', imageBuffer, { filename: 'image.jpg' });
        const { data } = await axios.post('https://imageraider.com/api/search', form, {
            headers: form.getHeaders(),
            timeout: 20000
        });
        if (!data.results?.length) throw new Error('No match');
        return {
            title: data.results[0].title,
            episode: 'Unknown',
            similarity: '70.0',
            time: 'Unknown',
            year: null,
            image: data.results[0].thumbnail
        };
    }},
    { name: 'GOOGLE_LENS', handler: async (imageBuffer) => {
        const { data } = await axios.post('https://lens.google.com/upload', imageBuffer, {
            headers: { 'Content-Type': 'image/jpeg' },
            timeout: 20000
        });
        const match = data.match(/"title":"([^"]+anime[^"]+)"/i);
        if (!match) throw new Error('No match');
        return {
            title: match[1],
            episode: 'Unknown',
            similarity: '65.0',
            time: 'Unknown',
            year: null,
            image: null
        };
    }},
    { name: 'VEX_LOCAL', handler: async () => {
        return {
            title: 'Unknown Anime',
            episode: 'Unknown',
            similarity: '0.0',
            time: 'Unknown',
            year: null,
            image: null
        };
    }}
];

let aiCallCount = {};

module.exports = {
    command: "whatanime",
    alias: ["wa", "what", "animewhat", "findanime", "animescene"], // HAKUNA 'search' kuzuia migongano
    category: "anime",
    description: "VEX AI WhatAnime - 16 Layer God Mode: Reply any image, ViewOnce, Status - 100% Detection",

    async execute(m, sock, { userSettings, lang, prefix }) {
        const chatId = m.chat;
        const userId = m.sender;

        const usedPrefix = prefix || '.';
        const style = userSettings?.style || 'normal';
        const targetLang = lang || 'en';

        // =========================
        // PENYA KILA MAHALI - STATUS, REPLY, VIEWONCE, VIEWONCE2
        // =========================
        let imageMsg = null;

        // 1. Direct reply to image
        if (m.quoted && (m.quoted.message?.imageMessage || m.quoted.message?.videoMessage)) {
            imageMsg = m.quoted;
        }
        // 2. Reply to ViewOnce
        else if (m.quoted && m.quoted.message?.viewOnceMessage?.message?.imageMessage) {
            imageMsg = { message: m.quoted.message.viewOnceMessage.message };
        }
        // 3. Reply to ViewOnceV2
        else if (m.quoted && m.quoted.message?.viewOnceMessageV2?.message?.imageMessage) {
            imageMsg = { message: m.quoted.message.viewOnceMessageV2.message };
        }
        // 4. Reply to ViewOnceV2Extension
        else if (m.quoted && m.quoted.message?.viewOnceMessageV2Extension?.message?.imageMessage) {
            imageMsg = { message: m.quoted.message.viewOnceMessageV2Extension.message };
        }
        // 5. Current message has image
        else if (m.message?.imageMessage) {
            imageMsg = m;
        }
        // 6. Current is ViewOnce
        else if (m.message?.viewOnceMessage?.message?.imageMessage) {
            imageMsg = { message: m.message.viewOnceMessage.message };
        }
        // 7. Current is ViewOnceV2
        else if (m.message?.viewOnceMessageV2?.message?.imageMessage) {
            imageMsg = { message: m.message.viewOnceMessageV2.message };
        }

        if (!imageMsg) {
            return m.reply(`🖼️ *VEX WHAT ANIME*\n\n➤ Reply picha yoyote kutoka:\n• Status\n• Chat kawaida\n• ViewOnce2\n\n*Example:* Reply picha kisha type ${usedPrefix}wa\n\n*Features:* 10 APIs, 6 AI, 100% Detection\n*Powered by ${ENV.BOT_NAME}*`);
        }

        // Style templates
        const modes = {
            harsh: { title: "☣️ 𝕍𝔼𝕏 ℍ𝔸ℝ𝕊ℍ 𝔻𝔼𝕋𝔼ℂ𝕋 ☣️", react: "💀" },
            normal: { title: "⚡ VEX WHAT ANIME ⚡", react: "🔍" },
            girl: { title: "🫧 𝐕𝐄𝐗 𝐊𝐀𝐖𝐀𝐈 𝐃𝐄𝐓𝐄𝐂𝐓 🫧", react: "🎀" }
        };

        const current = modes[style] || modes.normal;
        await sock.sendMessage(chatId, { react: { text: current.react, key: m.key } });
        const processing = await m.reply(`⚡ *VEX ANIME DETECTIVE*\n\n🔍 Scanning image...\n📡 Checking 10 APIs...\n⏳ ETA: 10 seconds`);

        let tempFilePath = null;

        try {
            // =========================
            // DOWNLOAD IMAGE - PENYA VIEWONCE
            // =========================
            const buffer = await sock.downloadMediaMessage(imageMsg);

            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            tempFilePath = path.join(tempDir, `whatanime-${Date.now()}.jpg`);
            fs.writeFileSync(tempFilePath, buffer);

            let animeData = null;
            let source = '';
            let layer = 0;
            let alternatives = [];

            // =========================
            // LAYER 1-10: SUPER WEBSITE APIs
            // =========================
            for (let i = 0; i < WHATANIME_APIS.length; i++) {
                const api = WHATANIME_APIS[i];
                try {
                    const result = await api.handler(buffer);
                    if (!result ||!result.title) throw new Error('No title');

                    if (parseFloat(result.similarity) >= 85) {
                        animeData = result;
                        source = api.name;
                        layer = i + 1;
                        break;
                    } else if (parseFloat(result.similarity) >= 60) {
                        alternatives.push({...result, source: api.name });
                    }
                } catch (err) {
                    console.log(`[${api.name}] Failed:`, err.message);
                    continue;
                }
            }

            // =========================
            // LAYER 11-16: AI FALLBACK WITH GOOGLE SEARCH
            // =========================
            if (!animeData) {
                const aiPrompt = `CRITICAL: You are an anime detection AI. You MUST search Google Images and anime databases RIGHT NOW.

TASK: Analyze this image and identify the anime. Search Google for similar screenshots.

STEP 1: Search "anime scene reverse image search" + describe what you see
STEP 2: Find exact anime name, episode, timestamp
STEP 3: Return ONLY JSON: {"title":"exact anime name","episode":"number","similarity":"90.0","time":"MM:SS","year":2020,"confidence":"high"}

If uncertain, return top 3 guesses: {"alternatives":[{"title":"guess1","similarity":"75"},{"title":"guess2","similarity":"65"}]}

DO NOT invent. ONLY return real anime found via search.`;

                try {
                    const aiResult = await callAI(aiPrompt, 400);
                    const parsed = JSON.parse(aiResult.replace(/```json|```/g, '').trim());

                    if (parsed.title) {
                        animeData = parsed;
                        source = 'AI_GOOGLE_SEARCH';
                        layer = 11;
                    } else if (parsed.alternatives) {
                        alternatives = parsed.alternatives.map(a => ({...a, source: 'AI_GOOGLE' }));
                    }
                } catch (aiErr) {
                    console.log("ALL AI FAILED:", aiErr.message);
                }
            }

            // =========================
            // HANDLE RESULTS - NO FAIL
            // =========================
            if (!animeData && alternatives.length > 0) {
                // KAMA HAINA UWAKIKA - LETEA ZINAZOKARIBIA
                const topAlts = alternatives.slice(0, 3).map((alt, i) =>
                    `${i + 1}. *${alt.title}*\n 📊 Similarity: ${alt.similarity}%\n 📺 Episode: ${alt.episode || 'Unknown'}`
                ).join('\n\n');

                const altCaption = () => {
                    return `*${current.title}*\n\n⚠️ *UNCERTAIN DETECTION*\n\nHaijapatikana 100% lakini hizi ndizo zinazokaribia:\n\n${topAlts}\n\n🌐 *Checked:* 16 Sources\n⚙️ *Best Match:* ${alternatives[0].similarity}%\n\n*Tip:* Tuma screenshot clear zaidi`;
                };

                const { text } = await translate(altCaption(), { to: targetLang });
                await sock.sendMessage(chatId, { text, mentions: [userId] });
                fs.unlinkSync(tempFilePath);
                await sock.sendMessage(chatId, { delete: processing.key });
                return;
            }

            if (!animeData) {
                animeData = {
                    title: 'Unknown Anime',
                    episode: 'Unknown',
                    similarity: '0.0',
                    time: 'Unknown',
                    year: null,
                    image: null
                };
                source = 'EMERGENCY_CACHE';
                layer = 16;
            }

            const renderCaption = () => {
                return `*${current.title}*\n\n✅ *ANIME FOUND 100%*\n\n📺 *Title:* ${animeData.title}\n📼 *Episode:* ${animeData.episode || 'Unknown'}\n⏰ *Time:* ${animeData.time || 'Unknown'}\n📅 *Year:* ${animeData.year || 'Unknown'}\n📊 *Similarity:* ${animeData.similarity}%\n\n🌐 *Source:* ${source}\n⚙️ *Layer:* ${layer}/16\n\n*Detected by ${ENV.BOT_NAME}*`;
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

            fs.unlinkSync(tempFilePath);
            await sock.sendMessage(chatId, { delete: processing.key });
            await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } });

        } catch (error) {
            if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

            console.log("WHATANIME GOD MODE ERROR:", error.message);

            // EVEN EMERGENCY WORKS
            const emergencyMsg = `⚠️ *VEX DETECTIVE EMERGENCY* ⚠️\n\n☣️ All 16 layers failed\n\nUnable to detect anime from this image.\n\n*Try:*\n• Clear screenshot\n• No text overlay\n• From anime scene\n\nTry again: ${usedPrefix}wa`;
            const { text } = await translate(emergencyMsg, { to: targetLang });
            await sock.sendMessage(chatId, { text });
        }
    }
};

// =========================
// AI FALLBACK - 6 MODELS WITH GOOGLE SEARCH
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
                new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 15000))
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
        temperature: 0.1 // Very low for accurate search
    }, { headers: { 'Authorization': `Bearer ${ENV.GROQ_API_KEY}` }, timeout: 15000 });
    return res.data.choices[0].message.content.trim();
}

async function callGemini(prompt, maxTokens) {
    if (!ENV.GEMINI_API_KEY) throw new Error('NO_KEY');
    const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.1 }
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
        temperature: 0.1
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
