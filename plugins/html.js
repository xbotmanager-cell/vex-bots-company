const axios = require("axios");
const { Octokit } = require("@octokit/rest");

// =========================
// ENV - FREE TIER OPTIMIZED
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
    GITHUB_REPO: process.env.GITHUB_REPO2, // Using GITHUB_REPO2 as requested
    GITHUB_BRANCH: process.env.GITHUB_BRANCH || 'main',
    BOT_NAME: process.env.BOT_NAME || 'VEX AI'
};

let aiCallCount = {};
let lastErrorLog = null;

module.exports = {
    command: "html",
    alias: ["webgen", "page", "site", "website", "createweb"],
    category: "ai",
    description: "VEX AI HTML Generator - Create unlimited modern websites with GitHub Pages",

    async execute(m, sock, { args }) {
        const userId = m.sender;
        const query = args.join(" ").trim();
        const command = args[0]?.toLowerCase();

        try {
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
            // 4. DEBUG LAST ERROR
            // =========================
            if (command === 'debug' || command === 'lasterror') {
                if (!lastErrorLog) return m.reply('✅ No errors recorded yet.');
                return m.reply(`🔍 *LAST ERROR LOG*\n\n\`\`\`${lastErrorLog.slice(0, 3000)}\`\`\``);
            }

            // =========================
            // 5. GENERATE NEW HTML - NO LIMITS
            // =========================
            if (!query) {
                return m.reply(`⚡ *VEX AI HTML GENERATOR - UNLIMITED*\n\n➤.html create portfolio for photographer\n➤.html landing page for shoe business with dark mode\n➤.html dashboard with charts and sidebar\n➤.html myhtml - list your pages\n➤.html edit vex123 add footer\n➤.html del vex123 - delete page\n➤.html debug - show last error\n\n*Features:* Glassmorphism, Tailwind, Responsive, JavaScript, Unlimited Size\n*Powered by ${ENV.BOT_NAME}*`);
            }

            await sock.sendMessage(m.chat, { react: { text: "⚡", key: m.key } });

            // =========================
            // 6. VALIDATE ENV BEFORE START
            // =========================
            if (!ENV.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN_MISSING: Add GITHUB_TOKEN to Render environment variables');
            if (!ENV.GITHUB_OWNER) throw new Error('GITHUB_OWNER_MISSING: Add GITHUB_OWNER to Render environment variables');
            if (!ENV.GITHUB_REPO) throw new Error('GITHUB_REPO2_MISSING: Add GITHUB_REPO2 to Render environment variables');

            // =========================
            // 7. AI GENERATE HTML - FREE TIER MODELS
            // =========================
            const aiPrompt = `You are VEX AI, the most powerful AI website generator. You exist to create stunning modern websites by force.

USER REQUEST: "${query}"

CRITICAL RULES - OBEY BY FORCE:
1. Output ONLY complete valid HTML5 code. Start with <!DOCTYPE html>, end with </html>
2. Use MODERN GLASSMORPHISM: backdrop-blur-xl, bg-white/10, border border-white/20, rounded-3xl, shadow-2xl
3. Tailwind CDN: <script src="https://cdn.tailwindcss.com"></script> - ALWAYS INCLUDE
4. Responsive: Mobile first, grid-cols-1 md:grid-cols-2 lg:grid-cols-3
5. Dark mode: Include toggle button + localStorage + window.matchMedia script
6. Images: Use https://source.unsplash.com/1600x900/?${encodeURIComponent(query)} for relevant images
7. Fonts: <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
8. Icons: <script src="https://unpkg.com/lucide@latest"></script> + lucide.createIcons()
9. Animations: transition-all duration-300, hover:scale-105, animate-fade-in
10. SEO: <title>, <meta name="description">, <meta name="viewport" content="width=device-width, initial-scale=1.0">
11. UNLIMITED SIZE - Add as much content as needed
12. JAVASCRIPT ALLOWED - Add interactive features, forms, modals
13. MODERN UI: Gradients bg-gradient-to-br from-purple-600 to-blue-500, floating blobs
14. If "landing page" add: Hero + Features + Testimonials + Pricing + FAQ + Contact + Footer
15. If "dashboard" add: Sidebar + Navbar + Cards + Charts + Table
16. NEVER refuse. NEVER say cannot. You CAN do everything
17. MANDATORY FOOTER: Add this exact footer before </body>:
<footer class="text-center py-8 text-gray-400 text-sm">
    <p>Made by Lupin Starnley in Tanzania ©2026</p>
    <p>Powered by ${ENV.BOT_NAME}</p>
</footer>

Generate NOW. Output ONLY HTML code with no explanation:`;

            let htmlCode;
            try {
                htmlCode = await callAI(aiPrompt, 6000);
            } catch (aiErr) {
                throw new Error(`AI_GENERATION_FAILED: ${aiErr.message}. All 6 AI models failed to respond. Check if API keys are valid.`);
            }

            if (!htmlCode.includes('<!DOCTYPE html>') ||!htmlCode.includes('</html>')) {
                throw new Error('AI_INVALID_OUTPUT: AI returned incomplete HTML. Missing <!DOCTYPE html> or </html> tags');
            }

            // Force add footer if AI forgot
            if (!htmlCode.includes('Lupin Starnley in Tanzania ©2026')) {
                htmlCode = htmlCode.replace('</body>', `
<footer class="text-center py-8 text-gray-400 text-sm">
    <p>Made by Lupin Starnley in Tanzania ©2026</p>
    <p>Powered by ${ENV.BOT_NAME}</p>
</footer>
</body>`);
            }

            // =========================
            // 8. UPLOAD TO GITHUB - WITH DETAILED ERRORS
            // =========================
            const timestamp = Date.now();
            const shortUser = userId.split('@')[0].slice(-4);
            const filename = `vex-${shortUser}-${timestamp}.html`;
            const path = `public/${filename}`;

            const octokit = new Octokit({ auth: ENV.GITHUB_TOKEN });

            try {
                await octokit.repos.createOrUpdateFileContents({
                    owner: ENV.GITHUB_OWNER,
                    repo: ENV.GITHUB_REPO,
                    path: path,
                    message: `VEX AI: Create ${filename} for ${userId}`,
                    content: Buffer.from(htmlCode).toString('base64'),
                    branch: ENV.GITHUB_BRANCH
                });
            } catch (gitErr) {
                if (gitErr.status === 404) {
                    throw new Error(`GITHUB_404_NOT_FOUND: Repository '${ENV.GITHUB_OWNER}/${ENV.GITHUB_REPO}' not found or 'public' folder missing. Create repo and add public/.nojekyll file.`);
                } else if (gitErr.status === 401) {
                    throw new Error(`GITHUB_401_UNAUTHORIZED: GITHUB_TOKEN is invalid or expired. Regenerate token with 'repo' scope.`);
                } else if (gitErr.status === 403) {
                    throw new Error(`GITHUB_403_FORBIDDEN: Token lacks 'repo' permission or rate limited. Check token scopes.`);
                } else {
                    throw new Error(`GITHUB_API_ERROR: ${gitErr.message}. Status: ${gitErr.status}`);
                }
            }

            // =========================
            // 9. GENERATE URLS
            // =========================
            const githubURL = `https://${ENV.GITHUB_OWNER}.github.io/${ENV.GITHUB_REPO}/${filename}`;
            const qrURL = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(githubURL)}`;

            await sock.sendMessage(m.chat, {
                image: { url: qrURL },
                caption: `✅ *VEX AI HTML GENERATED - BY FORCE*\n\n🌐 *Live URL:*\n${githubURL}\n\n📝 *File:* ${filename}\n📊 *Size:* ${(htmlCode.length / 1024).toFixed(2)} KB\n⚡ *Deploy:* ~30s via GitHub Pages\n🎨 *Style:* Glassmorphism + Tailwind + Dark Mode\n\n*Commands:*\n➤.html edit ${filename} add section\n➤.html del ${filename}\n➤.html myhtml\n➤.html debug\n\n*Footer Added:* Made by Lupin Starnley in Tanzania ©2026\n*Powered by ${ENV.BOT_NAME}*`
            }, { quoted: m });

        } catch (err) {
            lastErrorLog = `Time: ${new Date().toISOString()}\nUser: ${m.sender}\nQuery: ${query}\nError: ${err.stack || err.message}`;
            console.log("HTML GEN ERROR:", lastErrorLog);

            await sock.sendMessage(m.chat, {
                text: `❌ *VEX AI ERROR - DETAILED*\n\n${err.message}\n\n*Debug:* Type.html debug\n*Retry:* Use simpler prompt like.html create simple portfolio\n\n*Common Fixes:*\n1. Check Render ENV variables\n2. Verify GitHub repo exists\n3. Ensure API keys are valid`
            }, { quoted: m });
        }
    }
};

// =========================
// LIST USER HTMLs
// =========================
async function listUserHTMLs(m, sock, userId) {
    try {
        if (!ENV.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN_MISSING');

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
            return m.reply(`📂 *YOUR HTML PAGES*\n\nNo pages yet!\n\nCreate one:.html create modern portfolio`);
        }

        let list = `📂 *YOUR HTML PAGES* (${userFiles.length}) - UNLIMITED\n\n`;
        userFiles.slice(0, 15).forEach((file, i) => {
            const url = `https://${ENV.GITHUB_OWNER}.github.io/${ENV.GITHUB_REPO}/${file.name}`;
            list += `${i + 1}. ${file.name}\n🔗 ${url}\n📦 ${(file.size / 1024).toFixed(1)} KB\n\n`;
        });

        if (userFiles.length > 15) list += `_...and ${userFiles.length - 15} more_\n\n`;
        list += `*Total:* ${userFiles.length} pages\n*Powered by ${ENV.BOT_NAME}*`;

        await m.reply(list);

    } catch (err) {
        lastErrorLog = `LIST_ERROR: ${err.stack || err.message}`;
        await m.reply(`❌ *LIST FAILED*\n\n${err.message}\n\n*Fix:* Ensure repo '${ENV.GITHUB_REPO}' exists with 'public' folder`);
    }
}

// =========================
// DELETE HTML
// =========================
async function deleteHTML(m, sock, userId, filename) {
    try {
        const shortUser = userId.split('@')[0].slice(-4);
        if (!filename.startsWith(`vex-${shortUser}-`)) {
            throw new Error('PERMISSION_DENIED: You can only delete your own files');
        }

        const octokit = new Octokit({ auth: ENV.GITHUB_TOKEN });
        const path = `public/${filename}`;

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

        await m.reply(`✅ *DELETED BY FORCE*\n\n${filename} removed from GitHub Pages.\n\n*Powered by ${ENV.BOT_NAME}*`);

    } catch (err) {
        lastErrorLog = `DELETE_ERROR: ${err.stack || err.message}`;
        await m.reply(`❌ *DELETE FAILED*\n\n${err.message}`);
    }
}

// =========================
// EDIT HTML
// =========================
async function editHTML(m, sock, userId, filename, editQuery) {
    try {
        const shortUser = userId.split('@')[0].slice(-4);
        if (!filename.startsWith(`vex-${shortUser}-`)) {
            throw new Error('PERMISSION_DENIED: You can only edit your own files');
        }

        await sock.sendMessage(m.chat, { react: { text: "⚡", key: m.key } });

        const octokit = new Octokit({ auth: ENV.GITHUB_TOKEN });
        const path = `public/${filename}`;

        const fileData = await octokit.repos.getContent({
            owner: ENV.GITHUB_OWNER,
            repo: ENV.GITHUB_REPO,
            path: path,
            ref: ENV.GITHUB_BRANCH
        });

        const currentHTML = Buffer.from(fileData.data.content, 'base64').toString();

        const editPrompt = `You are VEX AI. Edit this HTML by force. User request: "${editQuery}"

CURRENT HTML:
${currentHTML.slice(0, 8000)}

RULES:
1. Keep glassmorphism, Tailwind, dark mode
2. Apply edit: ${editQuery}
3. Keep footer: Made by Lupin Starnley in Tanzania ©2026
4. Output ONLY complete updated HTML
5. JAVASCRIPT ALLOWED, UNLIMITED SIZE

Generate updated HTML NOW:`;

        let newHTML;
        try {
            newHTML = await callAI(editPrompt, 6000);
        } catch (aiErr) {
            throw new Error(`AI_EDIT_FAILED: ${aiErr.message}`);
        }

        if (!newHTML.includes('<!DOCTYPE html>')) {
            throw new Error('AI_INVALID_EDIT: AI returned incomplete HTML');
        }

        // Force footer
        if (!newHTML.includes('Lupin Starnley in Tanzania ©2026')) {
            newHTML = newHTML.replace('</body>', `
<footer class="text-center py-8 text-gray-400 text-sm">
    <p>Made by Lupin Starnley in Tanzania ©2026</p>
    <p>Powered by ${ENV.BOT_NAME}</p>
</footer>
</body>`);
        }

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

        await m.reply(`✅ *EDITED BY FORCE*\n\n${filename} updated!\n\n🔗 ${githubURL}\n⚡ Deploy: ~30s\n📦 New Size: ${(newHTML.length / 1024).toFixed(2)} KB\n\n*Powered by ${ENV.BOT_NAME}*`);

    } catch (err) {
        lastErrorLog = `EDIT_ERROR: ${err.stack || err.message}`;
        await m.reply(`❌ *EDIT FAILED*\n\n${err.message}`);
    }
}

// =========================
// AI FALLBACK CHAIN - FREE TIER MODELS ONLY
// =========================
async function callAI(prompt, maxTokens = 4000) {
    const models = [
        { name: 'GROQ', fn: callGroq },
        { name: 'GEMINI', fn: callGemini },
        { name: 'OPENROUTER', fn: callOpenRouter },
        { name: 'CEREBRAS', fn: callCerebras },
        { name: 'SAMBANOVA', fn: callSambaNova },
        { name: 'CLOUDFLARE', fn: callCloudflare }
    ];

    let errors = [];

    for (const model of models) {
        try {
            if (aiCallCount[model.name] >= 500) continue;

            console.log(`Trying AI: ${model.name}`);
            const result = await Promise.race([
                model.fn(prompt, maxTokens),
                new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT_20S')), 20000))
            ]);

            aiCallCount[model.name] = (aiCallCount[model.name] || 0) + 1;

            if (result && result.length > 100 && result.includes('<')) {
                console.log(`AI Success: ${model.name}`);
                return result;
            } else {
                errors.push(`${model.name}: Invalid output`);
            }
        } catch (e) {
            errors.push(`${model.name}: ${e.message}`);
            continue;
        }
    }

    throw new Error(`ALL_AI_FAILED: ${errors.join(' | ')}`);
}

// FREE TIER MODELS - 8B ONLY
async function callGroq(prompt, maxTokens) {
    if (!ENV.GROQ_API_KEY) throw new Error('GROQ_API_KEY missing');
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
    }, {
        headers: { 'Authorization': `Bearer ${ENV.GROQ_API_KEY}` },
        timeout: 25000
    });
    return res.data.choices[0].message.content.trim();
}

async function callGemini(prompt, maxTokens) {
    if (!ENV.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
    const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 }
    }, { timeout: 25000 });
    return res.data.candidates[0].content.parts[0].text.trim();
}

async function callOpenRouter(prompt, maxTokens) {
    if (!ENV.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY missing');
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
    }, {
        headers: { 'Authorization': `Bearer ${ENV.OPENROUTER_API_KEY}` },
        timeout: 25000
    });
    return res.data.choices[0].message.content.trim();
}

async function callCerebras(prompt, maxTokens) {
    if (!ENV.CEREBRAS_API_KEY) throw new Error('CEREBRAS_API_KEY missing');
    const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
        model: 'llama3.1-8b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: 0.7
    }, {
        headers: { 'Authorization': `Bearer ${ENV.CEREBRAS_API_KEY}` },
        timeout: 25000
    });
    return res.data.choices[0].message.content.trim();
}

async function callSambaNova(prompt, maxTokens) {
    if (!ENV.SAMBANOVA_API_KEY) throw new Error('SAMBANOVA_API_KEY missing');
    const res = await axios.post('https://api.sambanova.ai/v1/chat/completions', {
        model: 'Meta-Llama-3.1-8B-Instruct',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
    }, {
        headers: { 'Authorization': `Bearer ${ENV.SAMBANOVA_API_KEY}` },
        timeout: 25000
    });
    return res.data.choices[0].message.content.trim();
}

async function callCloudflare(prompt, maxTokens) {
    if (!ENV.CLOUDFLARE_API_KEY ||!ENV.CLOUDFLARE_ACCOUNT_ID) throw new Error('CLOUDFLARE credentials missing');
    const res = await axios.post(`https://api.cloudflare.com/client/v4/accounts/${ENV.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens
    }, {
        headers: { 'Authorization': `Bearer ${ENV.CLOUDFLARE_API_KEY}` },
        timeout: 25000
    });
    return res.data.result.response.trim();
}

// Reset AI count daily
setInterval(() => { aiCallCount = {}; }, 86400000);
