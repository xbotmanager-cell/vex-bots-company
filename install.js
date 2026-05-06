const axios = require("axios");

// ================= CACHE =================
const installedCache = new Map();

module.exports = {
    command: "install",
    alias: ["plugin", "addcmd", "save"],
    category: "owner",
    description: "Pro AI plugin installer (lightweight safe version)",

    async execute(m, sock, ctx) {
        const { args, userSettings, prefix } = ctx;

        const style = userSettings?.style || "harsh";

        const ui = {
            harsh: {
                start: "🚀 𝕴𝖓𝖘𝖙𝖆𝖑𝖑𝖎𝖓𝖌 𝕻𝖑𝖚𝖌𝖎𝖓...",
                success: "✅ 𝕻𝖑𝖚𝖌𝖎𝖓 𝕯𝖊𝖕𝖑𝖔𝖞𝖊𝖉",
                update: "♻️ 𝕻𝖑𝖚𝖌𝖎𝖓 𝖚𝖕𝖉𝖆𝖙𝖊𝖉",
                exist: "⚠️ 𝕱𝖎𝖑𝖊 𝖆𝖑𝖗𝖊𝖆𝖉𝖞 𝖊𝖝𝖎𝖘𝖙𝖘",
                invalid: "🧠 𝕴𝖓𝖛𝖆𝖑𝖎𝖉 𝕮𝖔𝖉𝖊",
                react: "🛡️"
            },
            normal: {
                start: "📦 Installing plugin...",
                success: "✅ Installed successfully",
                update: "♻️ Updated",
                exist: "⚠️ Already exists",
                invalid: "🧠 Invalid code",
                react: "📦"
            },
            girl: {
                start: "💖 installing your plugin~",
                success: "💖 plugin added~",
                update: "💖 updated baby~",
                exist: "🥺 already exists~",
                invalid: "💔 broken code~",
                react: "🎀"
            }
        }[style];

        const token = process.env.GITHUB_TOKEN;
        const owner = "xbotmanager-cell";
        const repo = "vex-bots-company";

        if (!token) return m.reply("❌ GitHub token missing");

        await sock.sendMessage(m.chat, {
            react: { text: ui.react, key: m.key }
        });

        await m.reply(ui.start);

        // ================= ROLE CHECK =================
        const role = ctx.userRole || "owner";
        if (!["owner", "dev"].includes(role)) {
            return m.reply("🔐 No permission.");
        }

        // ================= INPUT =================
        let code = "";
        let filename = "";

        if (m.quoted?.text) {
            code = m.quoted.text;
            filename = args[0];
        }

        if (!code && args.join(" ").includes("|")) {
            [code, filename] = args.join(" ").split("|").map(v => v.trim());
        }

        if (!code || !filename) {
            return m.reply(`⚠️ Reply code or use: ${prefix}install code | file.js`);
        }

        if (!filename.endsWith(".js")) filename += ".js";

        const path = `plugins/${filename}`;

        try {

            // ================= SIMPLE AI CHECK =================
            if (code.includes("require(") && !code.includes("module.exports")) {
                return m.reply(ui.invalid + "\nMissing module.exports");
            }

            // ================= VERSION =================
            let version = (installedCache.get(path) || 0) + 1;
            installedCache.set(path, version);

            // ================= CHECK EXIST =================
            let sha = null;
            let exists = false;

            try {
                const res = await axios.get(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
                    { headers: { Authorization: `token ${token}` } }
                );

                sha = res.data.sha;
                exists = true;

            } catch {}

            // ================= UPLOAD =================
            const upload = await axios.put(
                `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
                {
                    message: exists
                        ? `Update ${filename} v${version}`
                        : `Create ${filename} v${version}`,
                    content: Buffer.from(code).toString("base64"),
                    ...(sha ? { sha } : {})
                },
                {
                    headers: {
                        Authorization: `token ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            if (upload.status === 200 || upload.status === 201) {
                global.__PLUGIN_RELOAD__ = true;

                return m.reply(
                    exists ? ui.update + ` v${version}` : ui.success + ` v${version}`
                );
            }

        } catch (err) {
            return m.reply(ui.exist + "\n\n" + (err.message || "error"));
        }
    }
};
