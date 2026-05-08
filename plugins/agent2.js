const axios = require('axios');
const fs = require('fs');
const path = require('path');
const translate = require('google-translate-api-x');
const { createClient } = require('@supabase/supabase-js');

const memoryCache = new Map();

// Auto memory cleanup (Render Free Tier Safe)
setInterval(() => {
    memoryCache.clear();
}, 900000); // every 15 minutes

// ====================== ENV VALIDATION ======================
const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'];
for (const key of requiredEnv) {
    if (!process.env[key]) {
        console.warn(`[ENV WARNING] Missing ${key}`);
    }
}

// ====================== SUPABASE ======================
let supabase = null;
try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: { autoRefreshToken: false, persistSession: false },
                global: { headers: { 'x-agent-name': 'VEX-SUPER-AGENT' } }
            }
        );
    }
} catch (err) {
    console.error("Supabase Init Failed:", err.message);
}

// ====================== GITHUB ======================
const github = axios.create({
    baseURL: 'https://api.github.com',
    timeout: 25000,
    headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'VEX-SUPER-AGENT'
    }
});

// ====================== RENDER (Safe) ======================
const render = (process.env.RENDER_API_KEY && process.env.RENDER_SERVICE_ID) ? axios.create({
    baseURL: 'https://api.render.com/v1',
    timeout: 20000,
    headers: {
        Authorization: `Bearer ${process.env.RENDER_API_KEY}`,
        Accept: 'application/json'
    }
}) : null;

// ====================== HELPERS ======================
function safeJsonParse(text, fallback = { action: 'chat' }) {
    try {
        return JSON.parse(text);
    } catch {
        return fallback;
    }
}

function extractCode(text) {
    const match = text.match(/```(?:js|javascript)?\n([\s\S]+?)```/i);
    if (match) return match[1].trim();
    const alt = text.match(/code\s*:\s*([\s\S]+)/i);
    return alt ? alt[1].trim() : null;
}

async function logAction(payload = {}) {
    if (!supabase) return;
    try {
        await supabase.from('vc_action_logs').insert({
            action_type: payload.type || 'unknown',
            action_target: payload.target || 'unknown',
            action_details: payload.details || {},
            status: payload.status || 'success',
            error_message: payload.error || null,
            created_at: new Date().toISOString()
        });
    } catch {}
}

// ====================== AI (ALL PROVIDERS KEPT) ======================
async function callAI(prompt, systemPrompt = "") {
    const providers = [
        { name: 'Groq',       url: 'https://api.groq.com/openai/v1/chat/completions',      key: process.env.GROQ_API_KEY,       model: 'llama-3.3-70b-versatile' },
        { name: 'OpenRouter', url: 'https://openrouter.ai/api/v1/chat/completions',      key: process.env.OPENROUTER_API_KEY, model: 'meta-llama/llama-3.1-70b-instruct' },
        { name: 'SambaNova',  url: 'https://api.sambanova.ai/v1/chat/completions',      key: process.env.SAMBANOVA_API_KEY,  model: 'Meta-Llama-3.1-70B-Instruct' },
        { name: 'Cerebras',   url: 'https://api.cerebras.ai/v1/chat/completions',       key: process.env.CEREBRAS_API_KEY,   model: 'llama3.1-70b' }
    ];

    for (const p of providers) {
        if (!p.key) continue;
        try {
            const response = await axios.post(p.url, {
                model: p.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user',   content: prompt }
                ],
                temperature: 0.35,
                max_tokens: 3500
            }, {
                headers: { Authorization: `Bearer ${p.key}` },
                timeout: 35000
            });

            const text = response.data?.choices?.[0]?.message?.content;
            if (text) return text;
        } catch (err) {
            console.log(`[AI FAIL] ${p.name}`);
        }
    }
    return "All AI providers are currently unavailable.";
}

// ====================== MAIN COMMAND ======================
module.exports = {
    command: 'agent2',
    alias: ['agent'],
    category: 'ai',
    description: 'VEX Super DevOps Agent (Full Power)',

    async execute(m, sock, { args, userSettings, user }) {
        let prompt = args.join(' ').trim();
        if (m.quoted?.text || m.quoted?.caption) {
            prompt = (m.quoted.text || m.quoted.caption) || prompt;
        }

        if (!prompt) return m.reply('Usage: `.agent2 <task>\nExample: .agent2 read plugins/allmenu.js`');

        await sock.sendMessage(m.chat, { react: { text: '⚡', key: m.key } });

        const language = userSettings?.lang || 'en';

        try {
            const systemPrompt = `You are VEX AI Super Agent. Always reply in the language the user used. You can manage GitHub, Render, Supabase, SQL, files, and code.`;

            const plannerPrompt = `User Request: ${prompt}\n\nReturn ONLY valid JSON. Examples:\n{"action":"read_file","target":"plugins/allmenu.js"}\n{"action":"write_file","target":"plugins/test.js"}\n{"action":"list_files","target":"plugins/"}\n{"action":"render_restart"}\n{"action":"render_logs"}\n{"action":"db_sql","sql":"SELECT * FROM users LIMIT 10"}\n{"action":"chat"}`;

            const decisionText = await callAI(plannerPrompt, systemPrompt);
            const parsed = safeJsonParse(decisionText);

            let result = null;
            const action = parsed.action || 'chat';

            switch (action) {
                case 'list_files':
                    const { data: files } = await github.get(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${parsed.target || ''}`);
                    result = files.map(f => ({ name: f.name, type: f.type, size: f.size }));
                    break;

                case 'read_file':
                    const fileData = await github.get(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${parsed.target}`);
                    result = {
                        path: parsed.target,
                        sha: fileData.data.sha,
                        size: fileData.data.size,
                        content: Buffer.from(fileData.data.content, 'base64').toString('utf8')
                    };
                    break;

                case 'write_file':
                    const code = extractCode(prompt);
                    if (!code) throw new Error('Code block (```) not found in your message');
                    await github.put(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${parsed.target}`, {
                        message: `VEX Agent Update: ${parsed.target}`,
                        content: Buffer.from(code).toString('base64'),
                        sha: parsed.sha || null,
                        branch: process.env.GITHUB_BRANCH || 'main'
                    });
                    result = { success: true, message: `File updated: ${parsed.target}` };
                    break;

                case 'delete_file':
                    // Add delete logic if needed
                    result = { success: true, message: "Delete feature ready" };
                    break;

                case 'render_restart':
                    if (!render) throw new Error('Render not configured');
                    const deploy = await render.post(`/services/${process.env.RENDER_SERVICE_ID}/deploys`);
                    result = { success: true, deployId: deploy.data?.id };
                    break;

                case 'render_logs':
                case 'render_status':
                    if (!render) throw new Error('Render not configured');
                    const deploys = await render.get(`/services/${process.env.RENDER_SERVICE_ID}/deploys`, { params: { limit: 8 } });
                    result = deploys.data;
                    break;

                case 'db_sql':
                    if (!supabase) throw new Error('Supabase not available');
                    result = await supabase.rpc('exec_sql', { sql_query: parsed.sql });
                    break;

                default:
                    result = await callAI(prompt, `You are helpful. Reply in ${language}.`);
            }

            await logAction({ type: action, target: parsed.target || parsed.table, status: 'success', details: result });

            let finalMessage = typeof result === 'string' ? result : JSON.stringify(result, null, 2);

            if (finalMessage.length > 3800) {
                finalMessage = finalMessage.slice(0, 3770) + "\n\n[... Message too long]";
            }

            if (language !== 'en') {
                try {
                    const tr = await translate(finalMessage, { to: language });
                    finalMessage = tr.text;
                } catch {}
            }

            await m.reply(finalMessage);

        } catch (err) {
            console.error(err);
            await logAction({ type: 'error', target: 'agent2', status: 'failed', error: err.message });
            await m.reply(`❌ *Error:* ${err.message}`);
        }
    }
};
