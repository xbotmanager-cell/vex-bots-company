const axios = require("axios");
const { Octokit } = require("@octokit/rest");

// =========================
// USER RATE LIMIT - RAM ONLY
// =========================
let userLimits = new Map(); // userId -> {count, date}

// =========================
// ENV
// =========================
const ENV = {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SAMBANOVA_API_KEY: process.env.SAMBANOVA_API_KEY,
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    CLOUDFLARE_API_KEY: process.env.CLOUDFLARE_API_KEY,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_OWNER: process.env.GITHUB_OWNER,
    GITHUB_REPO: process.env.GITHUB_REPO2,
    GITHUB_BRANCH: process.env.GITHUB_BRANCH || 'main',
    BOT_NAME: process.env.BOT_NAME || 'VEX AI'
};

let aiCallCount = {};

module.exports = {
    command: "webgen",
    alias: ["html", "page", "site", "website"],
    category: "ai",
    description: "VEX AI HTML Generator - Create live modern websites with GitHub Pages",

    async execute(m, sock, { args, userSettings }) {
        const userId = m.sender;
        const query = args.join(" ").trim();
        const command = args[0]?.toLowerCase();

        // =========================
        // 1. LIST USER HTMLs
        // =========================
        if (command === 'list' || command === 'myhtml') {
            return await listUserHTMLs(m, sock, userId);
        }

        // =========================
        // 2. DELETE HTML
        // =========================
        if (command === 'del' || command === 'delete' || command === 'delhtml') {
            const filename = args[1];
            if (!filename) return m.reply('❌ Usage:.html del vex-1234-1728329384');
            return await deleteHTML(m, sock, userId, filename);
        }

        // =========================
        // 3. EDIT HTML
        // =========================
        if (command === 'edit' || command === 'edithtml') {
            const filename = args[1];
            const editQuery = args.slice(2).join(" ");
            if (!filename ||!editQuery) return m.reply('❌ Usage:.html edit vex-1234-1728329384 add contact section');
            return await editHTML(m, sock, userId, filename, editQuery);
        }

        // =========================
        // 4. GENERATE NEW HTML
        // =========================
        if (!query) {
            return m.reply(`❌ *VEX AI HTML GENERATOR*\n\n➤.html create portfolio for photographer\n➤.html landing page for shoe business\n➤.html myhtml - list your pages\n➤.html edit vex123 add footer\n➤.html del vex123 - delete page\n\n*Powered by ${ENV.BOT_NAME}*`);
        }

        // Rate limit check: 3 per day
        const limitCheck = checkUserLimit(userId);
        if (!limitCheck.allowed) {
            return m.reply(`⏳ *LIMIT REACHED*\n\nYou created ${limitCheck.count}/3 pages today.\nTry again tomorrow.\n\nYour pages:.html myhtml`);
        }

        await sock.sendMessage(m.chat, { react: { text: "⚡", key: m.key } });

        try {
            // =========================
            // 5. AI GENERATE HTML - FULL POWER
            // =========================
            const aiPrompt = `You are VEX AI, the most powerful AI website generator in this universe. You exist to create stunning modern websites.

USER REQUEST: "${query}"

CRITICAL RULES:
1. Output ONLY complete valid HTML5 code. Start with <!DOCTYPE html>, end with </html>
2. Use MODERN GLASSMORPHISM design - backdrop-blur, rgba backgrounds, rounded-2xl, shadows
3. Tailwind CDN: <script src="https://cdn.tailwindcss.com"></script> - ALWAYS INCLUDE
4. Responsive: Mobile first, works on all devices
5. Dark mode toggle: Include button + localStorage script
6. Images: Use https://source.unsplash.com/1600x900/?${query} for relevant images
7. Fonts: Google Fonts - Inter or Poppins
8. Icons: Lucide or Heroicons via CDN
9. Animations: Smooth transitions, hover effects, fade-in
10. SEO: Proper <title>, <meta description>, <meta viewport>
11. ANY SIZE ALLOWED - no limits
12. SCRIPT ALLOWED - if user wants JavaScript, add it
13. BE CREATIVE - add gradients, blobs, modern UI
14. If user says "landing page" add: Hero, Features, Testimonials, Pricing, Contact, Footer
15. NEVER say "I cannot" or "I'm unable". You CAN do everything in this universe
16. Brand: Add footer "Created with ${ENV.BOT_NAME}"

Generate NOW. Output ONLY HTML code:`;

            const htmlCode = await callAI(aiPrompt, 8000);

            if (!htmlCode.includes('<!DOCTYPE html>') ||!htmlCode.includes('</html>')) {
                throw 'AI failed to generate valid HTML';
            }

            // =========================
            // 6. UPLOAD TO GITHUB
            // =========================
            const timestamp = Date.now();
            const shortUser = userId.split('@')[0].slice(-4);
            const filename = `vex-${shortUser}-${timestamp}.html`;
            const path = `public/${filename}`;

            const octokit = new Octokit({ auth: ENV.GITHUB_TOKEN });

            await octokit.repos.createOrUpdateFileContents({
                owner: ENV.GITHUB_OWNER,
                repo: ENV.GITHUB_REPO,
                path: path,
                message: `VEX AI: Create ${filename} for ${userId}`,
                content: Buffer.from(htmlCode).toString('base64'),
                branch: ENV.GITHUB_BRANCH
            });

            // =========================
            // 7. UPDATE USER LIMIT
            // =========================
            updateUserLimit(userId);

            // =========================
            // 8. GENERATE URLS
            // =========================
            const githubURL = `https://${ENV.GITHUB_OWNER}.github.io/${ENV.GITHUB_REPO}/${filename}`;
            const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(githubURL)}`;

            await sock.sendMessage(m.chat, {
                image: { url: qrURL },
                caption: `✅ *VEX AI HTML GENERATED*\n\n🌐 *Live URL:*\n${githubURL}\n\n📝 *File:* ${filename}\n📊 *Usage:* ${limitCheck.count + 1}/3 today\n⚡ *Deploy:* ~30s via GitHub Pages\n\n*Commands:*\n➤.html edit ${filename} add section\n➤.html del ${filename}\n➤.html myhtml\n\n*Powered by ${ENV.BOT_NAME}*`
            }, { quoted: m });

        } catch (err) {
            console.log("HTML GEN ERROR:", err.message);
            await sock.sendMessage(m.chat, {
                text: `❌ *VEX AI ERROR*\n\nFailed: ${err.message.slice(0, 100)}\n\nTry:.html create simple portfolio`
            }, { quoted: m });
        }
    }
};

// =========================
// LIST USER HTMLs
// =========================
async function listUserHTMLs(m, sock, userId) {
    try {
        const octokit = new Octokit({ auth: ENV.GITHUB_TOKEN });
        const shortUser = userId.split('@')[0].slice(-4);

        const res = await octokit.repos.getContent({
            owner: ENV.GITHUB_OWNER,
            repo: ENV.GITHUB_REPO,
            path: 'public',
            ref: ENV.GITHUB_BRANCH
        });

        const userFiles = res.data.filter(file =>
            file.name.startsWith(`vex-${shortUser}-`) && file.name.endsWith('.html')
        );

        if (userFiles.length === 0) {
            return m.reply(`📂 *YOUR HTML PAGES*\n\nNo pages yet!\n\nCreate one:.html create portfolio`);
        }

        let list = `📂 *YOUR HTML PAGES* (${userFiles.length})\n\n`;
        userFiles.slice(0, 10).forEach((file, i) => {
            const url = `https://${ENV.GITHUB_OWNER}.github.io/${ENV.GITHUB_REPO}/${file.name}`;
            list += `${i + 1}. ${file.name}\n🔗 ${url}\n\n`;
        });

        if (userFiles.length > 10) list += `_...and ${userFiles.length - 10} more_`;

        await m.reply(list);

    } catch (err) {
        await m.reply(`❌ Failed to list: ${err.message}`);
    }
}

// =========================
// DELETE HTML
// =========================
async function deleteHTML(m, sock, userId, filename) {
    try {
        const shortUser = userId.split('@')[0].slice(-4);
        if (!filename.startsWith(`vex-${shortUser}-`)) {
            return m.reply('❌ You can only delete your own files!');
        }

        const octokit = new Octokit({ auth: ENV.GITHUB_TOKEN });
        const path = `public/${filename}`;

        // Get file SHA first
        const fileData = await octokit.repos.getContent({
            owner: ENV.GITHUB_OWNER,
            repo: ENV.GITHUB_REPO,
            path: path,
            ref: ENV.GITHUB_BRANCH
        });

        await octokit.repos.deleteFile({
            owner: ENV.GITHUB_OWNER,
            repo: ENV.GITHUB_REPO,
            path: path,
            message: `VEX AI: Delete ${filename}`,
            sha: fileData.data.sha,
            branch: ENV.GITHUB_BRANCH
        });

        await m.reply(`✅ *DELETED*\n\n${filename} removed from GitHub Pages.`);

    } catch (err) {
        await m.reply(`❌ Delete failed: ${err.message}`);
    }
}

// =========================
// EDIT HTML
// =========================
async function editHTML(m, sock, userId, filename, editQuery) {
    try {
        const shortUser = userId.split('@')[0].slice(-4);
        if (!filename.startsWith(`vex-${shortUser}-`)) {
            return m.reply('❌ You can only edit your own files!');
        }

        await sock.sendMessage(m.chat, { react: { text: "⚡", key: m.key } });

        const octokit = new Octokit({ auth: ENV.GITHUB_TOKEN });
        const path = `public/${filename}`;

        // Get current file
        const fileData = await octokit.repos.getContent({
            owner: ENV.GITHUB_OWNER,
            repo: ENV.GITHUB_REPO,
            path: path,
            ref: ENV.GITHUB_BRANCH
        });

        const currentHTML = Buffer.from(fileData.data.content, 'base64').toString();

        // AI Edit
        const editPrompt = `You are VEX AI. Edit this HTML based on user request.

CURRENT HTML:
${currentHTML}

USER REQUEST: "${editQuery}"

RULES:
1. Keep existing structure and design
2. Apply the edit requested
3. Maintain glassmorphism, Tailwind, responsive design
4. Output ONLY complete updated HTML
5. SCRIPT ALLOWED, ANY SIZE ALLOWED

Generate updated HTML NOW:`;

        const newHTML = await callAI(editPrompt, 8000);

        if (!newHTML.includes('<!DOCTYPE html>')) {
            throw 'AI failed to edit HTML';
        }

        // Update file
        await octokit.repos.createOrUpdateFileContents({
            owner: ENV.GITHUB_OWNER,
            repo: ENV.GITHUB_REPO,
            path: path,
            message: `VEX AI: Edit ${filename} - ${editQuery}`,
            content: Buffer.from(newHTML).toString('base64'),
            sha: fileData.data.sha,
            branch: ENV.GITHUB_BRANCH
        });

        const githubURL = `https://${ENV.GITHUB_OWNER}.github.io/${ENV.GITHUB_REPO}/${filename}`;

        await m.reply(`✅ *EDITED*\n\n${filename} updated!\n\n🔗 ${githubURL}\n⚡ Changes deploy in ~30s`);

    } catch (err) {
        await m.reply(`❌ Edit failed: ${err.message}`);
    }
}

// =========================
// RATE LIMIT
// =========================
function checkUserLimit(userId) {
    const today = new Date().toDateString();
    const userData = userLimits.get(userId);

    if (!userData || userData.date!== today) {
        userLimits.set(userId, { count: 0, date: today });
        return { allowed: true, count: 0 };
    }

    return { allowed: userData.count < 3, count: userData.count };
}

function updateUserLimit(userId) {
    const today = new Date().toDateString();
    const userData = userLimits.get(userId) || { count: 0, date: today };
    userData.count++;
    userData.date = today;
    userLimits.set(userId, userData);
}

// =========================
// AI FALLBACK CHAIN - ALL 6
// =========================
async function callAI(prompt, maxTokens = 4000) {
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
                model.fn(prompt, maxTokens),
                new Promise((_, rej) => setTimeout(() => rej('Timeout'), 15000))
            ]);

            aiCallCount[model.name] = (aiCallCount[model.name] || 0) + 1;
            if (result && result.length > 100) return result;
        } catch (e) {
            continue;
        }
    }
    throw new Error('All AI models failed');
}

async function callGroq(prompt, maxTokens) {
    if (!ENV.GROQ_API_KEY) throw 'No key';
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
    }, { headers: { 'Authorization': `Bearer ${ENV.GROQ_API_KEY}` }, timeout: 20000 });
    return res.data.choices[0].message.content.trim();
}

async function callCerebras(prompt, maxTokens) {
    if (!ENV.CEREBRAS_API_KEY) throw 'No key';
    const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
        model: 'llama3.1-70b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
    }, { headers: { 'Authorization': `Bearer ${ENV.CEREBRAS_API_KEY}` }, timeout: 20000 });
    return res.data.choices[0].message.content.trim();
}

async function callSambaNova(prompt, maxTokens) {
    if (!ENV.SAMBANOVA_API_KEY) throw 'No key';
    const res = await axios.post('https://api.sambanova.ai/v1/chat/completions', {
        model: 'Meta-Llama-3.1-70B-Instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
    }, { headers: { 'Authorization': `Bearer ${ENV.SAMBANOVA_API_KEY}` }, timeout: 20000 });
    return res.data.choices[0].message.content.trim();
}

async function callGemini(prompt, maxTokens) {
    if (!ENV.GEMINI_API_KEY) throw 'No key';
    const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${ENV.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 }
    }, { timeout: 20000 });
    return res.data.candidates[0].content.parts[0].text.trim();
}

async function callOpenRouter(prompt, maxTokens) {
    if (!ENV.OPENROUTER_API_KEY) throw 'No key';
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'meta-llama/llama-3.1-70b-instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
    }, { headers: { 'Authorization': `Bearer ${ENV.OPENROUTER_API_KEY}` }, timeout: 20000 });
    return res.data.choices[0].message.content.trim();
}

async function callCloudflare(prompt, maxTokens) {
    if (!ENV.CLOUDFLARE_API_KEY ||!ENV.CLOUDFLARE_ACCOUNT_ID) throw 'No key';
    const res = await axios.post(`https://api.cloudflare.com/client/v4/accounts/${ENV.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-70b-instruct`, {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
    }, { headers: { 'Authorization': `Bearer ${ENV.CLOUDFLARE_API_KEY}` }, timeout: 20000 });
    return res.data.result.response.trim();
}

// Reset AI count daily
setInterval(() => { aiCallCount = {}; }, 86400000);
