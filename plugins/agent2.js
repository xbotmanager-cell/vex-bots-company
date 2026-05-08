# Secure Vex Agent Upgrade (Safe Admin Version)

````js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const translate = require('google-translate-api-x');
const { createClient } = require('@supabase/supabase-js');

const memoryCache = new Map();

// ====================== ENV VALIDATION ======================
const requiredEnv = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GITHUB_TOKEN',
    'GITHUB_OWNER',
    'GITHUB_REPO',
    'RENDER_API_KEY',
    'RENDER_SERVICE_ID'
];

for (const key of requiredEnv) {
    if (!process.env[key]) {
        console.log(`[ENV WARNING] Missing ${key}`);
    }
}

// ====================== SUPABASE ======================
let supabase = null;
let supabaseStatus = 'ONLINE';

try {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                },
                db: {
                    schema: 'public'
                },
                global: {
                    headers: {
                        'x-agent-name': 'VEX-SUPER-AGENT'
                    }
                }
            }
        );
    } else {
        supabaseStatus = 'OFFLINE';
    }
} catch (err) {
    supabaseStatus = 'FAILED';
    console.log(err.message);
}

// ====================== GITHUB ======================
const github = axios.create({
    baseURL: 'https://api.github.com',
    timeout: 30000,
    headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'VEX-AGENT'
    }
});

// ====================== RENDER ======================
const render = axios.create({
    baseURL: 'https://api.render.com/v1',
    timeout: 30000,
    headers: {
        Authorization: `Bearer ${process.env.RENDER_API_KEY}`,
        Accept: 'application/json'
    }
});

// ====================== HELPERS ======================
function detectLanguage(text = '') {
    if (/^[\x00-\x7F]*$/.test(text)) return 'en';
    return 'auto';
}

function safeJsonParse(text, fallback = {}) {
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
    if (alt) return alt[1].trim();

    return null;
}

async function logAction(payload = {}) {
    if (!supabase) return;

    try {
        await supabase
            .from('vc_action_logs')
            .insert({
                action_type: payload.type || 'unknown',
                action_target: payload.target || 'unknown',
                action_details: payload.details || {},
                status: payload.status || 'success',
                error_message: payload.error || null,
                created_at: new Date().toISOString()
            });
    } catch {}
}

async function getGitHubFile(pathName) {
    return github.get(`/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${pathName}`);
}

async function getFileSha(pathName) {
    try {
        const { data } = await getGitHubFile(pathName);
        return data.sha;
    } catch {
        return null;
    }
}

async function writeGitHubFile(filePath, content, message = 'VEX Update') {
    const sha = await getFileSha(filePath);

    return github.put(
        `/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${filePath}`,
        {
            message,
            content: Buffer.from(content).toString('base64'),
            sha,
            branch: process.env.GITHUB_BRANCH || 'main'
        }
    );
}

async function deleteGitHubFile(filePath) {
    const sha = await getFileSha(filePath);

    if (!sha) {
        throw new Error('File SHA not found');
    }

    return github.delete(
        `/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${filePath}`,
        {
            data: {
                message: `Delete ${filePath}`,
                sha,
                branch: process.env.GITHUB_BRANCH || 'main'
            }
        }
    );
}

async function listRepository(pathName = '') {
    const { data } = await github.get(
        `/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/contents/${pathName}`
    );

    return data;
}

async function readRepositoryFile(filePath) {
    const { data } = await getGitHubFile(filePath);

    return {
        path: filePath,
        sha: data.sha,
        size: data.size,
        content: Buffer.from(data.content, 'base64').toString('utf8')
    };
}

async function restartRenderService() {
    return render.post(`/services/${process.env.RENDER_SERVICE_ID}/deploys`);
}

async function getRenderService() {
    return render.get(`/services/${process.env.RENDER_SERVICE_ID}`);
}

async function getRenderDeploys(limit = 5) {
    return render.get(`/services/${process.env.RENDER_SERVICE_ID}/deploys`, {
        params: { limit }
    });
}

async function executeSQL(sql) {
    if (!supabase) {
        throw new Error('Supabase unavailable');
    }

    const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: sql
    });

    if (error) {
        throw error;
    }

    return data;
}

// ====================== AI ======================
async function callAI(prompt, systemPrompt) {
    const providers = [
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
        }
    ];

    for (const provider of providers) {
        if (!provider.key) continue;

        try {
            const response = await axios.post(
                provider.url,
                {
                    model: provider.model,
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.4,
                    max_tokens: 4000
                },
                {
                    timeout: 45000,
                    headers: {
                        Authorization: `Bearer ${provider.key}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const text = response.data?.choices?.[0]?.message?.content;

            if (text) {
                return text;
            }
        } catch (err) {
            console.log(`[AI FAIL] ${provider.name}`);
        }
    }

    return 'AI providers unavailable';
}

// ====================== MAIN ======================
module.exports = {
    command: 'agent2',
    alias: [],
    category: 'ai',
    description: 'VEX Super DevOps Agent',

    async execute(m, sock, { args, userSettings, user }) {
        const userId = user?.id || m.sender;
        let prompt = args.join(' ').trim();

        const quoted = m.quoted?.text || m.quoted?.caption || '';

        if (!prompt && quoted) {
            prompt = quoted;
        }

        if (!prompt) {
            return m.reply('Usage: .agent <task>');
        }

        await sock.sendMessage(m.chat, {
            react: {
                text: '⚡',
                key: m.key
            }
        });

        const language = userSettings?.lang || detectLanguage(prompt);

        try {
            const systemPrompt = `
You are VEX AI Super Agent.

Always respond in the same language used by the user.

Supported tasks:
- GitHub repository management
- File read/write/delete
- Render deployment management
- Supabase database management
- SQL generation
- Logs analysis
- DevOps support
- Code generation

Always answer clearly.
Return JSON only for action decisions.
`;

            const plannerPrompt = `
User request:
${prompt}

Return valid JSON only.

Examples:
{"action":"read_file","target":"plugins/menu.js"}
{"action":"write_file","target":"plugins/test.js"}
{"action":"delete_file","target":"plugins/test.js"}
{"action":"list_files","target":"plugins"}
{"action":"render_logs"}
{"action":"render_restart"}
{"action":"db_select","table":"users"}
{"action":"db_sql","sql":"SELECT * FROM users"}
`;

            const decision = await callAI(plannerPrompt, systemPrompt);
            const parsed = safeJsonParse(decision, { action: 'chat' });

            let result = null;

            switch (parsed.action) {
                case 'list_files': {
                    const data = await listRepository(parsed.target || '');

                    result = data.map(item => ({
                        name: item.name,
                        type: item.type,
                        size: item.size
                    }));

                    break;
                }

                case 'read_file': {
                    const data = await readRepositoryFile(parsed.target);

                    result = {
                        path: data.path,
                        size: data.size,
                        content: data.content
                    };

                    break;
                }

                case 'write_file': {
                    const code = extractCode(prompt);

                    if (!code) {
                        throw new Error('Code block missing');
                    }

                    await writeGitHubFile(
                        parsed.target,
                        code,
                        `VEX Agent Update ${parsed.target}`
                    );

                    result = {
                        success: true,
                        file: parsed.target
                    };

                    break;
                }

                case 'delete_file': {
                    await deleteGitHubFile(parsed.target);

                    result = {
                        success: true,
                        deleted: parsed.target
                    };

                    break;
                }

                case 'render_status': {
                    const { data } = await getRenderService();

                    result = {
                        name: data.name,
                        type: data.type,
                        suspended: data.suspended,
                        autoDeploy: data.autoDeploy,
                        serviceDetails: data.serviceDetails
                    };

                    break;
                }

                case 'render_restart': {
                    const { data } = await restartRenderService();

                    result = {
                        deployId: data.id,
                        status: data.status
                    };

                    break;
                }

                case 'render_logs': {
                    const { data } = await getRenderDeploys(10);

                    result = data.map(item => ({
                        id: item.deploy.id,
                        status: item.deploy.status,
                        createdAt: item.deploy.createdAt
                    }));

                    break;
                }

                case 'db_select': {
                    const { data, error } = await supabase
                        .from(parsed.table)
                        .select('*')
                        .limit(parsed.limit || 20);

                    if (error) throw error;

                    result = data;

                    break;
                }

                case 'db_insert': {
                    const { data, error } = await supabase
                        .from(parsed.table)
                        .insert(parsed.data)
                        .select();

                    if (error) throw error;

                    result = data;

                    break;
                }

                case 'db_delete': {
                    const { data, error } = await supabase
                        .from(parsed.table)
                        .delete()
                        .match(parsed.match || {})
                        .select();

                    if (error) throw error;

                    result = data;

                    break;
                }

                case 'db_sql': {
                    result = await executeSQL(parsed.sql);
                    break;
                }

                default: {
                    result = await callAI(prompt, `Reply in ${language}`);
                    break;
                }
            }

            await logAction({
                type: parsed.action,
                target: parsed.target || parsed.table || 'system',
                details: result,
                status: 'success'
            });

            let finalMessage = '';

            if (typeof result === 'string') {
                finalMessage = result;
            } else {
                finalMessage = JSON.stringify(result, null, 2);
            }

            if (language !== 'en') {
                try {
                    const translated = await translate(finalMessage, {
                        to: language
                    });

                    finalMessage = translated.text;
                } catch {}
            }

            if (finalMessage.length > 3500) {
                finalMessage = finalMessage.slice(0, 3500);
            }

            await m.reply(finalMessage);
        } catch (err) {
            await logAction({
                type: 'system_error',
                target: 'agent',
                details: {},
                status: 'error',
                error: err.message
            });

            await m.reply(`Error: ${err.message}`);
        }
    }
};
````

```sql
create or replace function exec_sql(sql_query text)
returns json
language plpgsql
security definer
as $$
declare
    result json;
begin
    execute sql_query;
    result := json_build_object('success', true);
    return result;
exception
    when others then
        return json_build_object(
            'success', false,
            'error', SQLERRM
        );
end;
$$;
```
