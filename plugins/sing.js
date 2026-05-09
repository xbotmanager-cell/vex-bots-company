const axios = require("axios");
const fs = require("fs");
const path = require("path");

// =========================
// ENV
// =========================
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
    description: "VEX AI Music Studio - Generate full songs with AI lyrics + vocals in 3 minutes",

    async execute(m, sock, { args }) {
        const query = args.join(" ").trim();
        const userId = m.sender;

        if (!query) {
            return m.reply(`🎵 *VEX AI MUSIC STUDIO - FREE*\n\n➤.song bongo flava kuhusu mapenzi\n➤.song amapiano party vibes\n➤.song taarab lyrics: nakupenda mpenzi\n➤.song singeli hardcore beat\n➤.song gospel worship\n\n*Styles:* bongo flava, afrobeat, amapiano, taarab, singeli, gospel, hiphop, arabic\n*Features:* AI Lyrics + Vocals + Instruments\n*Speed:* 1-3 minutes\n*Limit:* 10 songs/month free\n\n*Powered by ${ENV.BOT_NAME}*`);
        }

        if (!ENV.MUREKA_API_KEY) {
            return m.reply(`❌ *MUREKA_API_KEY_MISSING*\n\nGet free key: https://platform.mureka.ai\nRender ENV: MUREKA_API_KEY=mk-xxx\n\nFree tier: 100 credits/month = 10 songs`);
        }

        await sock.sendMessage(m.chat, { react: { text: "🎵", key: m.key } });
        const processing = await m.reply(`⚡ *VEX AI STUDIO ACTIVATED*\n\n🎼 Request: ${query}\n🤖 Step 1/4: Generating lyrics...\n⏳ ETA: 2-3 minutes\n\n*Please wait...*`);

        let tempFilePath = null;

        try {
            // =========================
            // 1. EXTRACT STYLE + GENERATE LYRICS WITH AI
            // =========================
            const styleKeywords = ['bongo flava', 'afrobeat', 'amapiano', 'taarab', 'singeli', 'gospel', 'hiphop', 'arabic', 'pop', 'rock'];
            let detectedStyle = styleKeywords.find(s => query.toLowerCase().includes(s)) || 'afrobeat';

            // Check if user provided lyrics
            let lyrics = '';
            const lyricsMatch = query.match(/lyrics:\s*(.+)/i);

            if (lyricsMatch) {
                lyrics = lyricsMatch[1].trim();
                await sock.sendMessage(m.chat, {
                    edit: processing.key,
                    text: `⚡ *VEX AI STUDIO*\n\n🎼 Request: ${query}\n🤖 Step 1/4: Using your lyrics ✓\n🎸 Step 2/4: Generating music...\n⏳ ETA: 2 minutes`
                });
            } else {
                // AI Generate Lyrics
                const lyricsPrompt = `You are VEX AI Music Lyricist. Write song lyrics in Swahili/English mix for: "${query}"

RULES BY FORCE:
1. Style: ${detectedStyle}
2. Language: Swahili + English mix like real ${detectedStyle} songs
3. Structure: [Verse 1] [Chorus] [Verse 2] [Chorus] [Bridge] [Chorus]
4. Theme: ${query}
5. NO explanation, ONLY lyrics with structure tags
6. Make it catchy, emotional, radio-ready
7. 16-24 lines total

Generate lyrics NOW:`;

                try {
                    lyrics = await callAI(lyricsPrompt, 1000);
                    if (!lyrics.includes('[')) {
                        lyrics = `[Verse 1]\n${lyrics}\n[Chorus]\n${query} eh\n${query} oh\nTwende pamoja`;
                    }
                } catch (aiErr) {
                    // Fallback lyrics if AI fails
                    lyrics = `[Verse 1]\nNaimba wimbo kuhusu ${query}\nMoyo wangu unasema\n[Chorus]\n${query}\nTwende pamoja\n[Verse 2]\nMaisha ni mazuri\nTukicheza pamoja\n[Chorus]\n${query}`;
                }

                await sock.sendMessage(m.chat, {
                    edit: processing.key,
                    text: `⚡ *VEX AI STUDIO*\n\n🎼 Request: ${query}\n🤖 Step 1/4: Lyrics generated ✓\n🎸 Step 2/4: Creating music...\n⏳ ETA: 2 minutes`
                });
            }

            // =========================
            // 2. GENERATE MUSIC WITH MUREKA
            // =========================
            const murekaRes = await axios.post('https://api.mureka.ai/v1/song/generate', {
                lyrics: lyrics,
                model: "mureka-v6",
                prompt: `${detectedStyle}, ${query}, high quality, studio vocals, instruments`,
                duration: 95 // 95 seconds = 1.5min for free tier
            }, {
                headers: {
                    'Authorization': `Bearer ${ENV.MUREKA_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            const songId = murekaRes.data.id;
            if (!songId) throw new Error('MUREKA_GENERATION_FAILED: No song ID returned');

            await sock.sendMessage(m.chat, {
                edit: processing.key,
                text: `⚡ *VEX AI STUDIO*\n\n🎼 Request: ${query}\n🤖 Step 1/4: Lyrics ready ✓\n🎸 Step 2/4: Music generated ✓\n🎤 Step 3/4: Rendering vocals...\n⏳ Progress: 60%`
            });

            // =========================
            // 3. POLL FOR COMPLETION - 3 MIN MAX
            // =========================
            let songUrl = null;
            let attempts = 0;
            const maxAttempts = 36; // 36 x 5s = 3 minutes

            while (attempts < maxAttempts) {
                await new Promise(r => setTimeout(r, 5000));

                const statusRes = await axios.get(`https://api.mureka.ai/v1/song/${songId}`, {
                    headers: { 'Authorization': `Bearer ${ENV.MUREKA_API_KEY}` }
                });

                const status = statusRes.data.status;

                if (status === 'succeeded') {
                    songUrl = statusRes.data.audio_url || statusRes.data.url;
                    break;
                } else if (status === 'failed') {
                    throw new Error(`MUREKA_GENERATION_FAILED: ${statusRes.data.error || 'Unknown error'}`);
                }

                attempts++;
                if (attempts % 6 === 0) {
                    await sock.sendMessage(m.chat, {
                        edit: processing.key,
                        text: `⚡ *VEX AI STUDIO*\n\n🎼 Request: ${query}\n🎤 Step 3/4: Rendering...\n⏳ Progress: ${Math.round(60 + (attempts/maxAttempts)*30)}%\n\n*Almost done...*`
                    });
                }
            }

            if (!songUrl) throw new Error('MUREKA_TIMEOUT: Song took >3 minutes. Try shorter prompt.');

            // =========================
            // 4. DOWNLOAD + SEND + DELETE
            // =========================
            await sock.sendMessage(m.chat, {
                edit: processing.key,
                text: `⚡ *VEX AI STUDIO*\n\n🎼 Request: ${query}\n✅ Step 3/4: Song ready ✓\n📥 Step 4/4: Downloading...\n⏳ Final step...`
            });

            // Download file
            const tempDir = path.join(__dirname, '../temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            tempFilePath = path.join(tempDir, `vex-song-${Date.now()}.mp3`);

            const audioRes = await axios.get(songUrl, {
                responseType: 'stream',
                timeout: 60000
            });

            const writer = fs.createWriteStream(tempFilePath);
            audioRes.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // Send audio
            const stats = fs.statSync(tempFilePath);
            await sock.sendMessage(m.chat, {
                audio: fs.readFileSync(tempFilePath),
                mimetype: 'audio/mpeg',
                fileName: `VEX-AI-${query.slice(0, 30)}.mp3`,
                caption: `✅ *VEX AI SONG COMPLETE*\n\n🎵 *Style:* ${detectedStyle}\n📝 *Lyrics:* AI Generated\n⏱️ *Duration:* ${Math.round(stats.size / 16000)}s\n📦 *Size:* ${(stats.size / 1024 / 1024).toFixed(2)} MB\n\n*Made by Lupin Starnley in Tanzania ©2026*\n*Powered by ${ENV.BOT_NAME}*`
            }, { quoted: m });

            // Delete temp file
            fs.unlinkSync(tempFilePath);
            tempFilePath = null;

            await sock.sendMessage(m.chat, { delete: processing.key });

        } catch (err) {
            // Cleanup temp file if exists
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }

            console.log("SONG GEN ERROR:", err.response?.data || err.message);

            let errorMsg = `❌ *VEX AI MUSIC ERROR*\n\n`;

            if (err.message.includes('401') || err.message.includes('MUREKA_API_KEY')) {
                errorMsg += `MUREKA_401_UNAUTHORIZED: API key invalid\n\nGet free key: https://platform.mureka.ai\nFree: 100 credits/month`;
            } else if (err.message.includes('402') || err.message.includes('403')) {
                errorMsg += `MUREKA_402_NO_CREDITS: Monthly limit reached\n\nFree tier: 10 songs/month\nResets: 1st of month`;
            } else if (err.message.includes('TIMEOUT')) {
                errorMsg += `MUREKA_TIMEOUT: Generation >3min\n\nTry:.song simple ${query.split(' ')[0]} beat`;
            } else if (err.message.includes('AI_GENERATION_FAILED')) {
                errorMsg += `AI_LYRICS_FAILED: All 6 AI models failed\n\nTry:.song ${query} lyrics: your lyrics here`;
            } else {
                errorMsg += `${err.message}\n\n*Retry:*.song ${query}`;
            }

            await m.reply(errorMsg);
        }
    }
};

// =========================
// AI FALLBACK CHAIN - FOR LYRICS
// =========================
async function callAI(prompt, maxTokens = 1000) {
    const models = [
        { name: 'GROQ', fn: callGroq },
        { name: 'GEMINI', fn: callGemini },
        { name: 'OPENROUTER', fn: callOpenRouter },
        { name: 'CEREBRAS', fn: callCerebras },
        { name: 'SAMBANOVA', fn: callSambaNova },
        { name: 'CLOUDFLARE', fn: callCloudflare }
    ];

    let errors = [];

    for (const model of models) {
        try {
            if (aiCallCount[model.name] >= 500) continue;

            const result = await Promise.race([
                model.fn(prompt, maxTokens),
                new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT_10S')), 10000))
            ]);

            aiCallCount[model.name] = (aiCallCount[model.name] || 0) + 1;

            if (result && result.length > 20) {
                return result;
            }
        } catch (e) {
            errors.push(`${model.name}: ${e.message}`);
            continue;
        }
    }

    throw new Error(`AI_GENERATION_FAILED: ${errors.join(' | ')}`);
}

async function callGroq(prompt, maxTokens) {
    if (!ENV.GROQ_API_KEY) throw new Error('GROQ_API_KEY missing');
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.9
    }, {
        headers: { 'Authorization': `Bearer ${ENV.GROQ_API_KEY}` },
        timeout: 15000
    });
    return res.data.choices[0].message.content.trim();
}

async function callGemini(prompt, maxTokens) {
    if (!ENV.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
    const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.9 }
    }, { timeout: 15000 });
    return res.data.candidates[0].content.parts[0].text.trim();
}

async function callOpenRouter(prompt, maxTokens) {
    if (!ENV.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY missing');
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
    }, {
        headers: { 'Authorization': `Bearer ${ENV.OPENROUTER_API_KEY}` },
        timeout: 15000
    });
    return res.data.choices[0].message.content.trim();
}

async function callCerebras(prompt, maxTokens) {
    if (!ENV.CEREBRAS_API_KEY) throw new Error('CEREBRAS_API_KEY missing');
    const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
        model: 'llama3.1-8b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.9
    }, {
        headers: { 'Authorization': `Bearer ${ENV.CEREBRAS_API_KEY}` },
        timeout: 15000
    });
    return res.data.choices[0].message.content.trim();
}

async function callSambaNova(prompt, maxTokens) {
    if (!ENV.SAMBANOVA_API_KEY) throw new Error('SAMBANOVA_API_KEY missing');
    const res = await axios.post('https://api.sambanova.ai/v1/chat/completions', {
        model: 'Meta-Llama-3.1-8B-Instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
    }, {
        headers: { 'Authorization': `Bearer ${ENV.SAMBANOVA_API_KEY}` },
        timeout: 15000
    });
    return res.data.choices[0].message.content.trim();
}

async function callCloudflare(prompt, maxTokens) {
    if (!ENV.CLOUDFLARE_API_KEY ||!ENV.CLOUDFLARE_ACCOUNT_ID) throw new Error('CLOUDFLARE credentials missing');
    const res = await axios.post(`https://api.cloudflare.com/client/v4/accounts/${ENV.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
    }, {
        headers: { 'Authorization': `Bearer ${ENV.CLOUDFLARE_API_KEY}` },
        timeout: 15000
    });
    return res.data.result.response.trim();
}

// Reset AI count daily
setInterval(() => { aiCallCount = {}; }, 86400000);
