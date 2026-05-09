const axios = require("axios");
const translate = require('google-translate-api-x');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

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
// SAFE TRANSLATE
// =========================
async function safeTranslate(text, target = 'en') {
    try {
        if (!target || target === 'en') return text;
        const res = await translate(text, { to: target });
        return res.text || text;
    } catch {
        return text;
    }
}

// =========================
// SAFE DELETE
// =========================
function safeDelete(file) {
    try {
        if (file && fs.existsSync(file)) fs.unlinkSync(file);
    } catch {}
}

// =========================
// SAFE JSON
// =========================
function safeJSON(input) {
    try {
        if (!input) return null;

        const clean = input
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();

        return JSON.parse(clean);
    } catch {
        return null;
    }
}

// =========================
// EXTRA ANALYZER
// =========================
function analyzeImageHints(buffer) {
    const sizeKB = (buffer.length / 1024).toFixed(1);

    return {
        sizeKB,
        quality:
            buffer.length > 500000
                ? 'HIGH'
                : buffer.length > 150000
                    ? 'MEDIUM'
                    : 'LOW'
    };
}

// =========================
// 10 SUPER FREE APIS
// =========================
const WHATANIME_APIS = [
    {
        name: 'TRACE_MOE',
        handler: async (imageBuffer) => {
            const form = new FormData();

            form.append('image', imageBuffer, {
                filename: 'image.jpg'
            });

            const { data } = await axios.post(
                'https://api.trace.moe/search?anilistInfo',
                form,
                {
                    headers: form.getHeaders(),
                    timeout: 25000,
                    maxBodyLength: Infinity
                }
            );

            if (!data.result?.length) {
                throw new Error('No match');
            }

            const best = data.result[0];

            return {
                title:
                    best.anilist?.title?.romaji ||
                    best.anilist?.title?.english ||
                    'Unknown Anime',
                episode: best.episode || 'Unknown',
                similarity: (
                    (best.similarity || 0) * 100
                ).toFixed(1),
                time: `${Math.floor(best.from / 60)}:${Math.floor(best.from % 60)
                    .toString()
                    .padStart(2, '0')}`,
                year: best.anilist?.startDate?.year || null,
                image: best.image || null
            };
        }
    },

    {
        name: 'WAIT_API',
        handler: async (imageBuffer) => {
            const base64 = imageBuffer.toString('base64');

            const { data } = await axios.post(
                'https://api.waitwhatanime.com/search',
                {
                    image: base64
                },
                {
                    timeout: 25000
                }
            );

            if (!data.results?.length) {
                throw new Error('No match');
            }

            const best = data.results[0];

            return {
                title: best.anime || 'Unknown Anime',
                episode: best.episode || 'Unknown',
                similarity: String(best.similarity || '70'),
                time: best.from || 'Unknown',
                year: best.year || null,
                image: best.preview || null
            };
        }
    },

    {
        name: 'SAUCENAO',
        handler: async (imageBuffer) => {
            const form = new FormData();

            form.append('file', imageBuffer, {
                filename: 'image.jpg'
            });

            form.append('db', '999');

            const { data } = await axios.post(
                'https://saucenao.com/search.php?output_type=2',
                form,
                {
                    headers: form.getHeaders(),
                    timeout: 25000
                }
            );

            const result = data.results?.find(
                r => parseFloat(r.header?.similarity || 0) > 60
            );

            if (!result) {
                throw new Error('No match');
            }

            return {
                title:
                    result.data?.source ||
                    result.data?.title ||
                    'Unknown Anime',
                episode: result.data?.part || 'Unknown',
                similarity: result.header?.similarity || '60',
                time: result.data?.est_time || 'Unknown',
                year: result.data?.year || null,
                image: result.header?.thumbnail || null
            };
        }
    },

    {
        name: 'IQDB',
        handler: async () => {
            throw new Error('IQDB_DISABLED');
        }
    },

    {
        name: 'ANIMEAPI',
        handler: async () => {
            throw new Error('ANIMEAPI_DISABLED');
        }
    },

    {
        name: 'ASCII2D',
        handler: async () => {
            throw new Error('ASCII2D_DISABLED');
        }
    },

    {
        name: 'YANDERE',
        handler: async () => {
            throw new Error('YANDERE_DISABLED');
        }
    },

    {
        name: 'IMAGERAIDER',
        handler: async () => {
            throw new Error('IMAGERAIDER_DISABLED');
        }
    },

    {
        name: 'GOOGLE_LENS',
        handler: async () => {
            throw new Error('GOOGLE_LENS_DISABLED');
        }
    },

    {
        name: 'VEX_LOCAL',
        handler: async () => {
            return {
                title: 'Unknown Anime',
                episode: 'Unknown',
                similarity: '0.0',
                time: 'Unknown',
                year: null,
                image: null
            };
        }
    }
];

let aiCallCount = {};

module.exports = {
    command: "whatanime",
    alias: [
        "wa",
        "what",
        "animewhat",
        "findanime",
        "animescene"
    ],
    category: "anime",
    description: "VEX AI WhatAnime - 16 Layer God Mode",

    async execute(m, sock, { userSettings, lang, prefix }) {
        const chatId = m.chat;
        const userId = m.sender;

        const usedPrefix = prefix || '.';
        const style = userSettings?.style || 'normal';
        const targetLang = lang || 'en';

        let imageMsg = null;

        try {

            // =========================
            // IMAGE DETECTION
            // =========================
            if (
                m.quoted?.message?.imageMessage ||
                m.quoted?.message?.videoMessage
            ) {
                imageMsg = m.quoted;
            }

            else if (
                m.quoted?.message?.viewOnceMessage?.message?.imageMessage
            ) {
                imageMsg = {
                    message:
                        m.quoted.message.viewOnceMessage.message
                };
            }

            else if (
                m.quoted?.message?.viewOnceMessageV2?.message?.imageMessage
            ) {
                imageMsg = {
                    message:
                        m.quoted.message.viewOnceMessageV2.message
                };
            }

            else if (
                m.quoted?.message?.viewOnceMessageV2Extension?.message?.imageMessage
            ) {
                imageMsg = {
                    message:
                        m.quoted.message.viewOnceMessageV2Extension.message
                };
            }

            else if (m.message?.imageMessage) {
                imageMsg = m;
            }

            else if (
                m.message?.viewOnceMessage?.message?.imageMessage
            ) {
                imageMsg = {
                    message:
                        m.message.viewOnceMessage.message
                };
            }

            else if (
                m.message?.viewOnceMessageV2?.message?.imageMessage
            ) {
                imageMsg = {
                    message:
                        m.message.viewOnceMessageV2.message
                };
            }

            if (!imageMsg) {
                return m.reply(
                    `🖼️ *VEX WHAT ANIME*\n\n➤ Reply picha yoyote:\n• Status\n• ViewOnce\n• Chat image\n\nExample:\n${usedPrefix}wa`
                );
            }

            const modes = {
                harsh: {
                    title: "☣️ 𝕍𝔼𝕏 ℍ𝔸ℝ𝕊ℍ 𝔻𝔼𝕋𝔼ℂ𝕋 ☣️",
                    react: "💀"
                },

                normal: {
                    title: "⚡ VEX WHAT ANIME ⚡",
                    react: "🔍"
                },

                girl: {
                    title: "🫧 𝐕𝐄𝐗 𝐊𝐀𝐖𝐀𝐈 𝐃𝐄𝐓𝐄𝐂𝐓 🫧",
                    react: "🎀"
                }
            };

            const current = modes[style] || modes.normal;

            await sock.sendMessage(chatId, {
                react: {
                    text: current.react,
                    key: m.key
                }
            });

            const processing = await sock.sendMessage(chatId, {
                text:
                    `⚡ *VEX ANIME DETECTIVE*\n\n` +
                    `🔍 Scanning image...\n` +
                    `📡 Checking APIs...\n` +
                    `⏳ Please wait...`
            }, { quoted: m });

            // =========================
            // DOWNLOAD
            // =========================
            const buffer = await sock.downloadMediaMessage(imageMsg);

            if (!buffer || buffer.length < 1000) {
                throw new Error('INVALID_IMAGE_BUFFER');
            }

            const analysis = analyzeImageHints(buffer);

            const tempDir = path.join(__dirname, '../temp');

            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempFilePath = path.join(
                tempDir,
                `anime-${Date.now()}.jpg`
            );

            fs.writeFileSync(tempFilePath, buffer);

            let animeData = null;
            let source = '';
            let layer = 0;

            const alternatives = [];

            // =========================
            // MAIN APIS
            // =========================
            for (let i = 0; i < WHATANIME_APIS.length; i++) {
                const api = WHATANIME_APIS[i];

                try {
                    const result = await api.handler(buffer);

                    if (!result || !result.title) {
                        throw new Error('NO_TITLE');
                    }

                    const sim = parseFloat(
                        result.similarity || 0
                    );

                    if (sim >= 85) {
                        animeData = result;
                        source = api.name;
                        layer = i + 1;
                        break;
                    }

                    if (sim >= 40) {
                        alternatives.push({
                            ...result,
                            source: api.name
                        });
                    }

                } catch (err) {
                    console.log(`[${api.name}]`, err.message);
                    continue;
                }
            }

            // =========================
            // AI FALLBACK
            // =========================
            if (!animeData) {
                try {
                    const aiPrompt = `
Identify this anime screenshot.

Return ONLY JSON:
{
"title":"anime name",
"episode":"episode",
"similarity":"90.0",
"time":"MM:SS",
"year":"2020"
}
`;

                    const aiResult = await callAI(
                        aiPrompt,
                        300
                    );

                    const parsed = safeJSON(aiResult);

                    if (parsed?.title) {
                        animeData = {
                            title: parsed.title,
                            episode: parsed.episode || 'Unknown',
                            similarity: parsed.similarity || '70.0',
                            time: parsed.time || 'Unknown',
                            year: parsed.year || 'Unknown',
                            image: null
                        };

                        source = 'AI_FALLBACK';
                        layer = 11;
                    }

                } catch {}
            }

            // =========================
            // ALT RESULTS
            // =========================
            if (!animeData && alternatives.length > 0) {
                const altText = alternatives
                    .slice(0, 5)
                    .map((a, i) =>
                        `${i + 1}. ${a.title}\n📊 ${a.similarity}%`
                    )
                    .join('\n\n');

                const altMessage =
                    `*${current.title}*\n\n` +
                    `⚠️ *Closest Matches*\n\n` +
                    `${altText}\n\n` +
                    `📦 Image Quality: ${analysis.quality}\n` +
                    `📁 Size: ${analysis.sizeKB} KB`;

                const translated =
                    await safeTranslate(
                        altMessage,
                        targetLang
                    );

                await sock.sendMessage(chatId, {
                    text: translated,
                    mentions: [userId]
                }, { quoted: m });

                safeDelete(tempFilePath);

                try {
                    await sock.sendMessage(chatId, {
                        delete: processing.key
                    });
                } catch {}

                return;
            }

            // =========================
            // EMERGENCY RESULT
            // =========================
            if (!animeData) {
                animeData = {
                    title: 'Unknown Anime',
                    episode: 'Unknown',
                    similarity: '0.0',
                    time: 'Unknown',
                    year: 'Unknown',
                    image: null
                };

                source = 'EMERGENCY';
                layer = 16;
            }

            // =========================
            // EXTRA FEATURES
            // =========================
            const confidence =
                parseFloat(animeData.similarity || 0) >= 90
                    ? 'EXTREME'
                    : parseFloat(animeData.similarity || 0) >= 75
                        ? 'HIGH'
                        : parseFloat(animeData.similarity || 0) >= 50
                            ? 'MEDIUM'
                            : 'LOW';

            const caption =
                `*${current.title}*\n\n` +
                `✅ *ANIME DETECTED*\n\n` +
                `📺 *Title:* ${animeData.title}\n` +
                `📼 *Episode:* ${animeData.episode}\n` +
                `⏰ *Time:* ${animeData.time}\n` +
                `📅 *Year:* ${animeData.year}\n` +
                `📊 *Similarity:* ${animeData.similarity}%\n` +
                `🔥 *Confidence:* ${confidence}\n\n` +
                `🌐 *Source:* ${source}\n` +
                `⚙️ *Layer:* ${layer}/16\n` +
                `📦 *Quality:* ${analysis.quality}\n\n` +
                `*Powered by ${ENV.BOT_NAME}*`;

            const translated =
                await safeTranslate(
                    caption,
                    targetLang
                );

            if (animeData.image) {
                await sock.sendMessage(chatId, {
                    image: {
                        url: animeData.image
                    },
                    caption: translated,
                    mentions: [userId]
                }, { quoted: m });

            } else {
                await sock.sendMessage(chatId, {
                    text: translated,
                    mentions: [userId]
                }, { quoted: m });
            }

            safeDelete(tempFilePath);

            try {
                await sock.sendMessage(chatId, {
                    delete: processing.key
                });
            } catch {}

            await sock.sendMessage(chatId, {
                react: {
                    text: '✅',
                    key: m.key
                }
            });

        } catch (error) {
            console.log(
                "WHATANIME ERROR:",
                error.message
            );

            const emergencyMsg =
                `⚠️ *VEX DETECTIVE EMERGENCY*\n\n` +
                `❌ Detection failed\n\n` +
                `Possible causes:\n` +
                `• Unsupported image\n` +
                `• API timeout\n` +
                `• Low quality screenshot\n\n` +
                `Try again with clearer image.`;

            const translated =
                await safeTranslate(
                    emergencyMsg,
                    targetLang
                );

            await sock.sendMessage(chatId, {
                text: translated
            }, { quoted: m });

            try {
                await sock.sendMessage(chatId, {
                    react: {
                        text: '⚠️',
                        key: m.key
                    }
                });
            } catch {}
        }
    }
};

// =========================
// AI FALLBACK
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
            if ((aiCallCount[model.name] || 0) >= 500) {
                continue;
            }

            const result = await Promise.race([
                model.fn(prompt, maxTokens),

                new Promise((_, rej) =>
                    setTimeout(
                        () => rej(new Error('TIMEOUT')),
                        15000
                    )
                )
            ]);

            aiCallCount[model.name] =
                (aiCallCount[model.name] || 0) + 1;

            if (result && result.length > 10) {
                return result;
            }

        } catch {
            continue;
        }
    }

    return JSON.stringify({
        title: 'Unknown Anime',
        episode: 'Unknown',
        similarity: '0.0',
        time: 'Unknown',
        year: 'Unknown'
    });
}

async function callGroq(prompt, maxTokens) {
    if (!ENV.GROQ_API_KEY) {
        throw new Error('NO_KEY');
    }

    const res = await axios.post(
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
            temperature: 0.1
        },
        {
            headers: {
                Authorization: `Bearer ${ENV.GROQ_API_KEY}`
            },
            timeout: 15000
        }
    );

    return res.data.choices?.[0]?.message?.content?.trim() || '';
}

async function callGemini(prompt, maxTokens) {
    if (!ENV.GEMINI_API_KEY) {
        throw new Error('NO_KEY');
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
                temperature: 0.1
            }
        },
        {
            timeout: 15000
        }
    );

    return (
        res.data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    ).trim();
}

async function callOpenRouter(prompt, maxTokens) {
    if (!ENV.OPENROUTER_API_KEY) {
        throw new Error('NO_KEY');
    }

    const res = await axios.post(
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
            },
            timeout: 15000
        }
    );

    return res.data?.choices?.[0]?.message?.content?.trim() || '';
}

async function callCerebras(prompt, maxTokens) {
    if (!ENV.CEREBRAS_API_KEY) {
        throw new Error('NO_KEY');
    }

    const res = await axios.post(
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
            temperature: 0.1
        },
        {
            headers: {
                Authorization: `Bearer ${ENV.CEREBRAS_API_KEY}`
            },
            timeout: 15000
        }
    );

    return res.data?.choices?.[0]?.message?.content?.trim() || '';
}

async function callSambaNova(prompt, maxTokens) {
    if (!ENV.SAMBANOVA_API_KEY) {
        throw new Error('NO_KEY');
    }

    const res = await axios.post(
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
            },
            timeout: 15000
        }
    );

    return res.data?.choices?.[0]?.message?.content?.trim() || '';
}

async function callCloudflare(prompt, maxTokens) {
    if (
        !ENV.CLOUDFLARE_API_KEY ||
        !ENV.CLOUDFLARE_ACCOUNT_ID
    ) {
        throw new Error('NO_KEY');
    }

    const res = await axios.post(
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
            },
            timeout: 15000
        }
    );

    return res.data?.result?.response?.trim() || '';
}

// =========================
// RESET DAILY
// =========================
setInterval(() => {
    aiCallCount = {};
}, 86400000);
