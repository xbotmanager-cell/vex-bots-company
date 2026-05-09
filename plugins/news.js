const axios = require('axios');

// =========================
// ENV - AI APIs ZA RENDER + NEWS API
// =========================
const ENV = {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SAMBANOVA_API_KEY: process.env.SAMBANOVA_API_KEY,
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    CLOUDFLARE_API_KEY: process.env.CLOUDFLARE_API_KEY,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    NEWS_API_KEY: process.env.NEWS_API_KEY // Free from newsapi.org
};

let aiCallCount = {};

module.exports = {
    command: "news",
    alias: ["habari", "taarifa", "headline", "breaking"],
    category: "news",
    description: "VEX AI News - Latest headlines with AI summary + thumbnail",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style?.value || userSettings?.style || 'normal';
        const userLang = detectLang(m, args.join(" "));
        const query = args.join(" ").trim() || 'general';

        const ui = {
            harsh: { react: "📰", prefix: "📰 𝙑𝙀𝙓 𝙉𝙀𝙒𝙎:" },
            normal: { react: "🌍", prefix: "🌍 VEX NEWS:" },
            girl: { react: "💖", prefix: "💖 𝑽𝑬𝑿 𝑵𝑬𝑾𝑺:" }
        };

        const current = ui[style] || ui.normal;
        await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

        try {
            let newsData = null;
            let source = 'API';

            // =========================
            // 1. JARIBU NEWS API KWANZA
            // =========================
            try {
                newsData = await getNewsAPI(query);
            } catch (e) {
                console.log("NEWS API FAILED:", e.message);
            }

            // =========================
            // 2. KAMA API IMESHINDWA, AI FALLBACK
            // =========================
            if (!newsData || newsData.length === 0) {
                source = 'AI';
                const prompt = `You are VEX AI News Reporter. User wants latest news about "${query}" in ${userLang}.
Generate 5 realistic recent headlines with:
1) Title - short, factual
2) Summary - 2 sentences, simple reading
3) Date - today or yesterday
4) Category
Max 1000 characters. Use ${userLang}. If not ${userLang}, use English.
Format: 📰 TITLE | 📅 DATE | 📝 SUMMARY
No intro. Start direct with first headline.`;

                const aiNews = await callAI(prompt);
                newsData = parseAIToNews(aiNews);
            }

            // =========================
            // 3. PATA THUMBNAIL - HAIHARIBU KAMA HAIPO
            // =========================
            let thumbnail = null;
            try {
                if (newsData[0]?.urlToImage) {
                    thumbnail = newsData[0].urlToImage;
                } else if (newsData[0]?.title) {
                    // Fallback: search image from unsplash
                    const imgRes = await axios.get(`https://source.unsplash.com/800x400/?${encodeURIComponent(query)},news`, { timeout: 3000 });
                    thumbnail = imgRes.request.res.responseUrl;
                }
            } catch { thumbnail = null; }

            // =========================
            // 4. TENGENEZA CAPTION
            // =========================
            let caption = `${current.prefix} *${query.toUpperCase()}* [${source}]\n\n`;

            newsData.slice(0, 5).forEach((article, i) => {
                caption += `*${i + 1}. ${article.title}*\n`;
                caption += `📅 ${article.publishedAt || 'Today'}\n`;
                caption += `📝 ${article.description?.slice(0, 120) || article.summary?.slice(0, 120)}...\n`;
                if (article.url) caption += `🔗 ${article.url}\n`;
                caption += `\n`;
            });

            caption += `_Powered by VEX AI_`;

            // =========================
            // 5. TUMA NA THUMBNAIL AU TEXT TU
            // =========================
            if (thumbnail) {
                await sock.sendMessage(m.chat, {
                    image: { url: thumbnail },
                    caption: caption.slice(0, 4000)
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.chat, { text: caption.slice(0, 4000) }, { quoted: m });
            }

        } catch (err) {
            console.log("NEWS CRITICAL ERROR:", err.message);
            await sock.sendMessage(m.chat, {
                text: `${current.prefix} News temporarily unavailable. Try:.news TZ`
            }, { quoted: m });
        }
    }
};

// =========================
// NEWS API - FREE 100/DAY
// =========================
async function getNewsAPI(query) {
    try {
        if (!ENV.NEWS_API_KEY) throw 'No NEWS_API_KEY';

        const countryMap = {
            'tz': 'tz', 'tanzania': 'tz',
            'ke': 'ke', 'kenya': 'ke',
            'ug': 'ug', 'uganda': 'ug',
            'us': 'us', 'usa': 'us',
            'uk': 'gb', 'britain': 'gb'
        };

        const isCountry = countryMap[query.toLowerCase()];
        const url = isCountry
           ? `https://newsapi.org/v2/top-headlines?country=${isCountry}&apiKey=${ENV.NEWS_API_KEY}`
            : `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=en&apiKey=${ENV.NEWS_API_KEY}`;

        const res = await axios.get(url, { timeout: 5000 });

        if (!res.data.articles || res.data.articles.length === 0) throw 'No articles';

        return res.data.articles.map(a => ({
            title: a.title,
            description: a.description,
            url: a.url,
            urlToImage: a.urlToImage,
            publishedAt: new Date(a.publishedAt).toLocaleDateString()
        }));
    } catch (e) {
        throw e;
    }
}

// =========================
// PARSE AI TEXT TO NEWS FORMAT
// =========================
function parseAIToNews(aiText) {
    try {
        const lines = aiText.split('\n').filter(l => l.trim());
        const articles = [];
        let current = {};

        lines.forEach(line => {
            if (line.includes('📰') || line.match(/^\d+\./)) {
                if (current.title) articles.push(current);
                current = { title: line.replace(/📰|^\d+\.\s*/, '').trim() };
            } else if (line.includes('📅')) {
                current.publishedAt = line.replace(/📅/, '').trim();
            } else if (line.includes('📝') || line.length > 30) {
                current.description = (current.description || '') + line.replace(/📝/, '').trim();
            }
        });
        if (current.title) articles.push(current);
        return articles.length > 0? articles : [{ title: 'Latest News', description: aiText.slice(0, 200) }];
    } catch {
        return [{ title: 'Breaking News', description: aiText.slice(0, 200) }];
    }
}

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
    throw new Error('All AI models failed');
}

async function callGroq(prompt) {
    if (!ENV.GROQ_API_KEY) throw 'No key';
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'system', content: 'You are VEX AI News Reporter. Factual, recent, simple reading.' }, { role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.3
    }, { headers: { 'Authorization': `Bearer ${ENV.GROQ_API_KEY}` }, timeout: 5000 });
    return res.data.choices[0].message.content.trim();
}

async function callCerebras(prompt) {
    if (!ENV.CEREBRAS_API_KEY) throw 'No key';
    const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
        model: 'llama3.1-8b',
        messages: [{ role: 'system', content: 'You are VEX AI News.' }, { role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.3
    }, { headers: { 'Authorization': `Bearer ${ENV.CEREBRAS_API_KEY}` }, timeout: 5000 });
    return res.data.choices[0].message.content.trim();
}

async function callSambaNova(prompt) {
    if (!ENV.SAMBANOVA_API_KEY) throw 'No key';
    const res = await axios.post('https://api.sambanova.ai/v1/chat/completions', {
        model: 'Meta-Llama-3.1-8B-Instruct',
        messages: [{ role: 'system', content: 'You are VEX AI News.' }, { role: 'user', content: prompt }],
        max_tokens: 600
    }, { headers: { 'Authorization': `Bearer ${ENV.SAMBANOVA_API_KEY}` }, timeout: 5000 });
    return res.data.choices[0].message.content.trim();
}

async function callGemini(prompt) {
    if (!ENV.GEMINI_API_KEY) throw 'No key';
    const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: `You are VEX AI News Reporter. ${prompt}` }] }]
    }, { timeout: 5000 });
    return res.data.candidates[0].content.parts[0].text.trim();
}

async function callOpenRouter(prompt) {
    if (!ENV.OPENROUTER_API_KEY) throw 'No key';
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'system', content: 'You are VEX AI News.' }, { role: 'user', content: prompt }],
        max_tokens: 600
    }, { headers: { 'Authorization': `Bearer ${ENV.OPENROUTER_API_KEY}` }, timeout: 5000 });
    return res.data.choices[0].message.content.trim();
}

async function callCloudflare(prompt) {
    if (!ENV.CLOUDFLARE_API_KEY ||!ENV.CLOUDFLARE_ACCOUNT_ID) throw 'No key';
    const res = await axios.post(`https://api.cloudflare.com/client/v4/accounts/${ENV.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
        messages: [{ role: 'system', content: 'You are VEX AI News.' }, { role: 'user', content: prompt }]
    }, { headers: { 'Authorization': `Bearer ${ENV.CLOUDFLARE_API_KEY}` }, timeout: 5000 });
    return res.data.result.response.trim();
}

// =========================
// LANGUAGE DETECTION
// =========================
function detectLang(m, text = '') {
    const content = text || m.body || m.message?.conversation || '';
    if (/[\u0B80-\u0BFF]/.test(content)) return 'Tamil';
    if (/[\u0C00-\u0C7F]/.test(content)) return 'Telugu';
    if (/[\u0900-\u097F]/.test(content)) return 'Hindi';
    if (/[ء-ي]/.test(content)) return 'Arabic';
    if (/\b(ya|na|wa|za|ni|kwa|hii|hiyo|vipi|gani|nini|habari|taarifa|tanzania)\b/i.test(content)) return 'Swahili';
    if (/[àáâãäåæçèéêëìíîïñòóôõöùúûüý]/.test(content)) return 'Spanish';
    if (/[àâçéèêëîïôûùüÿ]/.test(content)) return 'French';
    if (/[äöüß]/.test(content)) return 'German';
    if (/[а-яА-Я]/.test(content)) return 'Russian';
    if (/[你我他]/.test(content)) return 'Chinese';
    if (/[あ-ん]/.test(content)) return 'Japanese';
    return 'English';
}

setInterval(() => { aiCallCount = {}; }, 86400000);
