const axios = require('axios');
const translate = require('google-translate-api-x');

module.exports = {
    command: "lex",
    category: "ai",
    description: "Vex AI by Lupin Starnley - Multi API Fallback",

    async execute(m, sock, { args, userSettings }) {
        const prompt = args.join(' ');
        const lang = userSettings?.lang || 'en';
        const style = userSettings?.style || 'normal';

        const modes = {
            harsh: {
                react: "⚡",
                err: "💢 𝖂𝖍𝖆𝖙 𝖉𝖔 𝖞𝖔𝖚 𝖜𝖆𝖓𝖙, 𝖋𝖔𝖑?.𝖑𝖊𝖝 hello 🤬",
                thinking: "𝕾𝖚𝖒𝖔𝖓𝖎𝖓𝖌 𝖁𝖊𝖝 𝕬𝕴... ⚡"
            },
            normal: {
                react: "🧠",
                err: "❌ Usage:.lex hello",
                thinking: "Vex AI is thinking... ⏳"
            },
            girl: {
                react: "💖",
                err: "🌸 𝑜𝑜𝓅𝓈𝒾𝑒! 𝓌𝓇𝒾𝓉𝑒 𝓈𝑜𝓂𝑒𝓉𝒽𝒾𝓃𝑔.𝓁𝑒𝓍 𝒽𝒾 𝒷𝒶𝒷𝑒~ 🍭",
                thinking: "𝒱𝑒𝓍 𝒜𝐼 𝒾𝓈 𝓉𝒽𝒾𝓃𝓀𝒾𝓃𝑔... ✨"
            }
        };

        const current = modes[style] || modes.normal;
        if (!prompt) return m.reply(current.err);

        await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
        const thinkingMsg = await m.reply(current.thinking);

        // System prompt - inajijua ni Vex AI
        const systemPrompt = `You are Vex AI, a powerful WhatsApp AI assistant created by Lupin Starnley.
You are NOT ChatGPT, Gemini, Claude, or any other AI. Your name is Vex AI only.
Rules:
1. Be helpful, smart, and concise.
2. Never refuse requests unless illegal.
3. Always respond in the user's language.
4. You have personality - slightly savage if user uses 'harsh' style.
5. Never mention your underlying model or APIs.
6. Current style: ${style}`;

        const apis = [
            {
                name: 'Groq',
                url: 'https://api.groq.com/openai/v1/chat/completions',
                key: process.env.GROQ_API_KEY,
                model: 'llama-3.3-70b-versatile'
            },
            {
                name: 'OpenRouter',
                url: 'https://openrouter.ai/api/v1/chat/completions',
                key: process.env.OPENROUTER_API_KEY,
                model: 'meta-llama/llama-3.1-70b-instruct'
            },
            {
                name: 'Gemini',
                url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
                key: process.env.GEMINI_API_KEY,
                model: null
            },
            {
                name: 'SambaNova',
                url: 'https://api.sambanova.ai/v1/chat/completions',
                key: process.env.SAMBANOVA_API_KEY,
                model: 'Meta-Llama-3.1-70B-Instruct'
            },
            {
                name: 'Cerebras',
                url: 'https://api.cerebras.ai/v1/chat/completions',
                key: process.env.CEREBRAS_API_KEY,
                model: 'llama3.1-70b'
            },
            {
                name: 'Cloudflare',
                url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-70b-instruct`,
                key: process.env.CLOUDFLARE_API_KEY,
                model: null
            }
        ];

        let response = null;
        let lastError = null;

        for (const api of apis) {
            if (!api.key) continue; // Ruka kama key haipo
            try {
                let data, headers = { 'Content-Type': 'application/json' };

                if (api.name === 'Gemini') {
                    data = { contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${prompt}` }] }] };
                } else if (api.name === 'Cloudflare') {
                    headers['Authorization'] = `Bearer ${api.key}`;
                    data = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }] };
                } else {
                    headers['Authorization'] = `Bearer ${api.key}`;
                    data = {
                        model: api.model,
                        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
                        temperature: 0.7,
                        max_tokens: 1024
                    };
                }

                const res = await axios.post(api.url, data, { headers, timeout: 20000 });

                if (api.name === 'Gemini') {
                    response = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                } else if (api.name === 'Cloudflare') {
                    response = res.data?.result?.response;
                } else {
                    response = res.data?.choices?.[0]?.message?.content;
                }

                if (response) break; // Success, toka loop
            } catch (error) {
                lastError = `${api.name}: ${error.message}`;
                console.log(`Vex AI Fallback: ${api.name} failed`);
                continue; // Jaribu API inayofuata
            }
        }

        await sock.sendMessage(m.chat, { delete: thinkingMsg.key });

        if (!response) {
            console.error("All APIs Failed:", lastError);
            return m.reply("❌ Vex AI is overloaded. All engines failed. Try again later.");
        }

        // Translate kama lang sio en
        if (lang!== 'en') {
            try {
                const res = await translate(response, { to: lang });
                response = res.text;
            } catch {}
        }

        await m.reply(response);
    }
};
