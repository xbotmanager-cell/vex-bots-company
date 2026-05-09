const axios = require('axios');
const yts = require('yt-search'); // npm install yt-search

// =========================
// ENV - AI APIs ZA RENDER
// =========================
const ENV = {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SAMBANOVA_API_KEY: process.env.SAMBANOVA_API_KEY,
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    CLOUDFLARE_API_KEY: process.env.CLOUDFLARE_API_KEY,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
};

let aiCallCount = {};

module.exports = {
    command: "recipe",
    alias: ["cook", "food", "mapishi", "chakula", "jiko"],
    category: "food",
    description: "VEX AI Recipe Pro - Recipe + YouTube + Nutrition + Calories + Cost + AI Summary",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style?.value || userSettings?.style || 'normal';
        const userLang = detectLang(m, args.join(" "));
        const dish = args.join(" ").trim();

        const ui = {
            harsh: { react: "🍳", prefix: "🍳 𝙑𝙀𝙓 𝙍𝙀𝘾𝙄𝙋𝙀 𝙋𝙍𝙊:" },
            normal: { react: "🍲", prefix: "🍲 VEX RECIPE PRO:" },
            girl: { react: "💖", prefix: "💖 𝑽𝑬𝑿 𝑹𝑬𝑪𝑰𝑷𝑬 𝑷𝑹𝑶:" }
        };

        const current = ui[style] || ui.normal;

        if (!dish) {
            await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
            return m.reply(`${current.prefix} Specify dish\n\n➤.recipe Pilau\n➤.recipe Biryani\n➤.recipe Ugali Samaki`);
        }

        await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

        try {
            // =========================
            // 1. YOUTUBE SEARCH - HAIKUZUIA KAMA HAIPO
            // =========================
            let ytData = { url: null, thumbnail: null, title: null, duration: null, views: null };
            try {
                const search = await yts(`${dish} recipe`);
                if (search.videos.length > 0) {
                    const vid = search.videos[0];
                    ytData = {
                        url: vid.url,
                        thumbnail: vid.thumbnail,
                        title: vid.title,
                        duration: vid.timestamp,
                        views: vid.views
                    };
                }
            } catch { }

            // =========================
            // 2. AI FALLBACK - SUMMARIZE KWA LUGHA YA USER
            // =========================
            const prompt = `You are VEX AI Master Chef. User wants "${dish}" in ${userLang}.
YouTube reference: "${ytData.title || 'N/A'}"

Create SIMPLE READING format with these 10 SECTIONS:

1) 🍽️ DISH: Name + Origin country
2) 📋 INGREDIENTS: Exact amounts, bullet list
3) 👨‍🍳 STEPS: Numbered, short, clear for beginners
4) ⏱️ TIME: Prep + Cook time total
5) 🍴 SERVINGS: How many people
6) 🔥 CALORIES: Per serving estimate
7) 💰 COST: Estimate Low/Medium/High in USD
8) 🥗 NUTRITION: Protein/Carbs/Fat summary
9) ⚠️ ALLERGENS: Common allergens present
10) 💡 PRO TIP: One secret tip from chefs

Max 1200 characters. Use ${userLang}. If not ${userLang}, use English.
Use emojis. No intro. Start direct with 🍽️ DISH.`;

            const recipe = await callAI(prompt);

            // =========================
            // 3. BUILD CAPTION
            // =========================
            let caption = `${current.prefix}\n\n${recipe}\n\n`;

            if (ytData.url) {
                caption += `🎥 *Video*: ${ytData.title}\n`;
                caption += `⏱️ ${ytData.duration} | 👁️ ${formatViews(ytData.views)} views\n`;
                caption += `🔗 ${ytData.url}`;
            } else {
                caption += `🔍 *Search*: https://youtube.com/results?search_query=${encodeURIComponent(dish + ' recipe')}`;
            }

            // =========================
            // 4. SEND WITH THUMBNAIL OR TEXT
            // =========================
            if (ytData.thumbnail) {
                await sock.sendMessage(m.chat, {
                    image: { url: ytData.thumbnail },
                    caption: caption
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.chat, { text: caption }, { quoted: m });
            }

        } catch (err) {
            console.log("RECIPE ERROR:", err.message);
            await sock.sendMessage(m.chat, {
                text: `${current.prefix} Recipe failed. Try:.recipe Pilau`
            }, { quoted: m });
        }
    }
};

// =========================
// AI FALLBACK CHAIN - APIS ZA RENDER
// =========================
async function callAI(prompt) {
    const models = [
        { name: 'GROQ', fn: callGroq },
        { name: 'CEREBRAS', fn: callCerebras },
        { name: 'SAMBANOVA', fn: callSambaNova },
        { name: 'GEMINI', fn: callGemini },
        { name: 'OPENROUTER', fn: callOpenRouter },
        { name: 'CLOUDFLARE', fn: callCloudflare }
    ];

    for (const model of models) {
        try {
            if (aiCallCount[model.name] >= 200) continue;
            const result = await Promise.race([
                model.fn(prompt),
                new Promise((_, rej) => setTimeout(() => rej('Timeout'), 4000))
            ]);
            aiCallCount[model.name] = (aiCallCount[model.name] || 0) + 1;
            if (result && result.length > 100) return result;
        } catch (e) { continue; }
    }
    return "🍽️ DISH: Recipe Unavailable\n📋 INGREDIENTS: Check YouTube\n👨‍🍳 STEPS: Search online\n💡 PRO TIP: Try again later";
}

async function callGroq(prompt) {
    if (!ENV.GROQ_API_KEY) throw 'No key';
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'system', content: 'You are VEX AI Master Chef. Format for simple reading. Use emojis. Be accurate.' }, { role: 'user', content: prompt }],
        max_tokens: 700,
        temperature: 0.2
    }, { headers: { 'Authorization': `Bearer ${ENV.GROQ_API_KEY}` }, timeout: 5000 });
    return res.data.choices[0].message.content.trim();
}

async function callCerebras(prompt) {
    if (!ENV.CEREBRAS_API_KEY) throw 'No key';
    const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
        model: 'llama3.1-8b',
        messages: [{ role: 'system', content: 'You are VEX AI Chef. Structured output.' }, { role: 'user', content: prompt }],
        max_tokens: 700,
        temperature: 0.2
    }, { headers: { 'Authorization': `Bearer ${ENV.CEREBRAS_API_KEY}` }, timeout: 5000 });
    return res.data.choices[0].message.content.trim();
}

async function callSambaNova(prompt) {
    if (!ENV.SAMBANOVA_API_KEY) throw 'No key';
    const res = await axios.post('https://api.sambanova.ai/v1/chat/completions', {
        model: 'Meta-Llama-3.1-8B-Instruct',
        messages: [{ role: 'system', content: 'You are VEX AI Chef.' }, { role: 'user', content: prompt }],
        max_tokens: 700
    }, { headers: { 'Authorization': `Bearer ${ENV.SAMBANOVA_API_KEY}` }, timeout: 5000 });
    return res.data.choices[0].message.content.trim();
}

async function callGemini(prompt) {
    if (!ENV.GEMINI_API_KEY) throw 'No key';
    const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: `You are VEX AI Master Chef. ${prompt}` }] }]
    }, { timeout: 5000 });
    return res.data.candidates[0].content.parts[0].text.trim();
}

async function callOpenRouter(prompt) {
    if (!ENV.OPENROUTER_API_KEY) throw 'No key';
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'system', content: 'You are VEX AI Chef.' }, { role: 'user', content: prompt }],
        max_tokens: 700
    }, { headers: { 'Authorization': `Bearer ${ENV.OPENROUTER_API_KEY}` }, timeout: 5000 });
    return res.data.choices[0].message.content.trim();
}

async function callCloudflare(prompt) {
    if (!ENV.CLOUDFLARE_API_KEY ||!ENV.CLOUDFLARE_ACCOUNT_ID) throw 'No key';
    const res = await axios.post(`https://api.cloudflare.com/client/v4/accounts/${ENV.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
        messages: [{ role: 'system', content: 'You are VEX AI Chef.' }, { role: 'user', content: prompt }]
    }, { headers: { 'Authorization': `Bearer ${ENV.CLOUDFLARE_API_KEY}` }, timeout: 5000 });
    return res.data.result.response.trim();
}

// =========================
// HELPERS
// =========================
function formatViews(views) {
    if (!views) return 'N/A';
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views.toString();
}

function detectLang(m, text = '') {
    const content = text || m.body || m.message?.conversation || '';
    if (/[\u0B80-\u0BFF]/.test(content)) return 'Tamil';
    if (/[\u0C00-\u0C7F]/.test(content)) return 'Telugu';
    if (/[\u0900-\u097F]/.test(content)) return 'Hindi';
    if (/[ء-ي]/.test(content)) return 'Arabic';
    if (/\b(ya|na|wa|za|ni|kwa|hii|hiyo|vipi|gani|nini|pilau|ugali|chapati|mandazi|wali|nyama|samaki)\b/i.test(content)) return 'Swahili';
    if (/[àáâãäåæçèéêëìíîïñòóôõöùúûüý]/.test(content)) return 'Spanish';
    if (/[àâçéèêëîïôûùüÿ]/.test(content)) return 'French';
    if (/[äöüß]/.test(content)) return 'German';
    if (/[а-яА-Я]/.test(content)) return 'Russian';
    if (/[你我他]/.test(content)) return 'Chinese';
    if (/[あ-ん]/.test(content)) return 'Japanese';
    return 'English';
}

setInterval(() => { aiCallCount = {}; }, 86400000);
