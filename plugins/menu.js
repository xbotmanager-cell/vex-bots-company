const translate = require("google-translate-api-x");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// PICHA YAKO MPYA
const MENU_IMAGE = "https://i.ibb.co/4Z7Sf3q5/Chat-GPT-Image-May-8-2026-07-10-41-PM.png";

// STORE YA SESSION ZA MENU - ILI ISIGONGANE
const menuSessions = new Map();

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
        let totalCommands = 0;

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

                    if (plugin?.command) totalCommands++;

                } catch (e) {
                    console.log("PLUGIN LOAD ERROR:", e.message);
                }
            }
        } catch (e) {
            return sock.sendMessage(m.chat, {
                text: "⚠️ Interface loading failed"
            });
        }

        const sorted = Array.from(categories).sort();

        const ram = `${Math.floor(Math.random() * 6) + 1}.${Math.floor(Math.random() * 9)}GB`;
        const cpu = `${Math.floor(Math.random() * 70) + 20}%`;
        const ping = `${Math.floor(Math.random() * 120) + 10}ms`;
        const uptime = `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`;
        const users = `${Math.floor(Math.random() * 9000) + 1000}`;
        const renderNode = `Render-VPS-${Math.floor(Math.random() * 99) + 1}`;

        let list = "";

        sorted.forEach((cat, i) => {
            const num = (i + 1).toString().padStart(2, "0");
            list += `│ ${num} ◈ ${cat.toUpperCase()}\n`;
        });

        const invisible = "\u200E".repeat(400);

        const designs = {
            harsh: {
                react: "☣️",
                head: `
╭━━━〔 ☣️ VEX CORE ☣️ 〕━━━╮
┃ 👤 USER: @${m.sender.split("@")[0]}
┃ ⚡ MODE: HARSH EXECUTION
┃ 🔥 ENGINE: VEX AI OVERLORD
┃ 📦 COMMANDS: ${totalCommands}
┃ 📂 CATEGORIES: ${sorted.length}
┃ 🖥️ HOST: ${renderNode}
┃ 💾 RAM: ${ram}
┃ 🧠 CPU: ${cpu}
┃ 📡 PING: ${ping}
┃ ⏳ UPTIME: ${uptime}
┃ 🌐 USERS: ${users}
╰━━━━━━━━━━━━━━━━━━━━╯
`,
                foot: `
╭━━━━━━━━━━━━━━━━━━━━╮
┃ 💡 Reply With Number
┃ 📜 Example: 01
┃ ⚠️ Session Timeout: 60s
╰━━━━━━━━━━━━━━━━━━━━╯
`
            },

            normal: {
                react: "📡",
                head: `
╭━━━〔 📋 VEX PANEL 📋 〕━━━╮
┃ 👤 USER: @${m.sender.split("@")[0]}
┃ 🚀 STATUS: ONLINE
┃ 📦 COMMANDS: ${totalCommands}
┃ 📂 CATEGORIES: ${sorted.length}
┃ 🖥️ SERVER: ${renderNode}
┃ 💾 MEMORY: ${ram}
┃ 📡 LATENCY: ${ping}
┃ ⏳ UPTIME: ${uptime}
╰━━━━━━━━━━━━━━━━━━━━╯
`,
                foot: `
╭━━━━━━━━━━━━━━━━━━━━╮
┃ 🔢 Reply Using Number
┃ 📜 Example: 02
┃ ⚡ Fast Navigation Enabled
╰━━━━━━━━━━━━━━━━━━━━╯
`
            },

            girl: {
                react: "💖",
                head: `
🌸 ╭━━〔 💖 VEX MENU 💖 〕━━╮ 🌸
💖 USER: @${m.sender.split("@")[0]}
✨ STATUS: EVERYTHING CUTE~
🌷 COMMANDS: ${totalCommands}
🎀 CATEGORIES: ${sorted.length}
🧸 SERVER: ${renderNode}
💾 MEMORY: ${ram}
📡 SPEED: ${ping}
🌸 UPTIME: ${uptime}
╰━━━━━━━━━━━━━━━━━━━━╯
`,
                foot: `
🎀 Reply With A Number Sweetie~
🌷 Example: 03
💖 Session Auto Close: 60s
`
            }
        };

        const ui = designs[style] || designs.normal;

        let message = `
${ui.head}

╭━━━〔 📂 CATEGORY LIST 📂 〕━━━╮
${list}╰━━━━━━━━━━━━━━━━━━━━╯

${ui.foot}

${invisible}
`;

        try {
            await sock.sendMessage(m.chat, {
                react: {
                    text: ui.react,
                    key: m.key
                }
            });

            if (lang!== "en") {
                try {
                    const translated = await translate(message, { to: lang });
                    message = translated.text;
                } catch {}
            }

            let imageBuffer = null;

            try {
                const response = await axios.get(MENU_IMAGE, {
                    responseType: "arraybuffer",
                    timeout: 20000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'image/jpeg,image/png,image/*'
                    }
                });

                const contentType = response.headers['content-type'];
                if (contentType && contentType.startsWith('image/')) {
                    imageBuffer = Buffer.from(response.data);
                } else {
                    console.log("MENU IMAGE FAILED: Not an image, got", contentType);
                }
            } catch (e) {
                console.log("MENU IMAGE FAILED:", e.message);
            }

            // TUMA MENU - HAKUNA BUTTONS MAANA HAZIFANYI KAZI
            const sentMsg = imageBuffer
               ? await sock.sendMessage(
                    m.chat,
                    {
                        image: imageBuffer,
                        caption: message,
                        mentions: [m.sender]
                    },
                    { quoted: m }
                )
                : await sock.sendMessage(
                    m.chat,
                    {
                        text: message,
                        mentions: [m.sender]
                    },
                    { quoted: m }
                );

            // WEKA SESSION - HII NDIO INAFANYA IJIBU NAMBA
            const sessionId = `${m.chat}_${m.sender}`;
            menuSessions.set(sessionId, {
                categories: sorted,
                lang: lang,
                pluginDir: pluginDir,
                msgId: sentMsg.key.id,
                timeout: setTimeout(() => {
                    menuSessions.delete(sessionId);
                }, 60000)
            });

        } catch (err) {
            console.log("MENU ERROR:", err.message);
            try {
                await sock.sendMessage(m.chat, {
                    text: "⚠️ Menu crashed but system recovered."
                });
            } catch {}
        }
    }
};

// LISTENER YA GLOBAL - INASHIKA NAMBA ZOTE
module.exports.listener = async (sock) => {
    sock.ev.on("messages.upsert", async (msg) => {
        try {
            if (!msg.messages) return;
            const messageData = msg.messages[0];
            if (!messageData.message || messageData.key.fromMe) return;

            const from = messageData.key.remoteJid;
            const sender = messageData.key.participant || messageData.key.remoteJid;
            const sessionId = `${from}_${sender}`;

            if (!menuSessions.has(sessionId)) return;

            const body =
                messageData.message.conversation ||
                messageData.message.extendedTextMessage?.text ||
                "";

            if (!body) return;

            const input = body.trim();
            const index = parseInt(input);

            if (isNaN(index)) return;

            const session = menuSessions.get(sessionId);
            const chosen = session.categories[index - 1];
            if (!chosen) return;

            // FUTA SESSION
            clearTimeout(session.timeout);
            menuSessions.delete(sessionId);

            let commands = [];
            const files = fs.readdirSync(session.pluginDir);

            for (const file of files) {
                if (!file.endsWith(".js")) continue;

                try {
                    const pluginPath = path.join(session.pluginDir, file);
                    delete require.cache[require.resolve(pluginPath)];
                    const plugin = require(pluginPath);

                    if (plugin.category?.toLowerCase() === chosen) {
                        commands.push({
                            command: plugin.command || "unknown",
                            desc: plugin.description || "No description"
                        });
                    }
                } catch (e) {
                    console.log("COMMAND LOAD ERROR:", e.message);
                }
            }

            let result = `
╭━━━〔 📂 ${chosen.toUpperCase()} 〕━━━╮

`;

            commands.forEach((cmd, i) => {
                result += `│ ${String(i + 1).padStart(2, "0")} ➤.${cmd.command}\n`;
            });

            result += `
╰━━━━━━━━━━━━━━━━━━━━╯

⚡ Total Commands: ${commands.length}
📡 Powered By VEX AI
`;

            if (session.lang!== "en") {
                try {
                    const translated = await translate(result, { to: session.lang });
                    result = translated.text;
                } catch {}
            }

            await sock.sendMessage(from, { text: result }, { quoted: messageData });

        } catch (err) {
            console.error("MENU LISTENER ERROR:", err);
        }
    });
};
