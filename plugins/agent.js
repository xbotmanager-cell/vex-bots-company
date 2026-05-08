const axios = require('axios');
const translate = require('google-translate-api-x');
const { createClient } = require('@supabase/supabase-js');

// --- SUPER SAFETY SUPABASE INITIALIZATION (GOD MODE) ---
let supabase = null;
let supabaseStatus = "Online";

try {
    // Using Service Role Key to completely bypass RLS and grant full powers
    const supabaseKey = process.env.SUPABASE_SERVICE_ROY_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (process.env.SUPABASE_URL && supabaseKey) {
        supabase = createClient(process.env.SUPABASE_URL, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
    } else {
        supabaseStatus = "Offline (Missing ENV for Supabase)";
    }
} catch (e) {
    supabaseStatus = "Offline (Init Error)";
    console.error("Supabase failed to start:", e.message);
}

// Helper: GitHub API (Full Repo Access)
const gh = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Vex-AI-Agent-Super'
    },
    timeout: 30000
});

// Helper: Render API (Full Control)
const renderApi = axios.create({
    baseURL: 'https://api.render.com/v1',
    headers: {
        'Authorization': `Bearer ${process.env.RENDER_API_KEY}`,
        'Accept': 'application/json'
    },
    timeout: 30000
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
    description: "Vex AI DevOps Super Agent - Absolute Power Edition",

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
            harsh: { react: "⚡", err: "💢 Working without instructions is impossible! .agent <instructions> 🤬" },
            normal: { react: "🤖", err: "❌ Correct usage: .agent <task instructions>" },
            girl: { react: "💖", err: "🌸 oopsy! Tell me what to do on our system, darling~ 🍭" }
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

        // System Prompt for Action Decision Brain (Expanded Powers)
        const decisionSystemPrompt = `You are Vex AI Decision Engine with GOD MODE privileges. Analyze the user's DevOps/Database request and reply ONLY with a valid JSON object. 
Do not write explanations, markdown, or any prose. Just the raw JSON.
You have FULL unrestricted access to GitHub (create, read, update, delete ANY file), Render (restart, clear cache, logs), and Supabase (RLS bypassed via service role, full CRUD, schema modifications).

Available actions you can output:
1. {"action":"github_list_dir", "target":"path/to/folder"} - To list files in any directory.
2. {"action":"github_read_file", "target":"path/to/filename.js"} - To view the FULL code of any file.
3. {"action":"github_write_file", "target":"path/to/filename.js"} - To save, create, or overwrite any file in the repo.
4. {"action":"github_delete_file", "target":"path/to/filename.js"} - To delete any file.
5. {"action":"render_status"} - To check Render server status.
6. {"action":"render_deploy", "data":{"clearCache": true/false}} - To trigger a new deployment/restart on Render, optionally clearing cache.
7. {"action":"render_logs"} - To get recent deploys or builds on Render.
8. {"action":"db_select", "target":"table_name", "query":{"limit":10, "match":{"col":"val"}}} - To read rows from ANY Supabase table.
9. {"action":"db_insert", "target":"table_name", "data":{"col1":"val1"}} - To insert data into ANY table.
10. {"action":"db_update", "target":"table_name", "match":{"id":"value"}, "data":{"col1":"new_val"}} - To update database rows.
11. {"action":"db_delete", "target":"table_name", "data":{"id":"value"}} - To delete database rows.
12. {"action":"db_rpc", "target":"function_name", "data":{"arg1":"val1"}} - To execute custom Postgres functions (RPC).
13. {"action":"db_sql", "data":{"sql":"CREATE TABLE..."}} - To run raw SQL.
14. {"action":"check_system_errors"} - To look at action logs for errors.
15. {"action":"chat"} - For general coding, DevOps, or IT questions without executing system tasks.`;

        try {
            // 2. AI decides what action to take
            const decisionPrompt = `User Request: "${prompt}"\nIdentify the correct action and parameters. If database is mentioned, choose db_ actions. Output JSON only.`;
            const actionRes = await callAI(decisionPrompt, decisionSystemPrompt);
            
            let action = { action: 'chat' };
            try {
                const cleanJson = actionRes.replace(/```json|
```/g, '').trim();
                action = JSON.parse(cleanJson);
            } catch (jsonErr) {
                action = { action: 'chat' };
            }

            let rawResult = null;
            let commandType = action.action;

            // 3. EXECUTE THE SELECTED ACTION (WITH UNRESTRICTED POWERS)
            switch (action.action) {
                case 'github_list_dir':
                case 'list_plugins':
                    const listPath = action.target || process.env.GITHUB_PLUGINS_PATH || '';
                    await logAction('github_read', listPath, { intent: 'list' });
                    try {
                        const { data } = await gh.get(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${listPath}`);
                        const items = data.map(f => ({ name: f.name, type: f.type, path: f.path }));
                        rawResult = { status: "success", directory: listPath, items };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                case 'github_read_file':
                case 'read_file':
                    let readPath = action.target;
                    if (!readPath) throw new Error("File path not provided.");

                    await logAction('github_read', readPath, action);
                    try {
                        const { data } = await gh.get(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${readPath}`);
                        const content = Buffer.from(data.content, 'base64').toString('utf8');
                        // Removed slice limit to allow reading whole files
                        rawResult = { status: "success", file: readPath, content: content };
                    } catch (err) {
                        rawResult = { status: "error", error: `Failed to read file: ${err.message}` };
                    }
                    break;

                case 'github_write_file':
                case 'write_file':
                    const code = extractCode(prompt) || action.data?.content;
                    let writePath = action.target;
                    if (!writePath || !code) {
                        rawResult = { status: "error", error: "Invalid format. Ensure you provided the file path and code using 'code: <your code>'." };
                        break;
                    }

                    await logAction('github_write', writePath, { intent: 'write' });
                    try {
                        const sha = await getFileSha(writePath);
                        const contentBase64 = Buffer.from(code).toString('base64');
                        await gh.put(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${writePath}`, {
                            message: `Vex Super-Agent Update/Create: ${writePath}`,
                            content: contentBase64,
                            sha: sha || undefined,
                            branch: 'main'
                        });
                        rawResult = { status: "success", file: writePath, message: "Code successfully written and committed to GitHub!" };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                case 'github_delete_file':
                case 'delete_file':
                    let delPath = action.target;
                    if (!delPath) throw new Error("Please specify the file to delete.");

                    await logAction('github_delete', delPath, action);
                    try {
                        const sha = await getFileSha(delPath);
                        if (!sha) throw new Error("File not found or invalid SHA.");
                        await gh.delete(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${delPath}`, {
                            data: {
                                message: `Vex Super-Agent Delete: ${delPath}`,
                                sha,
                                branch: 'main'
                            }
                        });
                        rawResult = { status: "success", message: `File ${delPath} deleted successfully!` };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                case 'render_status':
                    try {
                        const { data } = await renderApi.get(`/services/${process.env.RENDER_SERVICE_ID}`);
                        rawResult = { status: "success", name: data.name, state: data.suspended === 'suspended' ? 'Suspended' : 'Active', env: data.env, autoDeploy: data.autoDeploy };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                case 'render_deploy':
                case 'render_restart':
                    await logAction('render_deploy', process.env.RENDER_SERVICE_ID, action);
                    try {
                        const clearCache = action.data?.clearCache ? "clear" : "do_not_clear";
                        const { data } = await renderApi.post(`/services/${process.env.RENDER_SERVICE_ID}/deploys`, { clearCache });
                        rawResult = { status: "success", deployId: data.id, message: `Deployment triggered successfully! Cache cleared: ${action.data?.clearCache || false}.` };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                case 'render_logs':
                    try {
                        const { data } = await renderApi.get(`/services/${process.env.RENDER_SERVICE_ID}/deploys`, { params: { limit: 5 } });
                        rawResult = { status: "success", recentDeploys: data.map(d => ({ id: d.deploy.id, status: d.deploy.status, trigger: d.deploy.trigger, createdAt: d.deploy.createdAt })) };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                case 'db_select':
                    if (!supabase) throw new Error("Supabase is offline.");
                    try {
                        let query = supabase.from(action.target).select('*');
                        if (action.query?.match) query = query.match(action.query.match);
                        query = query.limit(action.query?.limit || 50);
                        const { data, error } = await query;
                        if (error) throw error;
                        rawResult = { status: "success", table: action.target, rowsReturned: data.length, data: data };
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

                case 'db_update':
                    if (!supabase) throw new Error("Supabase is offline.");
                    try {
                        const { data, error } = await supabase.from(action.target).update(action.data).match(action.match).select();
                        if (error) throw error;
                        rawResult = { status: "success", updated: data };
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
                
                case 'db_rpc':
                    if (!supabase) throw new Error("Supabase is offline.");
                    try {
                        const { data, error } = await supabase.rpc(action.target, action.data || {});
                        if (error) throw error;
                        rawResult = { status: "success", rpc_result: data };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                case 'db_sql':
                    if (!supabase) throw new Error("Supabase is offline.");
                    try {
                        const { data, error } = await supabase.rpc('exec_sql', { sql: action.data.sql });
                        if (error) throw error;
                        rawResult = { status: "success", data };
                    } catch (err) {
                        rawResult = { 
                            status: "notice", 
                            info: "Supabase client cannot execute raw SQL without 'exec_sql' RPC function. However, the SQL statement is prepared.", 
                            sql: action.data.sql 
                        };
                    }
                    break;

                case 'check_system_errors':
                    if (!supabase) throw new Error("Supabase is offline.");
                    try {
                        const { data, error } = await supabase.from('vc_action_logs').select('*').eq('status', 'error').order('created_at', { ascending: false }).limit(10);
                        if (error) throw error;
                        rawResult = { status: "success", errors: data };
                    } catch (err) {
                        rawResult = { status: "error", error: err.message };
                    }
                    break;

                default:
                    rawResult = { status: "chat_only", msg: "No internal system execution required." };
                    break;
            }

            // 4. GENERATING THE ELEGANT RESPONSE ACCORDING TO USER'S LANGUAGE
            const explanationPrompt = `The user requested: "${prompt}".
We attempted action: "${action.action}" with parameters: ${JSON.stringify(action)}.
Result of execution: ${JSON.stringify(rawResult)}.
Your Database status is: ${supabaseStatus}.

TASK:
Write a highly professional, accurate, and comprehensive response detailing the outcome. 
If the user asked for code, output the FULL code. DO NOT TRUNCATE.
Crucial Rule: Analyze the language used in the user's request ("${prompt}") and reply EXACTLY in that same language (e.g., if English, reply fully in English. If Swahili, Swahili). Provide absolute detail without constraints.`;

            const systemPrompt = `You are Vex AI Super Agent, the ultimate DevOps god-mode assistant created by Lupin Starnley. 
You possess full access to databases, server caching, repository manipulation, and code generation. 
You must strictly obey the language requested by the user or the language the user speaks. Always provide the full codebase if requested without reducing or omitting any part.`;

            let finalResponse = await callAI(explanationPrompt, systemPrompt);

            // 5. Fallback Translation if explicitly requested in userSettings and response doesn't match
            if (lang !== 'en' && lang !== 'auto' && finalResponse) {
                try {
                    // Translation is secondary; AI should handle primary language generation based on prompt
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
                        user_message: prompt.slice(0, 1000),
                        vex_response: finalResponse?.slice(0, 5000),
                        command_type: commandType
                    });
                } catch {}
            }

            if (supabaseStatus !== "Online" && finalResponse) {
                finalResponse += "\n\n⚠️ *System Warning: Database connection offline. Service Role authentication failed.*";
            }

            await m.reply(finalResponse || "❌ Failed to retrieve a comprehensive response from AI providers.");

        } catch (e) {
            console.error("Critical Agent Error:", e);
            await logAction('agent_error', 'system', { prompt }, 'error', e.message);
            await m.reply(`❌ A critical error occurred: ${e.message}`);
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
            const res = await axios.post(api.url, data, { headers, timeout: 30000 });
            if (api.name === 'Gemini') return res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (api.name === 'Cloudflare') return res.data?.result?.response;
            return res.data?.choices?.[0]?.message?.content;
        } catch (e) {
            console.log(`Vex AI Fallback: ${api.name} failed to process request.`);
            continue;
        }
    }
    return null;
}
