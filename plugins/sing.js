const axios = require("axios");
const fs = require("fs");
const path = require("path");

const ENV = {
    MUREKA_API_KEY: process.env.MUREKA_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SAMBANOVA_API_KEY: process.env.SAMBANOVA_API_KEY,
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    CLOUDFLARE_API_KEY: process.env.CLOUDFLARE_API_KEY,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    BOT_NAME: process.env.BOT_NAME || 'VEX AI'
};

let aiCallCount = {};

module.exports = {
    command: "sing",
    alias: ["tunga", "music", "ngoma", "muziki", "wimbo"],
    category: "ai",
    description: "VEX AI Music Studio - Generate full songs with AI lyrics + vocals in 2 minutes",

    async execute(m, sock, { args }) {
        const query = args.join(" ").trim();

        if (!query) {
            return m.reply(`🎵 *VEX AI MUSIC STUDIO*\n\n➤.song bongo flava kuhusu mapenzi\n➤.song amapiano party vibes\n➤.song taarab lyrics: nakupenda\n➤.song singeli beat\n\n*Styles:* bongo flava, afrobeat, amapiano, taarab, singeli, gospel, hiphop\n*Speed:* 1-2 minutes\n*Free:* 10 songs/month\n\n*Powered by ${ENV.BOT_NAME}*`);
        }

        if (!ENV.MUREKA_API_KEY) {
            return m.reply(`❌ *MUREKA_API_KEY_MISSING*\n\nRender ENV: MUREKA_API_KEY=op_if********2odk8u0kubb\n\nGet key: https://platform.mureka.ai`);
        }

        await sock.sendMessage(m.chat, { react: { text: "🎵", key: m.key } });
        const processing = await m.reply(`⚡ *VEX AI STUDIO*\n\n🎼 Request: ${query}\n🤖 Step 1/3: Creating...\n⏳ ETA: 90 seconds`);

        let tempFilePath = null;

        try {
            // =========================
            // 1. STYLE + LYRICS
            // =========================
            const styleKeywords = ['bongo flava', 'afrobeat', 'amapiano', 'taarab', 'singeli', 'gospel', 'hiphop', 'arabic', 'pop', 'rock'];
            let detectedStyle = styleKeywords.find(s => query.toLowerCase().includes(s)) || 'afrobeat';

            let lyrics = '';
            const lyricsMatch = query.match(/lyrics:\s*(.+)/i);

            if (lyricsMatch) {
                lyrics = lyricsMatch[1].trim().slice(0, 700);
            } else {
                const lyricsPrompt = `Write short Swahili song lyrics for: "${query}". Style: ${detectedStyle}. Structure: [Verse] [Chorus] [Verse] [Chorus]. Max 10 lines. ONLY lyrics:`;

                try {
                    lyrics = await callAI(lyricsPrompt, 300);
                    lyrics = lyrics.slice(0, 700);
                } catch {
                    lyrics = `[Verse]\nNaimba kuhusu ${query}\n[Verse]\nMoyo wangu\n[Chorus]\n${query}`;
                }
            }

            // =========================
            // 2. MUREKA API - CORRECT ENDPOINT
            // =========================
            const murekaRes = await axios.post('https://api.mureka.ai/v1/music/generate', {
                prompt: `${detectedStyle} song about ${query}`,
                lyrics: lyrics,
                model: "mureka-6",
                stream: false
            }, {
                headers: {
                    'Authorization': `Bearer ${ENV.MUREKA_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            const taskId = murekaRes.data.task_id || murekaRes.data.id;
            if (!taskId) throw new Error('MUREKA_400_NO_TASK_ID: API did not return task ID');

            await sock.sendMessage(m.chat, {
                edit: processing.key,
                text: `⚡ *VEX AI STUDIO*\n\n🎼 Style: ${detectedStyle}\n🎸 Step 2/3: Rendering vocals...\n⏳ Progress: 70%`
            });

            // =========================
            // 3. POLL - 90 SECONDS MAX
            // =========================
            let songUrl = null;
            let attempts = 0;
            const maxAttempts = 18; // 18 x 5s = 90s

            while (attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, 5000));

                const statusRes = await axios.get(`https://api.mureka.ai/v1/music/${taskId}`, {
                    headers: { 'Authorization': `Bearer ${ENV.MUREKA_API_KEY}` },
                    timeout: 10000
                });

                const data = statusRes.data;

                if (data.status === 'completed' || data.status === 'succeeded') {
                    songUrl = data.audio_url || data.url || data.download_url;
                    break;
                } else if (data.status === 'failed') {
                    throw new Error(`MUREKA_400_FAILED: ${data.error || 'Generation failed'}`);
                }

                attempts++;
            }

            if (!songUrl) throw new Error('MUREKA_TIMEOUT: Song took >90 seconds');

            // =========================
            // 4. DOWNLOAD + SEND + DELETE
            // =========================
            await sock.sendMessage(m.chat, {
                edit: processing.key,
                text: `⚡ *VEX AI STUDIO*\n\n✅ Song ready ✓\n📥 Step 3/3: Downloading...\n⏳ Final...`
            });

            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            tempFilePath = path.join(tempDir, `vex-${Date.now()}.mp3`);

            const audioRes = await axios.get(songUrl, { responseType: 'stream', timeout: 60000 });
            const writer = fs.createWriteStream(tempFilePath);
            audioRes.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const stats = fs.statSync(tempFilePath);
            await sock.sendMessage(m.chat, {
                audio: fs.readFileSync(tempFilePath),
                mimetype: 'audio/mpeg',
                fileName: `VEX-${detectedStyle}.mp3`,
                caption: `✅ *VEX AI SONG COMPLETE*\n\n🎵 *Style:* ${detectedStyle}\n⏱️ *Duration:* ~60s\n📦 *Size:* ${(stats.size / 1024 / 1024).toFixed(2)} MB\n\n*Made by Lupin Starnley in Tanzania ©2026*\n*Powered by ${ENV.BOT_NAME}*`
            }, { quoted: m });

            fs.unlinkSync(tempFilePath);
            await sock.sendMessage(m.chat, { delete: processing.key });

        } catch (err) {
            if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

            console.log("MUREKA ERROR:", err.response?.data || err.message);

            let errorMsg = `❌ *VEX AI MUSIC ERROR*\n\n`;

            if (err.response?.status === 400) {
                errorMsg += `MUREKA_400_BAD_REQUEST: ${JSON.stringify(err.response.data)}\n\n*Cause:* Invalid params or lyrics too long\n*Fix:* Try shorter prompt`;
            } else if (err.response?.status === 401) {
                errorMsg += `MUREKA_401_UNAUTHORIZED: API key invalid\n\nCheck: MUREKA_API_KEY=op_if********2odk8u0kubb`;
            } else if (err.response?.status === 402 || err.response?.status === 429) {
                errorMsg += `MUREKA_402_NO_CREDITS: Monthly limit reached\n\nFree: 10 songs/month\nResets: 1st of month`;
            } else if (err.message.includes('TIMEOUT')) {
                errorMsg += `MUREKA_TIMEOUT: >90 seconds\n\nTry:.song simple ${query.split(' ')[0]}`;
            } else {
                errorMsg += `${err.message}\n\n*Full error logged*`;
            }

            await m.reply(errorMsg);
        }
    }
};

// =========================
// AI FALLBACK FOR LYRICS
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
