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

// Local fallback quotes - RAM based, instant
const LOCAL_QUOTES = [
    { char: "Naruto Uzumaki", anime: "Naruto", quote: "I'm not gonna run away, I never go back on my word! That's my nindo: my ninja way!" },
    { char: "Monkey D. Luffy", anime: "One Piece", quote: "If you don't take risks, you can't create a future!" },
    { char: "Son Goku", anime: "Dragon Ball Z", quote: "I am the hope of the universe. I am the answer to all living things that cry out for peace." },
    { char: "Eren Yeager", anime: "Attack on Titan", quote: "If you win, you live. If you lose, you die. If you don't fight, you can't win!" },
    { char: "Light Yagami", anime: "Death Note", quote: "I am Justice! I protect the innocent and those who fear evil." },
    { char: "Levi Ackerman", anime: "Attack on Titan", quote: "Give up on your dreams and die." },
    { char: "Saitama", anime: "One Punch Man", quote: "I'm just a guy who's a hero for fun." },
    { char: "Itachi Uchiha", anime: "Naruto", quote: "People live their lives bound by what they accept as correct and true." },
    { char: "Zoro Roronoa", anime: "One Piece", quote: "When the world shoves you around, you just gotta stand up and shove back." },
    { char: "Edward Elric", anime: "Fullmetal Alchemist", quote: "A lesson without pain is meaningless." }
];

let aiCallCount = {};

module.exports = {
    command: "animequote",
    alias: ["aq", "quote", "aqoute"],
    category: "anime",
    description: "VEX AI AnimeQuote - God Mode with 6 AI fallback from Render + Local DB",

    async execute(m, sock, { userSettings, lang, prefix }) {
        const chatId = m.chat;
        const userId = m.sender;

        const usedPrefix = prefix || '.';
        const style = userSettings?.style || 'normal';
        const targetLang = lang || 'en';
        const wantAI = m.args[0]?.toLowerCase() === 'ai';
        const character = m.args.filter(a => a.toLowerCase()!== 'ai').join(' ');

        // Style templates - same structure as blackjack/song
        const modes = {
            harsh: {
                title: "☣️ 𝕍𝔼𝕏 ℍ𝔸ℝ𝕊ℍ ℚ𝕌𝕆𝕋𝔼 ☣️",
                line: "━",
                quest: "💀 𝕋𝕙𝕖 𝕕𝕒𝕣𝕜 𝕨𝕠𝕣𝕕𝕤 𝕠𝕗 𝕝𝕖𝕘𝕖𝕟𝕕𝕤:",
                hint: `⚙️ 𝕌𝕤𝕖 '${usedPrefix}𝕒𝕟𝕚𝕞𝕖𝕢𝕦𝕠𝕥𝕖 𝕒𝕚' 𝕗𝕠𝕣 𝔸𝕀`,
                react: "💀"
            },
            normal: {
                title: "⚡ VEX ANIME QUOTE ⚡",
                line: "─",
                quest: "🎭 Words from legends:",
                hint: `📝 Try '${usedPrefix}animequote ai' for AI generated`,
                react: "⚡"
            },
            girl: {
                title: "🫧 𝐕𝐄𝐗 𝐊𝐀𝐖𝐀𝐈 𝐐𝐔𝐎𝐓𝐄 🫧",
                line: "┄",
                quest: "🌸 𝓌𝑜𝓇𝒹𝓈 𝓉𝑜 𝒾𝓃𝓈𝓅𝒾𝓇𝑒 𝓎𝑜𝓊:",
                hint: `🫧 𝓊𝓈𝑒 '${usedPrefix}𝒶𝓃𝒾𝓂𝑒𝓆𝓊𝑜𝓉𝑒 𝒶𝒾' 𝒻𝑜𝓇 𝒜𝐼`,
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;
        await sock.sendMessage(chatId, { react: { text: current.react, key: m.key } });

        try {
            let quoteData = null;
            let source = 'LOCAL_DB';

            // =========================
            // 1. TRY AI FROM RENDER IF REQUESTED
            // =========================
            if (wantAI) {
                const aiPrompt = character
                   ? `Generate a deep, memorable anime quote in the style of ${character}. Return JSON: {"quote":"text","character":"${character}","anime":"anime name"}`
                    : `Generate a deep anime quote from any famous character. Return JSON: {"quote":"text","character":"name","anime":"anime name"}`;

                try {
                    const aiResult = await callAI(aiPrompt, 200);
                    const parsed = JSON.parse(aiResult.replace(/```json|```/g, '').trim());

                    if (parsed.quote && parsed.character && parsed.anime) {
                        quoteData = parsed;
                        source = 'VEX_AI_RENDER';
                    }
                } catch (aiErr) {
                    console.log("AI QUOTE FAILED:", aiErr.message);
                }
            }

            // =========================
            // 2. FALLBACK TO LOCAL DB
            // =========================
            if (!quoteData) {
                if (character) {
                    const found = LOCAL_QUOTES.find(q =>
                        q.char.toLowerCase().includes(character.toLowerCase()) ||
                        q.anime.toLowerCase().includes(character.toLowerCase())
                    );
                    quoteData = found || LOCAL_QUOTES[Math.floor(Math.random() * LOCAL_QUOTES.length)];
                } else {
                    quoteData = LOCAL_QUOTES[Math.floor(Math.random() * LOCAL_QUOTES.length)];
                }
                source = 'LOCAL_DB';
            }

            const renderCaption = () => {
                return `*${current.title}*\n${current.line.repeat(18)}\n${current.quest}\n\n💬 "${quoteData.quote}"\n\n👤 Character: ${quoteData.char}\n📺 Anime: ${quoteData.anime}\n🌐 Source: ${source}\n\n${current.line.repeat(18)}\n_${current.hint}_`;
            };

            const { text } = await translate(renderCaption(), { to: targetLang });

            await sock.sendMessage(chatId, {
                text: text,
                mentions: [userId]
            }, { quoted: m });

            await sock.sendMessage(chatId, { react: { text: '✅', key: m.key } });

        } catch (error) {
            console.error("ANIMEQUOTE GOD MODE ERROR:", error);

            // Emergency fallback - still sends quote
            const backupQuote = LOCAL_QUOTES[0];
            const emergencyMsg = `⚠️ *VEX QUOTE EMERGENCY* ⚠️\n\n☣️ All systems down\n\n💬 "${backupQuote.quote}"\n\n👤 ${backupQuote.char}\n📺 ${backupQuote.anime}\n🌐 Source: EMERGENCY_CACHE\n\nTry again: ${usedPrefix}animequote`;

            const { text } = await translate(emergencyMsg, { to: targetLang });
            await sock.sendMessage(chatId, { text });
            await sock.sendMessage(chatId, { react: { text: '⚠️', key: m.key } });
        }
    }
};

// =========================
// AI FALLBACK FOR QUOTES - SAME AS SONG.JS
// =========================
async function callAI(prompt, maxTokens = 200) {
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
            if (result && result.length > 15) return result;
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
        temperature: 0.9
    }, { headers: { 'Authorization': `Bearer ${ENV.GROQ_API_KEY}` }, timeout: 12000 });
    return res.data.choices[0].message.content.trim();
}

async function callGemini(prompt, maxTokens) {
    if (!ENV.GEMINI_API_KEY) throw new Error('NO_KEY');
    const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.9 }
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
        temperature: 0.9
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
