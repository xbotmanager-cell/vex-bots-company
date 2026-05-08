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
    alias: ["lup", "lpr", "ai", "vex"],
    category: "ai",
    description: "Lupper - AI Msaidizi anayejua plugins zote 200+ na aina zote za message",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style?.value || userSettings?.style || 'normal';
        const lang = userSettings?.lang || 'en';
        const query = args.join(" ").trim();

        // =========================
        // NEW: SUPER MESSAGE ANALYZER
        // =========================
        const msgInfo = analyzeMessage(m, sock);

        const designs = {
            harsh: {
                react: "☣️",
                prefix: "☣️ 𝙇𝙐𝙋𝙀𝙍:",
                error: `☣️ 𝙇𝙐𝙋𝙀𝙍 𝙀𝙍𝙊𝙍 ☣️\n\n➤ 𝙐𝙨𝙖𝙜𝙚:.lupper nipe jid\n➤ 𝙊𝙍:.lupper tengeneza paka\n➤ 𝙊𝙍: Reply picha +.lupper toi`
            },
            normal: {
                react: "⚛️",
                prefix: "⚛️ LUPPER:",
                error: `❌ *LUPPER*\n\n➤ Usage:.lupper nipe jid\n➤ OR:.lupper tengeneza paka\n➤ OR: Reply picha +.lupper enhance`
            },
            girl: {
                react: "💖",
                prefix: "💖 𝑳𝑼𝑷𝑬𝑹:",
                error: `💔 𝑳𝑼𝑷𝑬𝑹 💔\n\n➤ 𝑼𝒔𝒂𝒈𝒆:.lupper nipe jid\n➤ 𝑶𝑹:.lupper tengeneza paka`
            }
        };

        const ui = designs[style] || designs.normal;

        if (!query &&!msgInfo.hasMedia &&!msgInfo.isReply) {
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
            // 2. AI INTENT DETECTION - UBONGO WA LUPPER V2
            // =========================
            const pluginList = Array.from(pluginCache.values()).map(p => ({
                name: p.command,
                aliases: p.alias,
                desc: p.description,
                category: p.category
            }));

            const intentPrompt = `You are VEX AI Brain. Analyze user intent.
User query: "${query}".
Context: ${JSON.stringify({
                isGroup: msgInfo.isGroup,
                isPrivate: msgInfo.isPrivate,
                isBotDM: msgInfo.isBotDM,
                isStatus: msgInfo.isStatus,
                messageType: msgInfo.messageType,
                hasMedia: msgInfo.hasMedia,
                replyType: msgInfo.replyType,
                hasQuotedText: msgInfo.hasQuotedText
            })}.
Available plugins: ${JSON.stringify(pluginList.slice(0, 40))}... total ${pluginList.length}.
Rules:
1. If user replied to image/sticker/video/audio/doc and says "toi", "hd", "enhance", choose plugin for image processing.
2. If user says "jid", "id", "getid" choose getjid.
3. If user says "tengeneza", "picha", "image", "gen" choose deapi or image gen plugin.
4. If user says "dp ya", "picha ya" choose getpp.
5. If no plugin matches, use "none".
Output JSON only: {"plugin":"name", "args":"extracted args", "reason":"short"}`;

            const aiResponse = await callAI(intentPrompt);
            let intent;
            try {
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                intent = JSON.parse(jsonMatch[0]);
            } catch {
                intent = { plugin: "none", args: query, reason: "parse fail" };
            }

            // =========================
            // 3. EXECUTE BASED ON INTENT
            // =========================
            if (intent.plugin === "none" ||!pluginCache.has(intent.plugin)) {
                // HAKUNA PLUGIN - JIBU KAMA AI SUPER
                const contextDesc = `User uko ${msgInfo.isGroup? 'group' : msgInfo.isStatus? 'status' : 'DM'}.
Ametuma ${msgInfo.messageType}. ${msgInfo.isReply? 'Reply ya ' + msgInfo.replyType : 'Hakuna reply'}.
Anasema: "${query}"`;

                const helpText = await callAI(`Wewe ni VEX AI. ${contextDesc}.
Sijapata plugin. Plugins zilizopo: ${Array.from(pluginCache.keys()).slice(0, 10).join(', ')}.
Jibu kwa kifupi, msaada user afanye nini. Usiseme "ninabidi nisome". Anza direct.`);

                return sock.sendMessage(m.chat, {
                    text: `${ui.prefix} ${helpText}`
                }, { quoted: m });
            }

            const targetPlugin = pluginCache.get(intent.plugin);
            await executePlugin(m, sock, targetPlugin, intent.args, msgInfo, ui, userSettings);

        } catch (err) {
            console.log("LUPPER ERROR:", err.message);
            await sock.sendMessage(m.chat, {
                text: `${ui.prefix} Nimekwama: ${err.message.slice(0, 60)}`
            }, { quoted: m });
        }
    }
};

// =========================
// SUPER MESSAGE ANALYZER - NGUVU KUU
// =========================
function analyzeMessage(m, sock) {
    const msg = m.message || {};
    const contextInfo = msg.extendedTextMessage?.contextInfo || msg.imageMessage?.contextInfo || msg.videoMessage?.contextInfo || {};
    const quoted = contextInfo.quotedMessage;
    const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

    // Basic types
    let messageType = getContentType(m.message);
    let replyType = 'none';
    if (quoted) replyType = getContentType(quoted);

    // ViewOnce detection
    if (msg.viewOnceMessage) messageType = 'viewonce';
    if (msg.viewOnceMessageV2) messageType = 'viewonce2';
    if (quoted?.viewOnceMessage) replyType = 'viewonce';
    if (quoted?.viewOnceMessageV2) replyType = 'viewonce2';

    // Status detection
    const isStatus = m.chat === 'status@broadcast' || m.key.remoteJid === 'status@broadcast';

    // Group/DM detection
    const isGroup = m.chat.endsWith('@g.us');
    const isPrivate = m.chat.endsWith('@s.whatsapp.net');
    const isBotDM = m.chat === botNumber;

    // Media detection
    const hasMedia = ['image', 'video', 'audio', 'document', 'sticker', 'viewonce2'].includes(messageType);
    const hasReplyMedia = ['image', 'video', 'audio', 'document', 'sticker', 'viewonce', 'viewonce2'].includes(replyType);

    // Emoji detection
    const textContent = msg.conversation || msg.extendedTextMessage?.text || '';
    const isEmoji = /^[\p{Emoji}\s]+$/u.test(textContent) && textContent.length <= 5;

    // Document type
    let docType = null;
    if (messageType === 'document') {
        const mimetype = msg.documentMessage?.mimetype || '';
        if (mimetype.includes('pdf')) docType = 'pdf';
        else if (mimetype.includes('zip')) docType = 'zip';
        else if (mimetype.includes('word')) docType = 'docx';
        else docType = 'other';
    }

    return {
        isGroup,
        isPrivate,
        isBotDM,
        isStatus,
        messageType: isEmoji? 'emoji' : messageType,
        replyType,
        hasMedia,
        hasReplyMedia,
        isReply:!!quoted,
        hasQuotedText:!!(quoted?.conversation || quoted?.extendedTextMessage?.text),
        quotedText: quoted?.conversation || quoted?.extendedTextMessage?.text || '',
        quoted: quoted,
        docType,
        textContent,
        isEmoji,
        sender: m.sender,
        chat: m.chat,
        botNumber
    };
}

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
        max_tokens: 150,
        temperature: 0.3
    }, { headers: { 'Authorization': `Bearer ${ENV.GROQ_API_KEY}` }, timeout: 4000 });
    return res.data.choices[0].message.content.trim();
}

async function callCerebras(prompt) {
    if (!ENV.CEREBRAS_API_KEY) throw 'No key';
    const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
        model: 'llama3.1-8b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.3
    }, { headers: { 'Authorization': `Bearer ${ENV.CEREBRAS_API_KEY}` }, timeout: 4000 });
    return res.data.choices[0].message.content.trim();
}

async function callSambaNova(prompt) {
    if (!ENV.SAMBANOVA_API_KEY) throw 'No key';
    const res = await axios.post('https://api.sambanova.ai/v1/chat/completions', {
        model: 'Meta-Llama-3.1-8B-Instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150
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
        max_tokens: 150
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
// SMART PLUGIN EXECUTOR - NGUVU KAMILI
// =========================
async function executePlugin(m, sock, plugin, argsString, msgInfo, ui, userSettings) {
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

        // Tengeneza context sahihi na NGUVU ZOTE
        const args = argsString? argsString.split(' ').filter(Boolean) : [];

        // Kama plugin inataka media na kuna quoted, itumie
        let fakeM = {...m };
        if (msgInfo.quoted) {
            fakeM.message = {
                extendedTextMessage: {
                    contextInfo: { quotedMessage: msgInfo.quoted }
                }
            };
        }

        fakeM.body = `.${plugin.command} ${argsString}`.trim();
        fakeM.sender = m.sender;

        // NEW: CONTEXT KAMILI KWA PLUGIN
        const fakeCtx = {
            args: args,
            userSettings: userSettings || { style: 'normal', lang: 'en' },
            quoted: msgInfo.quoted,
            quotedType: msgInfo.replyType,
            msgInfo: msgInfo, // NGUVU MPYA
            isGroup: msgInfo.isGroup,
            isPrivate: msgInfo.isPrivate,
            isBotDM: msgInfo.isBotDM,
            isStatus: msgInfo.isStatus,
            messageType: msgInfo.messageType,
            hasMedia: msgInfo.hasMedia,
            hasReplyMedia: msgInfo.hasReplyMedia,
            docType: msgInfo.docType,
            isEmoji: msgInfo.isEmoji
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
