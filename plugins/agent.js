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
    command: "agent",
    category: "ai",
    description: "Vex AI DevOps Super Agent - Full Power Edition",

    async execute(m, sock, { args, userSettings, user }) {
        let prompt = args.join(' ');
        const lang = userSettings?.lang || 'en';
        const style = userSettings?.style || 'normal';
        const userId = user?.id || m.sender;

        // --- HANDLING QUOTED MESSAGE (REPLY) ---
        const quotedText = m.quoted ? (m.quoted.text || m.quoted.caption || "") : "";
        if (quotedText && !prompt) {
            prompt = quotedText;
        } else if (quotedText && prompt) {
            prompt = `Context/Quoted Message: "${quotedText}"\n\nUser instructions: ${prompt}`;
        }

        const modes = {
            harsh: { react: "⚡", err: "💢 Kazi bila maelekezo haiwezekani!.agent <maelekezo> 🤬" },
            normal: { react: "🤖", err: "❌ Matumizi sahihi: .agent <maelekezo ya kazi>" },
            girl: { react: "💖", err: "🌸 oopsy! Niambie cha kufanya kwenye system yetu mpenzi~ 🍭" }
        };

        const current = modes[style] || modes.normal;
        if (!prompt) return m.reply(current.err);

        // 1. React immediately to show active status
        await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

        // Safe Action Logger
        const logAction = async (type, target, details, status = 'success', error = null) => {
            if (!supabase) return;
            try {
                await supabase.from('vc_action_logs').insert({
                    user_id: userId,
                    action_type: type,
                    action_target: target,
                    action_details: details,
                    status,
                    error_message: error
                });
            } catch (e) {
                console.log("Supabase Logging Failed Silently");
            }
        };

        // System Prompt for Action Decision Brain
        const decisionSystemPrompt = `You are Vex AI Decision Engine. Analyze the user's DevOps/Database request and reply ONLY with a valid JSON object. 
Do not write explanations, markdown, or any prose. Just the raw JSON.

Available actions you can output:
1. {"action":"list_plugins"} - To list files in the plugin directory.
2. {"action":"read_file", "target":"filename.js"} - To view code of a specific plugin.
3. {"action":"write_file", "target":"filename.js"} - To save or write a new plugin.
4. {"action":"delete_file", "target":"filename.js"} - To delete a plugin.
5. {"action":"render_status"} - To check Render server status.
6. {"action":"render_restart"} - To trigger a new deployment/restart on Render.
7. {"action":"render_logs"} - To get recent deploys or builds on Render.
8. {"action":"db_select", "target":"table_name", "query":{"limit":10}} - To read rows from a Supabase table.
9. {"action":"db_insert", "target":"table_name", "data":{"col1":"val1"}} - To insert data.
10. {"action":"db_delete", "target":"table_name", "data":{"id":"value"}} - To delete database rows matching conditions.
11. {"action":"db_sql", "data":{"sql":"CREATE TABLE..."}} - To run raw SQL or custom table creation.
12. {"action":"check_system_errors"} - To look at action logs in Supabase for any recorded errors.
13. {"action":"chat"} - For general questions about DevOps, Git, database structures, or IT advice.`;

        try {
            // 2. AI decides what action to take
            const decisionPrompt = `User Request: "${prompt}"\nIdentify the correct action and parameters. If database is mentioned, choose db_ actions. Output JSON only.`;
            const actionRes = await callAI(decisionPrompt, decisionSystemPrompt);
            
            let action = { action: 'chat' };
            try {
                const cleanJson = actionRes.replace(/```json|```/g, '').trim();
                action = JSON.parse(cleanJson);
            } catch (jsonErr) {
                action = { action: 'chat' };
            }

            let rawResult = null;
            let commandType = action.action;

            // 3. EXECUTE THE SELECTED ACTION
            switch (action.action) {
                case 'list_plugins':
                    await logAction('github_read', process.env.GITHUB_PLUGINS_PATH, { intent: 'list' });
                    try {
                        const { data } = await gh.get(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${process.env.GITHUB_PLUGINS_PATH}`);
                        const pluginNames = data.filter(f => f.name.endsWith('.js')).map(f => f.name.replace('.js', ''));
                        
                        if (supabase) {
                            try {
                                await supabase.from('vc_plugin_cache').upsert(
                                    pluginNames.map(n => ({ plugin_name: n, plugin_path: `${process.env.GITHUB_PLUGINS_PATH}/${n}.js` })),
                                    { onConflict: 'plugin_name' }
                                );
                            } catch {}
                        }
                        rawResult = { status: "success", plugins: pluginNames };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                case 'read_file':
                    let readPath = action.target;
                    if (!readPath) throw new Error("Jina la faili halijatolewa.");
                    if (!readPath.includes('/')) readPath = `${process.env.GITHUB_PLUGINS_PATH}/${readPath}`;
                    if (!readPath.endsWith('.js')) readPath += '.js';

                    await logAction('github_read', readPath, action);
                    try {
                        const { data } = await gh.get(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${readPath}`);
                        const content = Buffer.from(data.content, 'base64').toString('utf8');
                        // Render Optimization: Limit code to 1500 chars to save RAM
                        rawResult = { status: "success", file: readPath, content: content.slice(0, 1500) };
                    } catch (err) {
                        rawResult = { status: "error", error: `Imefeli kusoma faili: ${err.message}` };
                    }
                    break;

                case 'write_file':
                    const code = extractCode(prompt);
                    let writePath = action.target;
                    if (!writePath || !code) {
                        rawResult = { status: "error", error: "Format mbovu. Hakikisha umeandika 'code: <kodi yako>' na ukaweka jina la faili." };
                        break;
                    }
                    if (!writePath.includes('/')) writePath = `${process.env.GITHUB_PLUGINS_PATH}/${writePath}`;
                    if (!writePath.endsWith('.js')) writePath += '.js';

                    await logAction('github_write', writePath, { intent: 'write' });
                    try {
                        const sha = await getFileSha(writePath);
                        const content = Buffer.from(code).toString('base64');
                        await gh.put(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${writePath}`, {
                            message: `Vex Super-Agent Update: ${writePath}`,
                            content,
                            sha,
                            branch: 'main'
                        });
                        rawResult = { status: "success", file: writePath, message: "Kodi imeandikwa kikamilifu kwenye GitHub!" };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                case 'delete_file':
                    let delPath = action.target;
                    if (!delPath) throw new Error("Tafadhali taja faili la kufuta.");
                    if (!delPath.includes('/')) delPath = `${process.env.GITHUB_PLUGINS_PATH}/${delPath}`;
                    if (!delPath.endsWith('.js')) delPath += '.js';

                    await logAction('github_delete', delPath, action);
                    try {
                        const sha = await getFileSha(delPath);
                        if (!sha) throw new Error("Faili halijapatikana au lina SHA mbovu.");
                        await gh.delete(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${delPath}`, {
                            data: {
                                message: `Vex Super-Agent Delete: ${delPath}`,
                                sha,
                                branch: 'main'
                            }
                        });
                        rawResult = { status: "success", message: `Faili ${delPath} limefutwa kwa mafanikio!` };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                case 'render_status':
                    try {
                        const { data } = await renderApi.get(`/services/${process.env.RENDER_SERVICE_ID}`);
                        rawResult = { status: "success", name: data.name, state: data.suspended === 'suspended' ? 'Suspended' : 'Active', details: data.serviceDetails };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                case 'render_restart':
                    await logAction('render_restart', process.env.RENDER_SERVICE_ID, action);
                    try {
                        const { data } = await renderApi.post(`/services/${process.env.RENDER_SERVICE_ID}/deploys`, {});
                        rawResult = { status: "success", deployId: data.id, message: "Deploy imeanzishwa! Server inajirestart sasa hivi." };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                case 'render_logs':
                    try {
                        const { data } = await renderApi.get(`/services/${process.env.RENDER_SERVICE_ID}/deploys`, { params: { limit: 3 } });
                        rawResult = { status: "success", recentDeploys: data.map(d => ({ id: d.deploy.id, status: d.deploy.status, trigger: d.deploy.trigger })) };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                case 'db_select':
                    if (!supabase) throw new Error("Supabase is offline.");
                    try {
                        let query = supabase.from(action.target).select('*').limit(action.query?.limit || 15);
                        const { data, error } = await query;
                        if (error) throw error;
                        rawResult = { status: "success", table: action.target, rows: data };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                case 'db_insert':
                    if (!supabase) throw new Error("Supabase is offline.");
                    try {
                        const { data, error } = await supabase.from(action.target).insert(action.data).select();
                        if (error) throw error;
                        rawResult = { status: "success", inserted: data };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                case 'db_delete':
                    if (!supabase) throw new Error("Supabase is offline.");
                    try {
                        const { data, error } = await supabase.from(action.target).delete().match(action.data).select();
                        if (error) throw error;
                        rawResult = { status: "success", deleted: data };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                case 'db_sql':
                    if (!supabase) throw new Error("Supabase is offline.");
                    try {
                        // Kujaribu kutumia custom RPC kama ipo kwenye DB ya Lupin
                        const { data, error } = await supabase.rpc('exec_sql', { sql: action.data.sql });
                        if (error) throw error;
                        rawResult = { status: "success", data };
                    } catch (err) {
                        rawResult = { 
                            status: "notice", 
                            info: "Supabase client haiwezi kuunda table moja kwa moja bila RPC ya 'exec_sql'. Lakini kodi ya SQL ipo tayari.", 
                            sql: action.data.sql 
                        };
                    }
                    break;

                case 'check_system_errors':
                    if (!supabase) throw new Error("Supabase is offline.");
                    try {
                        const { data, error } = await supabase.from('vc_action_logs').select('*').eq('status', 'error').order('created_at', { ascending: false }).limit(5);
                        if (error) throw error;
                        rawResult = { status: "success", errors: data };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                default:
                    rawResult = { status: "chat_only", msg: "Hakuna system action iliyohitajika." };
                    break;
            }

            // 4. GENERATING THE ELEGANT (KISHUA) RESPONSE
            // Tunalisha matokeo ya kazi kwenye AI ili aandike maelezo mazuri sana ya ki-binadamu
            const explanationPrompt = `The user requested: "${prompt}".
We attempted action: "${action.action}" with parameters: ${JSON.stringify(action)}.
Result of execution: ${JSON.stringify(rawResult)}.
Your Database status is: ${supabaseStatus}.

TASK:
Write a highly professional, stylish, clear and premium response (kishua) explaining the result of this operation to Lupin. 
Keep it concise to prevent high memory usage on our 512MB Render server. Use friendly language.`;

            const systemPrompt = `You are Vex AI Super Agent, designed by Lupin Starnley. 
You are friendly, brilliant, and handle servers/databases like a pro. Respond only in the requested language (Swahili).`;

            let finalResponse = await callAI(explanationPrompt, systemPrompt);

            // 5. Translation (Kama user anataka lugha nyingine)
            if (lang !== 'en' && finalResponse) {
                try {
                    const res = await translate(finalResponse, { to: lang });
                    finalResponse = res.text;
                } catch {}
            }

            // 6. Safe Save to History
            if (supabase) {
                try {
                    await supabase.from('vc_chat_history').insert({
                        user_id: userId,
                        chat_id: m.chat,
                        user_message: prompt.slice(0, 500),
                        vex_response: finalResponse?.slice(0, 3000),
                        command_type: commandType
                    });
                } catch {}
            }

            if (supabaseStatus !== "Online" && finalResponse) {
                finalResponse += "\n\n⚠️ *Database imekaa vibaya kaka, ila nimejibu.*";
            }

            await m.reply(finalResponse || "❌ Imefeli kupata maelezo kutoka kwa AI.");

        } catch (e) {
            console.error("Critical Agent Error:", e);
            await logAction('agent_error', 'system', { prompt }, 'error', e.message);
            await m.reply(`❌ Kaka kuna hitilafu imetokea: ${e.message}`);
        }
    }
};

// --- KEEPING THE CALL AI API ARRAY FULLY INTACT AND SACRED ---
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
