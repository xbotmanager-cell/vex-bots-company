const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { downloadContentFromMessage, getContentType } = require("@whiskeysockets/baileys");

// =========================
// CACHE SYSTEM - RAM ONLY
// =========================
let pluginCache = new Map(); // name -> {filename, path, url, command, alias, description, category}
let aliasMap = new Map(); // alias -> pluginName
let lastCacheUpdate = 0;
const CACHE_TTL = 600000; // 10 minutes
let aiCallCount = {};

// =========================
// ENV ZOTE 18
// =========================
const ENV = {
    NODE_VERSION: process.env.NODE_VERSION,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SAMBANOVA_API_KEY: process.env.SAMBANOVA_API_KEY,
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    CLOUDFLARE_API_KEY: process.env.CLOUDFLARE_API_KEY,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_OWNER: process.env.GITHUB_OWNER,
    GITHUB_REPO: process.env.GITHUB_REPO,
    GITHUB_BRANCH: process.env.GITHUB_BRANCH || 'main',
    GITHUB_PLUGINS_PATH: process.env.GITHUB_PLUGINS_PATH || 'plugins',
    RENDER_API_KEY: process.env.RENDER_API_KEY,
    RENDER_SERVICE_ID: process.env.RENDER_SERVICE_ID,
    OWNER_NUMBER: process.env.OWNER_NUMBER || '255780470905',
    OWNER_NAME: process.env.OWNER_NAME || 'Lupin Starnley',
    BOT_NAME: process.env.BOT_NAME || 'VEX AI'
};

module.exports = {
    command: "lupper",
    alias: ["lup", "lpr", "ai"],
    category: "ai",
    description: "Lupper - AI Msaidizi anayejua plugins zote 200+",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'normal';
        const lang = userSettings?.lang || 'en';
        const query = args.join(" ").trim();

        const designs = {
            harsh: {
                react: "☣️",
                prefix: "☣️ 𝙇𝙐𝙋𝙀𝙍:",
                error: `☣️ 𝙇𝙐𝙋𝙋𝙀𝙍 𝙀𝙍𝙊𝙍 ☣️\n\n➤ 𝙐𝙨𝙖𝙜𝙚:.lupper nipe jid\n➤ 𝙊𝙍:.lupper tengeneza paka\n➤ 𝙊𝙍:.lupper dp ya Ibra`
            },
            normal: {
                react: "⚛️",
                prefix: "⚛️ LUPPER:",
                error: `❌ *LUPPER*\n\n➤ Usage:.lupper nipe jid\n➤ OR:.lupper tengeneza paka\n➤ OR:.lupper dp ya Ibra`
            },
            girl: {
                react: "💖",
                prefix: "💖 𝑳𝑼𝑷𝑬𝑹:",
                error: `💔 𝑳𝑼𝑷𝑷𝑬𝑹 💔\n\n➤ 𝑼𝒔𝒂𝒈𝒆:.lupper nipe jid\n➤ 𝑶𝑹:.lupper tengeneza paka`
            }
        };

        const ui = designs[style] || designs.normal;

        if (!query) {
            await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
            return sock.sendMessage(m.chat, { text: ui.error }, { quoted: m });
        }

        await sock.sendMessage(m.chat, { react: { text: ui.react, key: m.key } });

        try {
            // =========================
            // 1. UPDATE CACHE YA PLUGINS 200+ NA METADATA
            // =========================
            await updatePluginCacheFull();

            // =========================
            // 2. DETECT MEDIA REPLY
            // =========================
            const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedType = quoted? getContentType(quoted) : null;

            // =========================
            // 3. AI INTENT DETECTION - UBONGO WA LUPPER
            // =========================
            const pluginList = Array.from(pluginCache.values()).map(p => ({
                name: p.command,
                aliases: p.alias,
                desc: p.description
            }));

            const intentPrompt = `User query: "${query}".
Media reply: ${quotedType || 'none'}.
Available plugins: ${JSON.stringify(pluginList.slice(0, 50))}... total ${pluginList.length}.
Chagua plugin sahihi kabisa. Jibu JSON tu: {"plugin":"name", "args":"extracted args", "reason":"short"}. Kama hakuna plugin, "plugin":"none".`;

            const aiResponse = await callAI(intentPrompt);
            let intent;
            try {
                intent = JSON.parse(aiResponse.match(/\{.*\}/s)[0]);
            } catch {
                intent = { plugin: "none", args: query, reason: "parse fail" };
            }

            // =========================
            // 4. EXECUTE BASED ON INTENT
            // =========================
            if (intent.plugin === "none" ||!pluginCache.has(intent.plugin)) {
                // HAKUNA PLUGIN - JIBU KAMA AI
                const helpText = await callAI(`User anataka: "${query}". Sijapata plugin. Plugins zilizopo: ${Array.from(pluginCache.keys()).slice(0, 8).join(', ')}. Jibu kwa kifupi umuongoze.`);
                return sock.sendMessage(m.chat, {
                    text: `${ui.prefix} ${helpText}`
                }, { quoted: m });
            }

            const targetPlugin = pluginCache.get(intent.plugin);
            await executePlugin(m, sock, targetPlugin, intent.args, quoted, quotedType, ui);

        } catch (err) {
            console.log("LUPPER ERROR:", err.message);
            await sock.sendMessage(m.chat, {
                text: `${ui.prefix} Nimekwama: ${err.message.slice(0, 60)}`
            }, { quoted: m });
        }
    }
};

// =========================
// AI FALLBACK CHAIN - ZOTE 6
// =========================
async function callAI(prompt, type = 'text') {
    const models = [
        { name: 'GROQ', fn: callGroq },
        { name: 'CEREBRAS', fn: callCerebras },
        { name: 'SAMBANOVA', fn: callSambaNova },
        { name: 'GEMINI', fn: callGemini },
        { name: 'OPENROUTER', fn: callOpenRouter },
        { name: 'CLOUDFLARE', fn: callCloudflare }
    ];

    for (const model of models) {
        try {
            if (aiCallCount[model.name] >= 200) continue;

            const result = await Promise.race([
                model.fn(prompt, type),
                new Promise((_, rej) => setTimeout(() => rej('Timeout'), 3000))
            ]);

            aiCallCount[model.name] = (aiCallCount[model.name] || 0) + 1;
            return result;
        } catch (e) {
            continue;
        }
    }
    return "Sawa mkuu";
}

async function callGroq(prompt) {
    if (!ENV.GROQ_API_KEY) throw 'No key';
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.3
    }, { headers: { 'Authorization': `Bearer ${ENV.GROQ_API_KEY}` }, timeout: 4000 });
    return res.data.choices[0].message.content.trim();
}

async function callCerebras(prompt) {
    if (!ENV.CEREBRAS_API_KEY) throw 'No key';
    const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
        model: 'llama3.1-8b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.3
    }, { headers: { 'Authorization': `Bearer ${ENV.CEREBRAS_API_KEY}` }, timeout: 4000 });
    return res.data.choices[0].message.content.trim();
}

async function callSambaNova(prompt) {
    if (!ENV.SAMBANOVA_API_KEY) throw 'No key';
    const res = await axios.post('https://api.sambanova.ai/v1/chat/completions', {
        model: 'Meta-Llama-3.1-8B-Instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100
    }, { headers: { 'Authorization': `Bearer ${ENV.SAMBANOVA_API_KEY}` }, timeout: 4000 });
    return res.data.choices[0].message.content.trim();
}

async function callGemini(prompt) {
    if (!ENV.GEMINI_API_KEY) throw 'No key';
    const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }]
    }, { timeout: 4000 });
    return res.data.candidates[0].content.parts[0].text.trim();
}

async function callOpenRouter(prompt) {
    if (!ENV.OPENROUTER_API_KEY) throw 'No key';
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100
    }, { headers: { 'Authorization': `Bearer ${ENV.OPENROUTER_API_KEY}` }, timeout: 4000 });
    return res.data.choices[0].message.content.trim();
}

async function callCloudflare(prompt) {
    if (!ENV.CLOUDFLARE_API_KEY ||!ENV.CLOUDFLARE_ACCOUNT_ID) throw 'No key';
    const res = await axios.post(`https://api.cloudflare.com/client/v4/accounts/${ENV.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
        messages: [{ role: 'user', content: prompt }]
    }, { headers: { 'Authorization': `Bearer ${ENV.CLOUDFLARE_API_KEY}` }, timeout: 4000 });
    return res.data.result.response.trim();
}

// =========================
// GITHUB CACHE SYSTEM - INASOMA METADATA YOTE
// =========================
async function updatePluginCacheFull() {
    if (Date.now() - lastCacheUpdate < CACHE_TTL && pluginCache.size > 0) return;

    try {
        const url = `https://api.github.com/repos/${ENV.GITHUB_OWNER}/${ENV.GITHUB_REPO}/contents/${ENV.GITHUB_PLUGINS_PATH}?ref=${ENV.GITHUB_BRANCH}`;
        const res = await axios.get(url, {
            headers: { 'Authorization': `token ${ENV.GITHUB_TOKEN}` },
            timeout: 15000
        });

        pluginCache.clear();
        aliasMap.clear();

        const promises = res.data.filter(f => f.name.endsWith('.js')).map(async (file) => {
            try {
                const codeRes = await axios.get(file.download_url, { timeout: 5000 });
                const code = codeRes.data;

                // Eval ili kuchukua metadata
                const pluginModule = { exports: {} };
                const moduleWrapper = new Function('module', 'exports', 'require', 'process', code);
                moduleWrapper(pluginModule, pluginModule.exports, require, process);

                const exp = pluginModule.exports;
                if (exp && exp.command) {
                    const pluginData = {
                        filename: file.name,
                        path: file.path,
                        url: file.download_url,
                        command: exp.command.toLowerCase(),
                        alias: (exp.alias || []).map(a => a.toLowerCase()),
                        description: exp.description || 'No description',
                        category: exp.category || 'uncategorized'
                    };

                    pluginCache.set(pluginData.command, pluginData);
                    aliasMap.set(pluginData.command, pluginData.command);

                    for (const a of pluginData.alias) {
                        aliasMap.set(a, pluginData.command);
                    }
                }
            } catch (e) {
                console.log(`Failed to parse ${file.name}:`, e.message);
            }
        });

        await Promise.all(promises);
        lastCacheUpdate = Date.now();
        console.log(`LUPPER: Cached ${pluginCache.size} plugins with metadata`);
    } catch (e) {
        console.log("CACHE ERROR:", e.message);
    }
}

// =========================
// SMART PLUGIN EXECUTOR
// =========================
async function executePlugin(m, sock, plugin, argsString, quoted, quotedType, ui) {
    try {
        // Pakua plugin fresh
        const pluginCode = await axios.get(plugin.url, {
            headers: { 'Authorization': `token ${ENV.GITHUB_TOKEN}` },
            timeout: 10000
        });

        // Eval plugin
        const pluginModule = { exports: {} };
        const moduleWrapper = new Function('module', 'exports', 'require', 'process', pluginCode.data);
        moduleWrapper(pluginModule, pluginModule.exports, require, process);

        const pluginExp = pluginModule.exports;
        if (!pluginExp ||!pluginExp.execute) throw 'Plugin haina execute';

        // Tengeneza context sahihi
        const args = argsString? argsString.split(' ').filter(Boolean) : [];

        // Kama plugin inataka media na kuna quoted, itumie
        let fakeM = {...m };
        if (quoted) {
            fakeM.message = {
                extendedTextMessage: {
                    contextInfo: { quotedMessage: quoted }
                }
            };
        }

        fakeM.body = `.${plugin.command} ${argsString}`.trim();
        fakeM.sender = m.sender;

        const fakeCtx = {
            args: args,
            userSettings: { style: 'normal', lang: 'en' },
            quoted: quoted,
            quotedType: quotedType
        };

        // Direct execute - HAKUNA MAJIBU YA KIROBOT
        await pluginExp.execute(fakeM, sock, fakeCtx);

    } catch (err) {
        await sock.sendMessage(m.chat, {
            text: `${ui.prefix} Plugin ${plugin.command} imefail: ${err.message.slice(0, 80)}`
        }, { quoted: m });
    }
}

// Reset AI count daily
setInterval(() => { aiCallCount = {}; }, 86400000);
