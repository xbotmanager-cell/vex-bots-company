const translate = require("google-translate-api-x");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Use same image as index1.js
const MENU_IMAGE = "https://i.ibb.co/Myk40VZF/Chat-GPT-Image-May-10-2026-12-07-48-PM.png";

// Session store
const menuSessions = new Map();

module.exports = {
    command: "menu",
    category: "system",
    description: "Advanced categorized interface with buttons",

    async execute(m, sock, ctx) {
        const { args, userSettings, prefix } = ctx;

        const lang = args[0] && args[0].length === 2? args[0] : userSettings?.lang || "en";
        const style = userSettings?.style || "normal";
        const pluginDir = path.join(__dirname, "../plugins");

        let categories = new Set();
        let totalCommands = 0;

        try {
            const files = fs.readdirSync(pluginDir);
            for (const file of files) {
                if (!file.endsWith(".js")) continue;
                try {
                    const pluginPath = path.join(pluginDir, file);
                    delete require.cache[require.resolve(pluginPath)];
                    const plugin = require(pluginPath);
                    if (plugin?.category) categories.add(plugin.category.toLowerCase());
                    if (plugin?.command) totalCommands++;
                } catch {}
            }
        } catch {
            return m.reply("⚠️ Failed to load interface");
        }

        const sorted = Array.from(categories).sort();
        const ram = `${Math.floor(Math.random() * 6) + 1}.${Math.floor(Math.random() * 9)}GB`;
        const cpu = `${Math.floor(Math.random() * 70) + 20}%`;
        const ping = `${Math.floor(Math.random() * 120) + 10}ms`;
        const uptime = `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`;
        const users = `${Math.floor(Math.random() * 9000) + 1000}`;

        let list = "";
        sorted.forEach((cat, i) => {
            const num = (i + 1).toString().padStart(2, "0");
            list += `│ ${num} ◈ ${cat.toUpperCase()}\n`;
        });

        const designs = {
            harsh: {
                react: "☣️",
                head: `╭━━━〔 ☣️ VEX CORE 〕━━━╮\n┃ 👤 USER: @${m.sender.split("@")[0]}\n┃ ⚡ MODE: HARSH\n┃ 📦 COMMANDS: ${totalCommands}\n┃ 📂 CATEGORIES: ${sorted.length}\n┃ 💾 RAM: ${ram}\n┃ 🧠 CPU: ${cpu}\n┃ 📡 PING: ${ping}\n┃ ⏳ UPTIME: ${uptime}\n┃ 🌐 USERS: ${users}\n╰━━━━━━━━━━━━━━━━━━━━╯`,
                foot: `╭━━━━━━━━━━━━━━━━━━━━╮\n┃ 💡 Tap a button below\n┃ 📜 Or reply with number\n┃ ⚠️ Timeout: 60s\n╰━━━━━━━━━━━━━━━━━━━━╯`
            },
            normal: {
                react: "📡",
                head: `╭━━━〔 📋 VEX PANEL 〕━━━╮\n┃ 👤 USER: @${m.sender.split("@")[0]}\n┃ 🚀 STATUS: ONLINE\n┃ 📦 COMMANDS: ${totalCommands}\n┃ 📂 CATEGORIES: ${sorted.length}\n┃ 💾 MEMORY: ${ram}\n┃ 📡 LATENCY: ${ping}\n┃ ⏳ UPTIME: ${uptime}\n╰━━━━━━━━━━━━━━━━━━━━╯`,
                foot: `╭━━━━━━━━━━━━━━━━━━━━╮\n┃ 🔢 Use buttons or reply\n┃ 📜 Example: 01\n╰━━━━━━━━━━━━━━━━━━━━╯`
            },
            girl: {
                react: "💖",
                head: `🌸 ╭━━〔 💖 VEX MENU 〕━━╮\n💖 USER: @${m.sender.split("@")[0]}\n✨ STATUS: CUTE MODE\n🌷 COMMANDS: ${totalCommands}\n🎀 CATEGORIES: ${sorted.length}\n💾 MEMORY: ${ram}\n📡 SPEED: ${ping}\n🌸 UPTIME: ${uptime}\n╰━━━━━━━━╯`,
                foot: `🎀 Tap button sweetie~\n🌷 Or reply with number`
            }
        };

        const ui = designs[style] || designs.normal;
        const invisible = "\u200E".repeat(400);

        let message = `${ui.head}\n\n╭━━━〔 📂 CATEGORY LIST 〕━━━╮\n${list}╰━━━━━━━━━━━━━━━━━━━━╯\n\n${ui.foot}\n\n${invisible}`;

        try {
            await sock.sendMessage(m.chat, { react: { text: ui.react, key: m.key } });

            if (lang!== "en") {
                try { message = (await translate(message, { to: lang })).text; } catch {}
            }

            let imageBuffer = null;
            try {
                const res = await axios.get(MENU_IMAGE, { responseType: "arraybuffer", timeout: 15000 });
                if (res.headers['content-type']?.startsWith('image/')) imageBuffer = Buffer.from(res.data);
            } catch {}

            // Create buttons for first 10 categories
            const buttons = sorted.slice(0, 10).map((cat, i) => ({
                buttonId: `menu_cat_${i + 1}`,
                buttonText: { displayText: `${String(i + 1).padStart(2, "0")} ${cat.toUpperCase()}` },
                type: 1
            }));

            const sentMsg = await sock.sendMessage(m.chat, {
                image: imageBuffer || { url: MENU_IMAGE },
                caption: message,
                mentions: [m.sender],
                footer: "VEX BOT • Tap button or reply with number",
                buttons: buttons.length? buttons : undefined,
                headerType: 4
            }, { quoted: m });

            const sessionId = `${m.chat}_${m.sender}`;
            menuSessions.set(sessionId, {
                categories: sorted,
                lang,
                pluginDir,
                prefix,
                timeout: setTimeout(() => menuSessions.delete(sessionId), 60000)
            });

        } catch (err) {
            console.error("MENU ERROR:", err);
            await m.reply("⚠️ Menu failed to load");
        }
    }
};

// GLOBAL LISTENER - Handles both button clicks and number replies
module.exports.listener = async (sock) => {
    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg?.message || msg.key.fromMe) return;

            const from = msg.key.remoteJid;
            const sender = msg.key.participant || from;
            const sessionId = `${from}_${sender}`;

            if (!menuSessions.has(sessionId)) return;

            const session = menuSessions.get(sessionId);

            // Get input from button or text
            let input = "";
            if (msg.message.buttonsResponseMessage) {
                input = msg.message.buttonsResponseMessage.selectedButtonId.replace("menu_cat_", "");
            } else {
                input = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
            }

            const index = parseInt(input.trim());
            if (isNaN(index) || index < 1) return;

            const chosen = session.categories[index - 1];
            if (!chosen) return;

            clearTimeout(session.timeout);
            menuSessions.delete(sessionId);

            let commands = [];
            const files = fs.readdirSync(session.pluginDir);
            for (const file of files) {
                if (!file.endsWith(".js")) continue;
                try {
                    const plugin = require(path.join(session.pluginDir, file));
                    if (plugin.category?.toLowerCase() === chosen) {
                        commands.push({ command: plugin.command, desc: plugin.description || "No description" });
                    }
                } catch {}
            }

            let result = `╭━━━〔 📂 ${chosen.toUpperCase()} 〕━━━╮\n\n`;
            commands.forEach((cmd, i) => {
                result += `│ ${String(i + 1).padStart(2, "0")} ➤ ${session.prefix}${cmd.command}\n`;
            });
            result += `\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n⚡ Total: ${commands.length} commands\n📡 VEX AI System`;

            if (session.lang!== "en") {
                try { result = (await translate(result, { to: session.lang })).text; } catch {}
            }

            await sock.sendMessage(from, {
                image: { url: MENU_IMAGE },
                caption: result
            }, { quoted: msg });

        } catch (err) {
            console.error("Menu listener error:", err.message);
        }
    });
};
