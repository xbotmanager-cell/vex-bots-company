const axios = require("axios");
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

// =========================
// CACHE SYSTEM - RAM ONLY
// =========================
let pluginCache = new Map();
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
    alias: ["lup", "lpr"],
    category: "ai",
    description: "Lupper - Msaidizi wa plugins na contacts",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'normal';
        const lang = userSettings?.lang || 'en';
        const query = args.join(" ").trim();

        // =========================
        // STYLES + FONTS
        // =========================
        const designs = {
            harsh: {
                react: "☣️",
                prefix: "☣️ 𝙇𝙐𝙋𝙀𝙍:",
                error: `☣️ 𝙇𝙐𝙋𝙋𝙀𝙍 𝙀𝙍𝙊𝙍 ☣️\n\n➤ 𝙍𝙚𝙖𝙨𝙤𝙣: 𝙉𝙊 𝘾𝙊𝙈𝘼𝙉𝘿\n➤ 𝙐𝙨𝙖𝙜𝙚:.lupper nipe menu\n➤ 𝙊𝙍:.lupper dp ya Ibra\n\n⚠️ 𝙎𝙔𝙎𝙏𝙀𝙈 𝙁𝘼𝙄𝙇𝙀𝘿`
            },
            normal: {
                react: "⚛️",
                prefix: "⚛️ LUPPER:",
                error: `❌ *LUPPER ERROR*\n\n➤ Reason: No command given\n➤ Usage:.lupper nipe menu\n➤ OR:.lupper dp ya Ibra\n\n⚠️ System Failed`
            },
            girl: {
                react: "💖",
                prefix: "💖 𝑳𝑼𝑷𝑬𝑹:",
                error: `💔 𝑳𝑼𝑷𝑷𝑬𝑹 𝑬𝑹𝑶𝑹 💔\n\n➤ 𝑹𝒆𝒂𝒔𝒐𝒏: 𝑵𝒐 𝒄𝒐𝒎𝒂𝒏𝒅\n➤ 𝑼𝒔𝒂𝒈𝒆:.lupper nipe menu\n➤ 𝑶𝑹:.lupper dp ya Ibra\n\n🌸 𝑻𝒓𝒚 𝑨𝒈𝒂𝒊𝒏`
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
            // 1. CHECK CACHE YA PLUGINS
            // =========================
            await updatePluginCache();

            // =========================
            // 2. AMUA KAZI: DP AU PLUGIN
            // =========================
            const lowerQuery = query.toLowerCase();

            if (lowerQuery.includes('dp') || lowerQuery.includes('picha') || lowerQuery.includes('profile')) {
                await handleDPRequest(m, sock, query, ui);
            } else {
                await handlePluginRequest(m, sock, query, ui);
            }

        } catch (err) {
            console.log("LUPPER ERROR:", err.message);
            await sock.sendMessage(m.chat, {
                text: `${ui.prefix} Nimeshindwa mkuu. ${err.message.slice(0, 50)}`
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
            if (aiCallCount[model.name] >= 200) continue; // Daily limit

            const result = await Promise.race([
                model.fn(prompt, type),
                new Promise((_, rej) => setTimeout(() => rej('Timeout'), 3000))
            ]);

            aiCallCount[model.name] = (aiCallCount[model.name] || 0) + 1;
            return result;
        } catch (e) {
            console.log(`${model.name} failed:`, e.message);
            continue;
        }
    }
    return "Nipo mkuu, ila AI zote zimelala. Jaribu tena.";
}

async function callGroq(prompt) {
    if (!ENV.GROQ_API_KEY) throw 'No key';
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: `Jibu kwa Kiswahili, sentensi 1 tu: ${prompt}` }],
        max_tokens: 60
    }, { headers: { 'Authorization': `Bearer ${ENV.GROQ_API_KEY}` } });
    return res.data.choices[0].message.content;
}

async function callCerebras(prompt) {
    if (!ENV.CEREBRAS_API_KEY) throw 'No key';
    const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
        model: 'llama3.1-8b',
        messages: [{ role: 'user', content: `Jibu kwa Kiswahili, sentensi 1: ${prompt}` }],
        max_tokens: 60
    }, { headers: { 'Authorization': `Bearer ${ENV.CEREBRAS_API_KEY}` } });
    return res.data.choices[0].message.content;
}

async function callSambaNova(prompt) {
    if (!ENV.SAMBANOVA_API_KEY) throw 'No key';
    const res = await axios.post('https://api.sambanova.ai/v1/chat/completions', {
        model: 'Meta-Llama-3.1-8B-Instruct',
        messages: [{ role: 'user', content: `Jibu kwa Kiswahili: ${prompt}` }],
        max_tokens: 60
    }, { headers: { 'Authorization': `Bearer ${ENV.SAMBANOVA_API_KEY}` } });
    return res.data.choices[0].message.content;
}

async function callGemini(prompt) {
    if (!ENV.GEMINI_API_KEY) throw 'No key';
    const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: `Jibu kwa Kiswahili, fupi: ${prompt}` }] }]
    });
    return res.data.candidates[0].content.parts[0].text;
}

async function callOpenRouter(prompt) {
    if (!ENV.OPENROUTER_API_KEY) throw 'No key';
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: `Jibu kwa Kiswahili: ${prompt}` }],
        max_tokens: 60
    }, { headers: { 'Authorization': `Bearer ${ENV.OPENROUTER_API_KEY}` } });
    return res.data.choices[0].message.content;
}

async function callCloudflare(prompt) {
    if (!ENV.CLOUDFLARE_API_KEY ||!ENV.CLOUDFLARE_ACCOUNT_ID) throw 'No key';
    const res = await axios.post(`https://api.cloudflare.com/client/v4/accounts/${ENV.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
        messages: [{ role: 'user', content: `Jibu kwa Kiswahili: ${prompt}` }]
    }, { headers: { 'Authorization': `Bearer ${ENV.CLOUDFLARE_API_KEY}` } });
    return res.data.result.response;
}

// =========================
// GITHUB CACHE SYSTEM
// =========================
async function updatePluginCache() {
    if (Date.now() - lastCacheUpdate < CACHE_TTL && pluginCache.size > 0) return;

    try {
        const url = `https://api.github.com/repos/${ENV.GITHUB_OWNER}/${ENV.GITHUB_REPO}/contents/${ENV.GITHUB_PLUGINS_PATH}?ref=${ENV.GITHUB_BRANCH}`;
        const res = await axios.get(url, {
            headers: { 'Authorization': `token ${ENV.GITHUB_TOKEN}` },
            timeout: 10000
        });

        pluginCache.clear();
        for (const file of res.data) {
            if (file.name.endsWith('.js')) {
                const name = file.name.replace('.js', '').toLowerCase();
                pluginCache.set(name, {
                    filename: file.name,
                    path: file.path,
                    url: file.download_url
                });
            }
        }
        lastCacheUpdate = Date.now();
        console.log(`LUPPER: Cached ${pluginCache.size} plugins`);
    } catch (e) {
        console.log("CACHE ERROR:", e.message);
    }
}

// =========================
// DP HANDLER
// =========================
async function handleDPRequest(m, sock, query, ui) {
    const nameMatch = query.match(/dp ya (.+)|picha ya (.+)|profile ya (.+)/i);
    const searchName = nameMatch? (nameMatch[1] || nameMatch[2] || nameMatch[3]).trim() : null;

    if (!searchName) {
        return sock.sendMessage(m.chat, {
            text: `${ui.prefix} Niambie jina la mtu mkuu. Mfano:.lupper dp ya Ibra`
        }, { quoted: m });
    }

    // Tafuta contact
    const contacts = await sock.contacts || {};
    let foundJid = null;

    for (const jid in contacts) {
        const contact = contacts[jid];
        if (contact.name && contact.name.toLowerCase().includes(searchName.toLowerCase())) {
            foundJid = jid;
            break;
        }
    }

    if (!foundJid) {
        const aiText = await callAI(`Mwambie user hajakusave ${searchName} kwenye contacts`);
        return sock.sendMessage(m.chat, {
            text: `${ui.prefix} ${aiText}`
        }, { quoted: m });
    }

    try {
        const ppUrl = await sock.profilePictureUrl(foundJid, 'image');
        const aiText = await callAI(`Tengeneza caption fupi ya DP ya ${searchName}`);

        await sock.sendMessage(m.chat, {
            image: { url: ppUrl },
            caption: `${ui.prefix} ${aiText}`
        }, { quoted: m });
    } catch {
        const aiText = await callAI(`Mwambie user ${searchName} hana DP au ameficha`);
        await sock.sendMessage(m.chat, {
            text: `${ui.prefix} ${aiText}`
        }, { quoted: m });
    }
}

// =========================
// PLUGIN HANDLER
// =========================
async function handlePluginRequest(m, sock, query, ui) {
    // Toa maneno ya ziada
    const cleanQuery = query.replace(/nipe|leta|onyesha|fungua|weka/gi, '').trim().toLowerCase();
    const words = cleanQuery.split(' ');

    // Tafuta plugin kwenye cache
    let foundPlugin = null;
    for (const word of words) {
        if (pluginCache.has(word)) {
            foundPlugin = pluginCache.get(word);
            break;
        }
    }

    if (!foundPlugin) {
        const aiText = await callAI(`Mwambie user sijapata plugin ya "${query}". Plugins zilizopo: ${Array.from(pluginCache.keys()).slice(0, 5).join(', ')}`);
        return sock.sendMessage(m.chat, {
            text: `${ui.prefix} ${aiText}`
        }, { quoted: m });
    }

    try {
        // Pakua plugin kutoka GitHub
        const pluginCode = await axios.get(foundPlugin.url, {
            headers: { 'Authorization': `token ${ENV.GITHUB_TOKEN}` }
        });

        // Eval plugin - HATARI LAKINI NI YAKO
        const pluginModule = {};
        const moduleWrapper = new Function('module', 'exports', 'require', pluginCode.data);
        moduleWrapper(pluginModule, pluginModule.exports, require);

        const plugin = pluginModule.exports;

        if (!plugin ||!plugin.execute) {
            throw 'Plugin haina execute function';
        }

        // Tengeneza fake context
        const fakeM = {...m, body: `.${foundPlugin.filename.replace('.js', '')}`, sender: m.sender };
        const fakeCtx = { args: [], userSettings: { style: 'normal', lang: 'en' } };

        // AI Message
        const aiText = await callAI(`Mwambie user umempata plugin ${foundPlugin.filename} na unairun sasa`);
        await sock.sendMessage(m.chat, {
            text: `${ui.prefix} ${aiText}`
        }, { quoted: m });

        // RUN PLUGIN
        await plugin.execute(fakeM, sock, fakeCtx);

    } catch (err) {
        const aiText = await callAI(`Mwambie user plugin ${foundPlugin.filename} imefail: ${err.message}`);
        await sock.sendMessage(m.chat, {
            text: `${ui.prefix} ${aiText}`
        }, { quoted: m });
    }
}

// Reset AI count daily
setInterval(() => { aiCallCount = {}; }, 86400000);
