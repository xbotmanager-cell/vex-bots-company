const translate = require("google-translate-api-x");
const fs = require("fs");
const path = require("path");

module.exports = {
    command: "menu",
    category: "system",
    description: "Advanced categorized interface with numerical mapping",

    async execute(m, sock, ctx) {
        const { args, userSettings, cache } = ctx;

        const lang =
            args[0] && args[0].length === 2
                ? args[0]
                : userSettings?.lang || "en";

        const style = userSettings?.style || "harsh";

        const pluginDir = path.join(__dirname, "../plugins");

        let categories = new Set();

        try {
            const files = fs.readdirSync(pluginDir);

            for (const file of files) {
                if (!file.endsWith(".js")) continue;

                try {
                    const pluginPath = path.join(pluginDir, file);

                    delete require.cache[require.resolve(pluginPath)];
                    const plugin = require(pluginPath);

                    if (plugin?.category) {
                        categories.add(plugin.category.toLowerCase());
                    }
                } catch {}
            }
        } catch {
            return sock.sendMessage(m.chat, {
                text: "⚠️ Interface loading failed"
            });
        }

        const sorted = Array.from(categories).sort();

        // ================= CACHE MAP =================
        cache.set(`menu_map_${m.chat}`, sorted);

        // ================= BUILD LIST =================
        let list = "";
        sorted.forEach((cat, i) => {
            const num = (i + 1).toString().padStart(2, "0");
            list += `│ ${num} ➤ ${cat.toUpperCase()}\n`;
        });

        // ================= DESIGNS =================
        const designs = {
            harsh: {
                head: `╭━━━〔 *VEX CORE* 〕━━━╮
┃ 👤 @${m.sender.split("@")[0]}
┃ ⚡ Mode: HARSH
╰━━━━━━━━━━━━━━━━╯`,
                foot: "╰─➤ Reply with number.",
                react: "☣️"
            },
            normal: {
                head: `╭━━━〔 *VEX PANEL* 〕━━━╮
┃ 👤 @${m.sender.split("@")[0]}
┃ 📡 Stable System
╰━━━━━━━━━━━━━━━━╯`,
                foot: "╰─➤ Choose category.",
                react: "📋"
            },
            girl: {
                head: `🌸 ╭━〔 *VEX MENU* 〕━╮ 🌸
💖 @${m.sender.split("@")[0]}
✨ pick something nice
╰━━━━━━━━━━━━━━━╯`,
                foot: "🎀 reply with number 🎀",
                react: "✨"
            }
        };

        const ui = designs[style] || designs.normal;

        let message = `${ui.head}\n\n${list}\n${ui.foot}`;

        try {
            await sock.sendMessage(m.chat, {
                react: { text: ui.react, key: m.key }
            });

            if (lang !== "en") {
                const res = await translate(message, { to: lang });
                message = res.text;
            }

            await sock.sendMessage(
                m.chat,
                {
                    text: message,
                    mentions: [m.sender]
                },
                { quoted: m }
            );
        } catch {
            await sock.sendMessage(m.chat, {
                text: "⚠️ Menu crashed"
            });
        }
    }
};
