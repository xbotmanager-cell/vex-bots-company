const axios = require("axios");
const translate = require("google-translate-api-x");

module.exports = {
    command: "install",
    alias: ["plugin", "addcmd", "save"],
    category: "owner",
    description: "VEX Advanced GitHub Plugin Installer",

    async execute(m, sock, ctx) {
        const { args, userSettings, prefix } = ctx;

        // --- PREFERENCES ---
        const style = userSettings?.style || "normal";
        const targetLang = userSettings?.lang || "en";

        // --- STYLE UI ---
        const modes = {
            harsh: {
                start: "🚀 𝕴𝖓𝖎𝖙𝖎𝖆𝖙𝖎𝖓𝖌 𝕯𝖊𝖕𝖑𝖔𝖞𝖒𝖊𝖓𝖙... 𝕾𝖙𝖆𝖞 𝖂𝖔𝖐𝖊.",
                success: "✅ 𝕻𝖑𝖚𝖌𝖎𝖓 𝕾𝖚𝖈𝖈𝖊𝖘𝖘𝖋𝖚𝖑𝖑𝖞 𝕴𝖓𝖘𝖙𝖆𝖑𝖑𝖊𝖉.",
                update: "♻️ 𝕻𝖑𝖚𝖌𝖎𝖓 𝖀𝖕𝖉𝖆𝖙𝖊𝖉 𝖎𝖓 𝕮𝖑𝖔𝖚𝖉.",
                fail: "❌ 𝕯𝖊𝖕𝖑𝖔𝖞𝖒𝖊𝖓𝖙 𝕱𝖆𝖎𝖑𝖊𝖉: 𝕲𝖎𝖙𝕳𝖚𝖇 𝕽𝖊𝖏𝖊𝖈𝖙𝖊𝖉.",
                react: "🛡️"
            },
            normal: {
                start: "📤 Uploading plugin to GitHub...",
                success: "✅ Plugin installed successfully.",
                update: "♻️ Plugin updated successfully.",
                fail: "❌ Error: GitHub upload failed.",
                react: "📤"
            },
            girl: {
                start: "💖 𝒾𝓃𝓈𝓉𝒶𝓁𝓁𝒾𝓃𝑔 𝓎𝑜𝓊𝓇 𝒸𝓊𝓉𝑒 𝓅𝓁𝓊𝑔𝒾𝓃~ ✨",
                success: "💖 𝓅𝓁𝓊𝑔𝒾𝓃 𝓈𝒶𝓋𝑒𝒹 𝓈𝓊𝒸𝒸𝑒𝓈𝓈𝓯𝓊𝓁𝓁𝓎, 𝒷𝒶𝒷𝑒~ 🎀",
                update: "💖 𝓅𝓁𝓊𝑔𝒾𝓃 𝓊𝓅𝒹𝒶𝓉𝑒𝒹 𝒻𝑜𝓇 𝓎𝑜𝓊~ 🍭",
                fail: "💔 𝑜𝑜𝓅𝓈𝒾𝑒, 𝑔𝒾𝓉𝒽𝓊𝒷 𝒽𝒶𝓈 𝒶𝓃 𝑒𝓇𝓇𝑜𝓇~ 🥺",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;
        const token = process.env.GITHUB_TOKEN;
        const owner = "xbotmanager-cell";
        const repo = "vex-bots-company";

        if (!token) return m.reply("❌ Fatal: GITHUB_TOKEN is not defined in Environment Variables.");

        // --- DYNAMIC INPUT LOGIC ---
        let code = "";
        let filename = "";

        // Mode 1: Reply to a message
        if (m.quoted) {
            code = m.quoted.text || m.quoted.caption || m.quoted.conversation;
            filename = args[0];
        } 
        // Mode 2: Using the $ separator
        else {
            const fullContent = args.join(" ");
            if (fullContent.includes("$")) {
                const parts = fullContent.split("$");
                filename = parts.pop().trim(); // Last part is filename
                code = parts.join("$").trim(); // Everything before is code
            }
        }

        if (!code || !filename) {
            return m.reply(`⚠️ *VEX INSTALLER ERROR*\n\nUsage 1 (Reply): ${prefix}install hello.js\nUsage 2 (Direct): ${prefix}install [code] $ hello.js`);
        }

        if (!filename.endsWith(".js")) filename += ".js";
        const path = `plugins/${filename}`;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // Translate Start Message
            let startMsg = current.start;
            if (targetLang !== 'en') {
                const res = await translate(startMsg, { to: targetLang });
                startMsg = res.text;
            }
            await m.reply(startMsg);

            // GitHub SHA Check
            let sha = null;
            let exists = false;
            try {
                const check = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                    headers: { Authorization: `token ${token}` }
                });
                sha = check.data.sha;
                exists = true;
            } catch (e) {}

            // GitHub Upload
            const upload = await axios.put(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                message: `${exists ? 'Update' : 'Create'} ${filename} via VEX System`,
                content: Buffer.from(code).toString("base64"),
                ...(sha ? { sha } : {})
            }, {
                headers: { 
                    Authorization: `token ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (upload.status === 200 || upload.status === 201) {
                let finalMsg = exists ? current.update : current.success;
                if (targetLang !== 'en') {
                    const res = await translate(finalMsg, { to: targetLang });
                    finalMsg = res.text;
                }
                return m.reply(finalMsg);
            }

        } catch (error) {
            console.error("INSTALL ERROR:", error);
            let failMsg = current.fail + "\n\n" + (error.response?.data?.message || error.message);
            if (targetLang !== 'en') {
                const res = await translate(failMsg, { to: targetLang });
                failMsg = res.text;
            }
            return m.reply(failMsg);
        }
    }
};
