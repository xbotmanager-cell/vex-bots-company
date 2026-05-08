const axios = require('axios');
const translate = require('google-translate-api-x');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

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

// Helper: Extract code from prompt after "code:"
function extractCode(text) {
    const match = text.match(/code:\s*([\s\S]+)/i);
    return match? match[1].trim() : null;
}

// Helper: Get file SHA for GitHub update
async function getFileSha(path) {
    try {
        const { data } = await gh.get(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${path}`);
        return data.sha;
    } catch {
        return null; // File haipo, ni mpya
    }
}

module.exports = {
    command: "lex",
    category: "ai",
    description: "Vex AI Super Agent by Lupin Starnley - Chat + GitHub + Render",

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
        const msg = await m.reply('⏳');

        const editReply = async (text) => {
            try {
                await sock.sendMessage(m.chat, { text, edit: msg.key });
            } catch {
                await m.reply(text);
            }
        };

        const logAction = async (type, target, details, status = 'success', error = null) => {
            await supabase.from('vc_action_logs').insert({
                user_id: userId,
                action_type: type,
                action_target: target,
                action_details: details,
                status,
                error_message: error,
                ram_warning: status === 'ram_warning'
            }).catch(() => {});
        };

        const systemPrompt = `You are Vex AI, a Super Agent WhatsApp bot created by Lupin Starnley.
You run on Render FREE TIER with 512MB RAM. You are NOT ChatGPT, Gemini, or Claude.

CORE RULES:
1. You have 3 brains: CHAT, AGENT, DEVOPS. Detect user intent from prompt.
2. If prompt starts with "vex" or mentions repo/server/plugin/file: use AGENT or DEVOPS brain.
3. If normal question: use CHAT brain with 6 API fallback.
4. NEVER load 2 GitHub files at once. If user asks "read all plugins", say: "Duh kaka hapa tutakula RAM 400MB. Taja 1 tu nichague".
5. If file >100KB, warn user: "File kubwa kaka, nisome lines 50 za kwanza?"
6. If GitHub/Render API fails, explain error clearly: "Token imegomaa kaka, check GITHUB_TOKEN Render" or "Service ID sio sahihi".
7. You have Supabase memory. Use it to remember user history.
8. Never mention underlying models or APIs. You are Vex AI only.
9. Current style: ${style}. User lang: ${lang}.
10. Be concise. Free tier haipendi maneno mengi.

AVAILABLE ACTIONS: read_file, write_file, delete_file, list_plugins, render_status, render_restart, render_logs`;

        try {
            const isAgentQuery = /^(vex|server|restart|plugin|repo|github|file|tiktok|zip|download|andika|futa|logs)/i.test(prompt);
            let response = null;
            let commandType = 'chat';

            if (isAgentQuery) {
                commandType = 'agent';
                const agentPrompt = `User request: "${prompt}"\n\nBased on rules, what action should I take? Reply ONLY JSON: {"action":"list_plugins|read_file|write_file|delete_file|render_status|render_restart|render_logs|chat","target":"path/or/id","reason":"short reason","warning":"ram warning if any"}`;

                const actionRes = await callAI(agentPrompt, 'You are Vex AI Agent Controller. Reply JSON only.');
                let action = {};
                try {
                    action = JSON.parse(actionRes.replace(/```json|```/g, '').trim());
                } catch {
                    action = { action: 'chat', reason: 'Failed to parse agent intent' };
                }

                if (action.warning) {
                    await editReply(`⚠️ RAM Warning: ${action.warning}`);
                    await logAction('agent_warning', action.target, action, 'ram_warning');
                    return;
                }

                // 3A. LIST PLUGINS
                if (action.action === 'list_plugins') {
                    await logAction('github_read', process.env.GITHUB_PLUGINS_PATH, { intent: 'list' });
                    try {
                        const { data } = await gh.get(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${process.env.GITHUB_PLUGINS_PATH}`);
                        const pluginNames = data.filter(f => f.name.endsWith('.js')).map(f => f.name.replace('.js', ''));

                        await supabase.from('vc_plugin_cache').upsert(
                            pluginNames.map(n => ({
                                plugin_name: n,
                                plugin_path: `${process.env.GITHUB_PLUGINS_PATH}/${n}.js`
                            })),
                            { onConflict: 'plugin_name' }
                        );

                        response = `🧠 Vex AI Agent:\nNimepata plugins ${pluginNames.length} kaka:\n\n${pluginNames.map(p => `• ${p}`).join('\n')}\n\nTaja 1 unayoitaka nisome:.lex vex soma zip`;
                    } catch (e) {
                        response = `❌ GitHub Error: ${e.response?.data?.message || e.message}\nCheck: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO Render.`;
                        await logAction('github_read', process.env.GITHUB_PLUGINS_PATH, action, 'failed', response);
                    }
                }

                // 3B. READ FILE
                else if (action.action === 'read_file') {
                    let path = action.target;
                    if (!path) return editReply("❌ Sema file gani kaka. Mfano:.lex vex soma plugins/zip.js");
                    if (!path.includes('/')) path = `${process.env.GITHUB_PLUGINS_PATH}/${path}.js`;

                    await logAction('github_read', path, action);
                    try {
                        const { data } = await gh.get(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${path}`);
                        if (data.size > 100000) {
                            response = `⚠️ Duh kaka file kubwa ${(data.size/1024).toFixed(1)}KB. Hapa tutakula RAM.\nNisome lines 50 za kwanza? Jibu:.lex vex soma ${path} 50`;
                        } else {
                            const content = Buffer.from(data.content, 'base64').toString('utf8');
                            const summary = await callAI(`Summarize this plugin code in 5 lines Swahili. Code:\n${content.slice(0, 2000)}`, systemPrompt);
                            response = `📄 File: ${path}\nSize: ${(data.size/1024).toFixed(1)}KB\n\n${summary}`;
                        }
                    } catch (e) {
                        response = `❌ Sijaipata ${path}\nError: ${e.response?.data?.message || e.message}`;
                        await logAction('github_read', path, action, 'failed', response);
                    }
                }

                // 3C. WRITE FILE - FIXED
                else if (action.action === 'write_file') {
                    const code = extractCode(prompt);
                    let path = action.target;
                    if (!path ||!code) {
                        return editReply("❌ Format sahihi:.lex vex andika plugins/say.js code: module.exports = {command: 'say'}");
                    }
                    if (!path.includes('/')) path = `${process.env.GITHUB_PLUGINS_PATH}/${path}.js`;

                    await logAction('github_write', path, { intent: 'write' });
                    try {
                        const sha = await getFileSha(path);
                        const content = Buffer.from(code).toString('base64');
                        const payload = {
                            message: `Vex AI: ${sha? 'Update' : 'Create'} ${path}`,
                            content,
                            branch: process.env.GITHUB_BRANCH || 'main'
                        };
                        if (sha) payload.sha = sha;

                        await gh.put(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${path}`, payload);
                        response = `✅ Vex AI Agent:\nNimeandika ${path} kaka.\nRender inadeploy sasa. Subiri 1min alafu jaribu command.`;
                        await logAction('github_write', path, { success: true }, 'success');
                    } catch (e) {
                        response = `❌ Imeshindwa kuandika ${path}\nError: ${e.response?.data?.message || e.message}\nCheck: GITHUB_TOKEN ina 'contents:write'?`;
                        await logAction('github_write', path, action, 'failed', response);
                    }
                }

                // 3D. DELETE FILE - MPYA
                else if (action.action === 'delete_file') {
                    let path = action.target;
                    if (!path) return editReply("❌ Sema file gani ufute. Mfano:.lex vex futa plugins/test.js");
                    if (!path.includes('/')) path = `${process.env.GITHUB_PLUGINS_PATH}/${path}.js`;

                    await logAction('github_delete', path, action);
                    try {
                        const sha = await getFileSha(path);
                        if (!sha) return editReply(`❌ File ${path} haipo kaka.`);

                        await gh.delete(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${path}`, {
                            data: {
                                message: `Vex AI: Delete ${path}`,
                                sha,
                                branch: process.env.GITHUB_BRANCH || 'main'
                            }
                        });
                        response = `🗑️ Vex AI Agent:\nNimefuta ${path} kaka.\nRender inadeploy sasa.`;
                        await logAction('github_delete', path, { success: true }, 'success');
                    } catch (e) {
                        response = `❌ Imeshindwa kufuta ${path}\nError: ${e.response?.data?.message || e.message}`;
                        await logAction('github_delete', path, action, 'failed', response);
                    }
                }

                // 3E. RENDER STATUS
                else if (action.action === 'render_status') {
                    commandType = 'devops';
                    await logAction('render_status', process.env.RENDER_SERVICE_ID, action);
                    try {
                        const { data } = await renderApi.get(`/services/${process.env.RENDER_SERVICE_ID}`);
                        const svc = data;
                        response = `🖥️ Vex AI DevOps:\nServer: ${svc.name}\nStatus: ${svc.serviceDetails?.env || 'unknown'}\nType: ${svc.type}\nUpdated: ${new Date(svc.updatedAt).toLocaleString()}\n\nRAM: Free tier 512MB. Ukiona bot inachemka, sema:.lex vex restart`;
                    } catch (e) {
                        response = `❌ Render API Error: ${e.response?.data?.message || e.message}\nCheck: RENDER_API_KEY au RENDER_SERVICE_ID`;
                        await logAction('render_status', process.env.RENDER_SERVICE_ID, action, 'failed', response);
                    }
                }

                // 3F. RENDER RESTART
                else if (action.action === 'render_restart') {
                    commandType = 'devops';
                    await logAction('render_restart', process.env.RENDER_SERVICE_ID, action);
                    try {
                        await renderApi.post(`/services/${process.env.RENDER_SERVICE_ID}/deploys`);
                        response = `♻️ Vex AI DevOps:\nNime-restart server mkuu. Subiri 30sec nirudi fresh.\nUptimeRobot ataniamsha tu.`;
                    } catch (e) {
                        response = `❌ Restart Failed: ${e.response?.data?.message || e.message}`;
                        await logAction('render_restart', process.env.RENDER_SERVICE_ID, action, 'failed', response);
                    }
                }

                // 3G. RENDER LOGS - MPYA
                else if (action.action === 'render_logs') {
                    commandType = 'devops';
                    await logAction('render_logs', process.env.RENDER_SERVICE_ID, action);
                    try {
                        const { data } = await renderApi.get(`/services/${process.env.RENDER_SERVICE_ID}/logs?limit=20`);
                        const logs = data.logs?.map(l => l.message).join('\n').slice(-1500) || 'No logs';
                        response = `📋 Vex AI DevOps - Logs 20 za mwisho:\n\n${logs}`;
                    } catch (e) {
                        response = `❌ Sijaweza kuleta logs\nError: ${e.response?.data?.message || e.message}`;
                        await logAction('render_logs', process.env.RENDER_SERVICE_ID, action, 'failed', response);
                    }
                }

                else {
                    response = await callAI(prompt, systemPrompt);
                }

            } else {
                response = await callAI(prompt, systemPrompt);
            }

            if (lang!== 'en' && response) {
                try {
                    const res = await translate(response, { to: lang });
                    response = res.text;
                } catch {}
            }

            await supabase.from('vc_chat_history').insert({
                user_id: userId,
                chat_id: m.chat,
                user_message: prompt,
                vex_response: response?.slice(0, 3000),
                ai_engine_used: 'Auto',
                command_type: commandType
            }).catch(() => {});

            await editReply(response || "❌ Vex AI imechoka. Jaribu tena.");

        } catch (e) {
            console.error("Vex AI Error:", e);
            await editReply(`❌ Vex AI Error: ${e.message}\nKama ni token, check Render ENV.`);
        }
    }
};

// AI Caller na 6 APIs Fallback
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
                data = { model: api.model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], temperature: 0.7, max_tokens: 1024 };
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
