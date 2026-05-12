const translate = require("google-translate-api-x");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// ============================
// VEX ADVANCED MENU SYSTEM
// STABLE FOR BAILEYS ^6.7.16
// ============================

// Same image
const MENU_IMAGE = "https://i.ibb.co/Myk40VZF/Chat-GPT-Image-May-10-2026-12-07-48-PM.png";

// Sessions
const menuSessions = new Map();

// Cache
const commandCache = new Map();
let cacheTime = 0;

// Cooldown
const userCooldown = new Map();

// ============================
// SAFE TEXT EXTRACTOR
// ============================
function getText(msg) {
    try {
        return (
            msg?.message?.conversation ||
            msg?.message?.extendedTextMessage?.text ||
            msg?.message?.imageMessage?.caption ||
            msg?.message?.videoMessage?.caption ||
            msg?.message?.buttonsResponseMessage?.selectedButtonId ||
            msg?.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
            msg?.message?.templateButtonReplyMessage?.selectedId ||
            ""
        ).trim();
    } catch {
        return "";
    }
}

// ============================
// SAFE REACT
// ============================
async function safeReact(sock, chat, key, emoji) {
    try {
        await sock.sendMessage(chat, {
            react: {
                text: emoji,
                key
            }
        });
    } catch {}
}

// ============================
// LOAD COMMANDS
// ============================
function loadPlugins(pluginDir) {
    try {

        // 15 seconds cache
        if (Date.now() - cacheTime < 15000 && commandCache.has("data")) {
            return commandCache.get("data");
        }

        const categories = new Map();
        const files = fs.readdirSync(pluginDir);

        let totalCommands = 0;

        for (const file of files) {

            if (!file.endsWith(".js")) continue;

            try {

                const pluginPath = path.join(pluginDir, file);

                delete require.cache[require.resolve(pluginPath)];

                const plugin = require(pluginPath);

                if (!plugin || !plugin.command) continue;

                const category = (plugin.category || "misc").toLowerCase();

                if (!categories.has(category)) {
                    categories.set(category, []);
                }

                categories.get(category).push({
                    command: plugin.command,
                    description: plugin.description || "No description"
                });

                totalCommands++;

            } catch {}
        }

        const data = {
            categories,
            totalCommands,
            sorted: Array.from(categories.keys()).sort()
        };

        commandCache.set("data", data);
        cacheTime = Date.now();

        return data;

    } catch {
        return {
            categories: new Map(),
            totalCommands: 0,
            sorted: []
        };
    }
}

// ============================
// RANDOM SYSTEM STATS
// ============================
function generateStats() {

    const ram = `${(Math.random() * 6 + 2).toFixed(1)}GB`;
    const cpu = `${Math.floor(Math.random() * 60) + 20}%`;
    const ping = `${Math.floor(Math.random() * 80) + 10}ms`;
    const uptime = `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`;
    const users = `${Math.floor(Math.random() * 9000) + 1000}`;
    const battery = `${Math.floor(Math.random() * 60) + 40}%`;

    return {
        ram,
        cpu,
        ping,
        uptime,
        users,
        battery
    };
}

// ============================
// UI DESIGNS
// ============================
const DESIGNS = {

    harsh: {
        react: "☣️",
        emoji: "⚡",
        buildHead: (user, totalCommands, totalCategories, stats) => `
╭━━━〔 ☣️ VEX CORE ☣️ 〕━━━╮
┃ 👤 USER: @${user}
┃ ⚡ MODE: HARSH
┃ 📦 COMMANDS: ${totalCommands}
┃ 📂 CATEGORIES: ${totalCategories}
┃ 💾 RAM: ${stats.ram}
┃ 🧠 CPU: ${stats.cpu}
┃ 🔋 BATTERY: ${stats.battery}
┃ 📡 PING: ${stats.ping}
┃ 🌐 USERS: ${stats.users}
┃ ⏳ UPTIME: ${stats.uptime}
╰━━━━━━━━━━━━━━━━━━━━╯
`,
        foot: `
╭━━━━━━━━━━━━━━━━━━━━╮
┃ ⚡ Use Buttons Below
┃ 🔢 Or Reply Number
┃ ⏰ Session: 60s
╰━━━━━━━━━━━━━━━━━━━━╯
`
    },

    normal: {
        react: "📡",
        emoji: "🚀",
        buildHead: (user, totalCommands, totalCategories, stats) => `
╭━━━〔 📋 VEX PANEL 📋 〕━━━╮
┃ 👤 USER: @${user}
┃ 🚀 STATUS: ONLINE
┃ 📦 COMMANDS: ${totalCommands}
┃ 📂 CATEGORIES: ${totalCategories}
┃ 💾 MEMORY: ${stats.ram}
┃ 🧠 CPU: ${stats.cpu}
┃ 🔋 BATTERY: ${stats.battery}
┃ 📡 LATENCY: ${stats.ping}
┃ 🌐 USERS: ${stats.users}
┃ ⏳ UPTIME: ${stats.uptime}
╰━━━━━━━━━━━━━━━━━━━━╯
`,
        foot: `
╭━━━━━━━━━━━━━━━━━━━━╮
┃ 🔢 Reply Using Number
┃ 📜 Example: 01
┃ ⚡ Fast Navigation
╰━━━━━━━━━━━━━━━━━━━━╯
`
    },

    girl: {
        react: "💖",
        emoji: "🌸",
        buildHead: (user, totalCommands, totalCategories, stats) => `
🌸 ╭━━〔 💖 VEX MENU 💖 〕━━╮
💖 USER: @${user}
✨ STATUS: CUTE MODE
🌷 COMMANDS: ${totalCommands}
🎀 CATEGORIES: ${totalCategories}
💾 MEMORY: ${stats.ram}
📡 SPEED: ${stats.ping}
🔋 BATTERY: ${stats.battery}
🌸 UPTIME: ${stats.uptime}
╰━━━━━━━━━━━━━━━━━━━━╯
`,
        foot: `
🎀 Tap Buttons Sweetie~
🌷 Or Reply Number
✨ Session Active
`
    }
};

// ============================
// EXPORT
// ============================
module.exports = {

    command: "menu",
    category: "system",
    description: "Advanced categorized interface with buttons",

    async execute(m, sock, ctx) {

        const {
            args,
            userSettings,
            prefix
        } = ctx;

        const sender = m.sender.split("@")[0];

        // ============================
        // COOLDOWN
        // ============================
        const cooldownKey = `${m.chat}_${m.sender}`;

        if (userCooldown.has(cooldownKey)) {
            const diff = Date.now() - userCooldown.get(cooldownKey);

            if (diff < 2500) {
                return;
            }
        }

        userCooldown.set(cooldownKey, Date.now());

        // ============================
        // SETTINGS
        // ============================
        const lang = (
            args[0] &&
            args[0].length === 2
        ) ? args[0] : userSettings?.lang || "en";

        const style = userSettings?.style || "normal";

        const pluginDir = path.join(__dirname, "../plugins");

        // ============================
        // LOAD PLUGINS
        // ============================
        const {
            categories,
            totalCommands,
            sorted
        } = loadPlugins(pluginDir);

        if (!sorted.length) {
            return m.reply("⚠️ No categories found");
        }

        // ============================
        // STATS
        // ============================
        const stats = generateStats();

        // ============================
        // UI
        // ============================
        const ui = DESIGNS[style] || DESIGNS.normal;

        // ============================
        // CATEGORY LIST
        // ============================
        let list = "";

        sorted.forEach((cat, i) => {

            const num = String(i + 1).padStart(2, "0");

            const total = categories.get(cat)?.length || 0;

            list += `│ ${num} ◈ ${cat.toUpperCase()} (${total})\n`;
        });

        // ============================
        // EXTRA FEATURES
        // ============================
        const tips = [
            `${prefix}alive`,
            `${prefix}allmenu`,
            `${prefix}ping`,
            `${prefix}owner`,
            `${prefix}runtime`,
            `${prefix}system`
        ];

        const randomTip = tips[Math.floor(Math.random() * tips.length)];

        const invisible = "\u200E".repeat(500);

        let message = `
${ui.buildHead(sender, totalCommands, sorted.length, stats)}

╭━━━〔 📂 CATEGORY LIST 📂 〕━━━╮
${list}╰━━━━━━━━━━━━━━━━━━━━╯

${ui.foot}

╭━━━〔 ${ui.emoji} QUICK ACCESS ${ui.emoji} 〕━━━╮
┃ 🟢 Prefix: ${prefix}
┃ 📌 Tip: ${randomTip}
┃ ⚡ Stable Buttons
┃ 🌍 Multi Language
┃ 🔥 Fast Loading
╰━━━━━━━━━━━━━━━━━━━━╯

${invisible}
`;

        // ============================
        // TRANSLATE
        // ============================
        if (lang !== "en") {
            try {
                message = (await translate(message, {
                    to: lang
                })).text;
            } catch {}
        }

        // ============================
        // REACT
        // ============================
        await safeReact(sock, m.chat, m.key, ui.react);

        // ============================
        // IMAGE
        // ============================
        let imageBuffer = null;

        try {

            const response = await axios.get(MENU_IMAGE, {
                responseType: "arraybuffer",
                timeout: 15000,
                headers: {
                    "User-Agent": "Mozilla/5.0"
                }
            });

            if (
                response.headers["content-type"] &&
                response.headers["content-type"].startsWith("image")
            ) {
                imageBuffer = Buffer.from(response.data);
            }

        } catch {}

        // ============================
        // BUTTONS
        // ============================
        const buttons = [];

        // First 3 categories
        sorted.slice(0, 3).forEach((cat, i) => {

            buttons.push({
                buttonId: `${i + 1}`,
                buttonText: {
                    displayText: `${String(i + 1).padStart(2, "0")} ${cat.toUpperCase()}`
                },
                type: 1
            });
        });

        // Extra Buttons
        buttons.push({
            buttonId: `${prefix}allmenu`,
            buttonText: {
                displayText: "📜 ALLMENU"
            },
            type: 1
        });

        buttons.push({
            buttonId: `${prefix}alive`,
            buttonText: {
                displayText: "⚡ ALIVE"
            },
            type: 1
        });

        // ============================
        // SEND MENU
        // ============================
        let sent;

        try {

            sent = await sock.sendMessage(
                m.chat,
                {
                    image: imageBuffer || {
                        url: MENU_IMAGE
                    },
                    caption: message,
                    mentions: [m.sender],
                    footer: `VEX BOT • ${prefix}menu`,
                    buttons,
                    headerType: 4
                },
                {
                    quoted: m
                }
            );

        } catch {

            // FALLBACK
            sent = await sock.sendMessage(
                m.chat,
                {
                    image: imageBuffer || {
                        url: MENU_IMAGE
                    },
                    caption: message,
                    mentions: [m.sender]
                },
                {
                    quoted: m
                }
            );
        }

        // ============================
        // SESSION SAVE
        // ============================
        const sessionId = `${m.chat}_${m.sender}`;

        // clear old
        if (menuSessions.has(sessionId)) {

            try {
                clearTimeout(menuSessions.get(sessionId).timeout);
            } catch {}

            menuSessions.delete(sessionId);
        }

        menuSessions.set(sessionId, {

            categories: sorted,
            commands: categories,
            lang,
            prefix,
            pluginDir,
            messageId: sent?.key?.id || null,
            createdAt: Date.now(),

            timeout: setTimeout(() => {

                try {
                    menuSessions.delete(sessionId);
                } catch {}

            }, 60000)
        });
    }
};

// ============================
// GLOBAL LISTENER
// ============================
module.exports.listener = async (sock) => {

    sock.ev.on("messages.upsert", async ({ messages }) => {

        try {

            const msg = messages?.[0];

            if (!msg || !msg.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || from;

            const sessionId = `${from}_${sender}`;

            if (!menuSessions.has(sessionId)) return;

            const session = menuSessions.get(sessionId);

            // ============================
            // INPUT
            // ============================
            let input = getText(msg);

            if (!input) return;

            input = input.trim();

            // ============================
            // SUPPORT:
            // 01
            // 1
            // menu_cat_1
            // ============================
            input = input
                .replace("menu_cat_", "")
                .replace(/[^\d]/g, "");

            const index = parseInt(input);

            if (
                isNaN(index) ||
                index < 1 ||
                index > session.categories.length
            ) {
                return;
            }

            const chosen = session.categories[index - 1];

            if (!chosen) return;

            // ============================
            // REACT
            // ============================
            await safeReact(sock, from, msg.key, "⚡");

            // ============================
            // CLEAR SESSION
            // ============================
            try {
                clearTimeout(session.timeout);
            } catch {}

            menuSessions.delete(sessionId);

            // ============================
            // COMMANDS
            // ============================
            const commands = session.commands.get(chosen) || [];

            // ============================
            // STYLE
            // ============================
            let result = `
╭━━━〔 📂 ${chosen.toUpperCase()} 📂 〕━━━╮

`;

            commands.forEach((cmd, i) => {

                result += `│ ${String(i + 1).padStart(2, "0")} ➤ ${session.prefix}${cmd.command}\n`;

                if (cmd.description) {
                    result += `│ 📝 ${cmd.description}\n`;
                }

                result += `│\n`;
            });

            result += `
╰━━━━━━━━━━━━━━━━━━━━╯

⚡ Total Commands: ${commands.length}
📡 VEX AI SYSTEM
`;

            // ============================
            // TRANSLATE
            // ============================
            if (session.lang !== "en") {

                try {

                    result = (
                        await translate(result, {
                            to: session.lang
                        })
                    ).text;

                } catch {}
            }

            // ============================
            // SEND
            // ============================
            await sock.sendMessage(
                from,
                {
                    image: {
                        url: MENU_IMAGE
                    },
                    caption: result
                },
                {
                    quoted: msg
                }
            );

        } catch (err) {

            console.error("MENU LISTENER ERROR:", err);
        }
    });
};
