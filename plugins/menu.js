const translate = require("google-translate-api-x");
const fs = require("fs");
const path = require("path");

module.exports = {
    command: "menu",
    category: "system",
    description: "Advanced categorized interface with numerical mapping",

    async execute(m, sock, ctx) {
        const { args, userSettings } = ctx;

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

        let list = "";
        sorted.forEach((cat, i) => {
            const num = (i + 1).toString().padStart(2, "0");
            list += `│ ${num} ➤ ${cat.toUpperCase()}\n`;
        });

        // 🔥 NEW ENHANCED STYLES
        const designs = {
            harsh: {
                head: `╭━━━〔 ☣️ VEX CORE ☣️ 〕━━━╮
┃ 👤 @${m.sender.split("@")[0]}
┃ ⚡ MODE: HARSH EXECUTION
┃ 🩸 SYSTEM: NO MERCY
╰━━━━━━━━━━━━━━━━━━╯`,
                foot: "╰─➤ Reply with number or get ignored.",
                react: "☣️"
            },
            normal: {
                head: `╭━━━〔 📋 VEX PANEL 📋 〕━━━╮
┃ 👤 @${m.sender.split("@")[0]}
┃ 📡 System Stable
┃ 🔍 Choose Category
╰━━━━━━━━━━━━━━━━━━╯`,
                foot: "╰─➤ Reply with a number.",
                react: "📋"
            },
            girl: {
                head: `🌸 ╭━〔 💖 VEX MENU 💖 〕━╮ 🌸
💖 @${m.sender.split("@")[0]}
✨ pick something cute~
🌷 everything looks pretty!
╰━━━━━━━━━━━━━━━━━━╯`,
                foot: "🎀 reply with number sweetie 🎀",
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

            // ================= 🔥 SELF LISTENER =================
            let active = true;

            const listener = async (msg) => {
                try {
                    if (!active) return;
                    if (!msg.messages) return;

                    const message = msg.messages[0];
                    if (!message.message) return;

                    const from = message.key.remoteJid;
                    if (from !== m.chat) return;

                    const sender = message.key.participant || from;
                    if (sender !== m.sender) return;

                    const body =
                        message.message.conversation ||
                        message.message.extendedTextMessage?.text ||
                        "";

                    if (!body) return;

                    const input = body.trim();

                    // 🔢 CHECK NUMBER
                    const index = parseInt(input);

                    if (isNaN(index)) return;

                    const chosen = sorted[index - 1];
                    if (!chosen) return;

                    active = false;

                    // 🔍 SHOW COMMANDS IN CATEGORY
                    let commands = [];

                    const files = fs.readdirSync(pluginDir);

                    for (const file of files) {
                        if (!file.endsWith(".js")) continue;

                        try {
                            const pluginPath = path.join(pluginDir, file);
                            delete require.cache[require.resolve(pluginPath)];
                            const plugin = require(pluginPath);

                            if (plugin.category?.toLowerCase() === chosen) {
                                commands.push(plugin.command);
                            }
                        } catch {}
                    }

                    let result = `📂 ${chosen.toUpperCase()}\n\n`;
                    commands.forEach(cmd => {
                        result += `➤ ${cmd}\n`;
                    });

                    const { text } = await translate(result, { to: lang });

                    await sock.sendMessage(m.chat, { text });

                    sock.ev.off("messages.upsert", listener);

                } catch (err) {
                    console.error("MENU LISTENER ERROR:", err);
                }
            };

            sock.ev.on("messages.upsert", listener);

            // ⏰ AUTO STOP
            setTimeout(() => {
                if (active) {
                    active = false;
                    sock.ev.off("messages.upsert", listener);
                }
            }, 60000);

        } catch {
            await sock.sendMessage(m.chat, {
                text: "⚠️ Menu crashed"
            });
        }
    }
};
