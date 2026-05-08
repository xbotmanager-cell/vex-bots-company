const axios = require('axios');
const translate = require('google-translate-api-x');
const { createClient } = require('@supabase/supabase-js');

// --- SUPABASE INITIALIZATION ---
let supabase = null;
let supabaseStatus = "Online";

try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROY_KEY) {
        supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROY_KEY);
    } else {
        supabaseStatus = "Offline (Missing ENV)";
    }
} catch (e) {
    supabaseStatus = "Offline (Init Error)";
    console.error("Supabase fail to start:", e.message);
}

module.exports = {
    command: "lex",
    category: "ai",
    description: "Vex AI Chat - Pure AI Experience",

    async execute(m, sock, { args, userSettings, user }) {
        let text = args.join(' ');
        const lang = userSettings?.lang || 'en';
        const style = userSettings?.style || 'normal';
        const userId = user?.id || m.sender;

        // --- HANDLING QUOTED MESSAGE (REPLY) ---
        const quotedText = m.quoted ? (m.quoted.text || m.quoted.caption || "") : "";
        if (quotedText && !text) {
            text = quotedText; // Kama amereply tu bila kuandika neno
        } else if (quotedText && text) {
            text = `Context from previous message: "${quotedText}"\n\nUser's new request: ${text}`;
        }

        const modes = {
            harsh: { react: "⚡", err: "💢 𝖂𝖍𝖆𝖙 𝖉𝖔 𝖞𝖔𝖚 𝖜𝖆𝖓𝖙, 𝖋𝖔𝖑?.𝖑𝖊𝖝 hello 🤬" },
            normal: { react: "🧠", err: "❌ Usage: .lex hello" },
            girl: { react: "💖", err: "🌸 𝑜𝑜𝓅𝓈𝒾𝑒! 𝓌𝓇𝒾𝓉𝑒 𝓈𝑜𝓂𝑒𝓉𝒽𝒾𝓃𝑔.𝓁𝑒𝓍 𝒽𝒾 𝒷𝒶𝒷𝑒~ 🍭" }
        };

        const current = modes[style] || modes.normal;
        if (!text) return m.reply(current.err);

        // 1. Send Reaction
        await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

        const systemPrompt = `You are Vex AI, a smart assistant created by Lupin Starnley. 
        You are currently in CHAT mode. Focus on being helpful, witty, and engaging.
        Style: ${style}. 
        User Info: ${user?.name || 'Friend'}.`;

        try {
            // 2. Call AI
            let response = await callAI(text, systemPrompt);

            // 3. Translation
            if (lang !== 'en' && response) {
                try {
                    const res = await translate(response, { to: lang });
                    response = res.text;
                } catch (err) {}
            }

            // 4. Save to History (vc_chat_history)
            if (supabase) {
                try {
                    await supabase.from('vc_chat_history').insert({
                        user_id: userId,
                        chat_id: m.chat,
                        user_message: text.slice(0, 500),
                        vex_response: response?.slice(0, 3000),
                        command_type: 'chat'
                    });
                } catch (he) {}
            }

            // 5. Final Reply
            if (supabaseStatus !== "Online" && response) {
                response += "\n\n⚠️ *Database imekaa vibaya kaka, ila nimejibu.*";
            }

            await m.reply(response || "❌ Vex AI imekwama kidogo.");

        } catch (e) {
            console.error("Lex Chat Error:", e);
            await m.reply(`❌ Error: ${e.message}`);
        }
    }
};

async function callAI(prompt, systemPrompt) {
    const apis = [
        { name: 'Groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' },
        { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1/chat/completions', key: process.env.OPENROUTER_API_KEY, model: 'meta-llama/llama-3.1-70b-instruct' },
        { name: 'Gemini', url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, key: process.env.GEMINI_API_KEY, model: null },
        { name: 'SambaNova', url: 'https://api.sambanova.ai/v1/chat/completions', key: process.env.SAMBANOVA_API_KEY, model: 'Meta-Llama-3.1-70B-Instruct' },
        { name: 'Cerebras', url: 'https://api.cerebras.ai/v1/chat/completions', key: process.env.CEREBRAS_API_KEY, model: 'llama3.1-70b' },
        { name: 'Cloudflare', url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-70b-instruct`, key: process.env.CLOUDFLARE_API_KEY, model: null }
    ];

    for (const api of apis) {
        if (!api.key) continue;
        try {
            let data, headers = { 'Content-Type': 'application/json' };
            if (api.name === 'Gemini') {
                data = { contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${prompt}` }] }] };
            } else if (api.name === 'Cloudflare') {
                headers['Authorization'] = `Bearer ${api.key}`;
                data = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }] };
            } else {
                headers['Authorization'] = `Bearer ${api.key}`;
                data = { model: api.model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], temperature: 0.7 };
            }
            const res = await axios.post(api.url, data, { headers, timeout: 20000 });
            if (api.name === 'Gemini') return res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (api.name === 'Cloudflare') return res.data?.result?.response;
            return res.data?.choices?.[0]?.message?.content;
        } catch (e) {
            console.log(`Vex AI Fallback: ${api.name} failed`);
            continue;
        }
    }
    return null;
}
