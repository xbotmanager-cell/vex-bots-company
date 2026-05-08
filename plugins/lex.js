const axios = require('axios');
const translate = require('google-translate-api-x');
const { createClient } = require('@supabase/supabase-js');

// --- SUPER SAFETY SUPABASE INITIALIZATION ---
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

// Helper: GitHub API
const gh = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Vex-AI-Agent'
    },
    timeout: 20000
});

// Helper: Render API
const renderApi = axios.create({
    baseURL: 'https://api.render.com/v1',
    headers: {
        'Authorization': `Bearer ${process.env.RENDER_API_KEY}`,
        'Accept': 'application/json'
    },
    timeout: 20000
});

function extractCode(text) {
    const match = text.match(/code:\s*([\s\S]+)/i);
    return match ? match[1].trim() : null;
}

async function getFileSha(path) {
    try {
        const { data } = await gh.get(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${path}`);
        return data.sha;
    } catch {
        return null;
    }
}

module.exports = {
    command: "lex",
    category: "ai",
    description: "Vex AI Super Agent by Lupin Starnley - Safe Edition",

    async execute(m, sock, { args, userSettings, user }) {
        const prompt = args.join(' ');
        const lang = userSettings?.lang || 'en';
        const style = userSettings?.style || 'normal';
        const userId = user?.id || m.sender;

        const modes = {
            harsh: { react: "⚡", err: "💢 𝖂𝖍𝖆𝖙 𝖉𝖔 𝖞𝖔𝖚 𝖜𝖆𝖓𝖙, 𝖋𝖔𝖑?.𝖑𝖊𝖝 hello 🤬" },
            normal: { react: "🧠", err: "❌ Usage:.lex hello" },
            girl: { react: "💖", err: "🌸 𝑜𝑜𝓅𝓈𝒾𝑒! 𝓌𝓇𝒾𝓉𝑒 𝓈𝑜𝓂𝑒𝓉𝒽𝒾𝓃𝑔.𝓁𝑒𝓍 𝒽𝒾 𝒷𝒶𝒷𝑒~ 🍭" }
        };

        const current = modes[style] || modes.normal;
        if (!prompt) return m.reply(current.err);

        await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
        await m.reply('⏳');

        // --- SAFE LOGGING WRAPPER ---
        const logAction = async (type, target, details, status = 'success', error = null) => {
            if (!supabase) return; // Bypass if DB is not initialized
            try {
                await supabase.from('vc_action_logs').insert({
                    user_id: userId,
                    action_type: type,
                    action_target: target,
                    action_details: details,
                    status,
                    error_message: error,
                    ram_warning: status === 'ram_warning'
                });
            } catch (e) {
                console.log("Supabase Logging Failed (Silently)");
            }
        };

        const systemPrompt = `You are Vex AI, a Super Agent WhatsApp bot created by Lupin Starnley.
DATABASE STATUS: ${supabaseStatus}. 
IMPORTANT: Ikiwa status sio "Online", mwishoni kabisa mwa jibu lako (kama ni jibu la maana) andika: "Database imekaa vibaya kaka, ila nimejibu."

RULES:
1. You have 3 brains: CHAT, AGENT, DEVOPS. Detect intent.
2. RAM: 512MB Render. Be concise.
3. If GitHub/Render fails, explain why.
4. Current style: ${style}. Lang: ${lang}.`;

        try {
            const isAgentQuery = /^(vex|server|restart|plugin|repo|github|file|tiktok|zip|download|andika|futa|logs)/i.test(prompt);
            let response = null;
            let commandType = 'chat';

            if (isAgentQuery) {
                commandType = 'agent';
                const agentPrompt = `User request: "${prompt}"\nReply ONLY JSON: {"action":"list_plugins|read_file|write_file|delete_file|render_status|render_restart|render_logs|chat","target":"path/or/id","reason":"short reason","warning":"ram warning if any"}`;
                
                const actionRes = await callAI(agentPrompt, 'You are Vex AI Agent Controller. Reply JSON only.');
                let action = {};
                try { action = JSON.parse(actionRes.replace(/```json|```/g, '').trim()); } catch { action = { action: 'chat' }; }

                if (action.warning) {
                    await m.reply(`⚠️ RAM Warning: ${action.warning}`);
                    await logAction('agent_warning', action.target, action, 'ram_warning');
                    return;
                }

                // 3A. LIST PLUGINS
                if (action.action === 'list_plugins') {
                    await logAction('github_read', process.env.GITHUB_PLUGINS_PATH, { intent: 'list' });
                    try {
                        const { data } = await gh.get(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${process.env.GITHUB_PLUGINS_PATH}`);
                        const pluginNames = data.filter(f => f.name.endsWith('.js')).map(f => f.name.replace('.js', ''));

                        // Safe Cache Update
                        if (supabase) {
                            try {
                                await supabase.from('vc_plugin_cache').upsert(
                                    pluginNames.map(n => ({ plugin_name: n, plugin_path: `${process.env.GITHUB_PLUGINS_PATH}/${n}.js` })),
                                    { onConflict: 'plugin_name' }
                                );
                            } catch (ce) {}
                        }
                        response = `🧠 Vex Plugins:\n${pluginNames.map(p => `• ${p}`).join('\n')}`;
                    } catch (e) { response = `❌ GitHub Error: ${e.message}`; }
                } 
                else if (action.action === 'read_file') {
                    let path = action.target;
                    if (!path) return m.reply("❌ Sema file gani.");
                    if (!path.includes('/')) path = `${process.env.GITHUB_PLUGINS_PATH}/${path}.js`;
                    await logAction('github_read', path, action);
                    try {
                        const { data } = await gh.get(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${path}`);
                        const content = Buffer.from(data.content, 'base64').toString('utf8');
                        response = `📄 File: ${path}\n\n${content.slice(0, 1000)}...`;
                    } catch (e) { response = `❌ Sijaipata ${path}`; }
                }
                else if (action.action === 'write_file') {
                    const code = extractCode(prompt);
                    let path = action.target;
                    if (!path || !code) return m.reply("❌ Format mbovu.");
                    await logAction('github_write', path, { intent: 'write' });
                    try {
                        const sha = await getFileSha(path);
                        const content = Buffer.from(code).toString('base64');
                        await gh.put(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${path}`, {
                            message: `Vex Update: ${path}`, content, sha, branch: 'main'
                        });
                        response = `✅ Nimeandika ${path} kaka. Wait for Render deploy.`;
                    } catch (e) { response = `❌ Write failed: ${e.message}`; }
                }
                else if (action.action === 'render_status') {
                    commandType = 'devops';
                    try {
                        const { data } = await renderApi.get(`/services/${process.env.RENDER_SERVICE_ID}`);
                        response = `🖥️ Server: ${data.name}\nStatus: ${data.serviceDetails?.env || 'Live'}`;
                    } catch (e) { response = "❌ Render API Error."; }
                }
                else {
                    response = await callAI(prompt, systemPrompt);
                }
            } else {
                response = await callAI(prompt, systemPrompt);
            }

            // Translation logic
            if (lang !== 'en' && response) {
                try {
                    const res = await translate(response, { to: lang });
                    response = res.text;
                } catch {}
            }

            // --- SAFE HISTORY SAVE ---
            if (supabase) {
                try {
                    await supabase.from('vc_chat_history').insert({
                        user_id: userId,
                        chat_id: m.chat,
                        user_message: prompt,
                        vex_response: response?.slice(0, 3000),
                        command_type: commandType
                    });
                } catch (he) {}
            }

            // UJUMBE WA TARIFA KAMA DB IMEKUFA (Ulitaka uijue)
            if (supabaseStatus !== "Online" && response) {
                response += "\n\n⚠️ *Database imekaa vibaya kaka, ila nimejibu.*";
            }

            await m.reply(response || "❌ Vex AI imekwama.");

        } catch (e) {
            console.error("Critical Lex Error:", e);
            await m.reply(`❌ Critical Error: ${e.message}`);
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
