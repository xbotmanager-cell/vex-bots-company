const fs = require("fs");
const path = require("path");
const axios = require("axios");

const MENU_IMAGE = "https://i.ibb.co/Myk40VZF/Chat-GPT-Image-May-10-2026-12-07-48-PM.png";

module.exports = {
    command: "alias",
    alias: ["aliases", "allcmd", "cmdlist"],
    category: "system",
    description: "Show all commands with their aliases",

    async execute(m, sock, ctx) {
        const { prefix } = ctx;
        const pluginDir = path.join(__dirname, "../plugins");

        let commandsList = [];

        try {
            const files = fs.readdirSync(pluginDir);
            
            for (const file of files) {
                if (!file.endsWith(".js")) continue;
                
                try {
                    const pluginPath = path.join(pluginDir, file);
                    delete require.cache[require.resolve(pluginPath)];
                    const plugin = require(pluginPath);

                    if (plugin?.command) {
                        commandsList.push({
                            command: plugin.command,
                            aliases: Array.isArray(plugin.alias) ? plugin.alias : [],
                            category: plugin.category || "uncategorized",
                            description: plugin.description || "No description"
                        });
                    }
                } catch (e) {
                    console.log(`Failed to load ${file}:`, e.message);
                }
            }
        } catch (e) {
            return m.reply("⚠️ Failed to load commands list");
        }

        // Sort alphabetically
        commandsList.sort((a, b) => a.command.localeCompare(b.command));

        const totalCommands = commandsList.length;
        const totalAliases = commandsList.reduce((sum, cmd) => sum + cmd.aliases.length, 0);

        let message = `╭━━━〔 📋 ALIAS CENTER 〕━━━╮\n`;
        message += `┃ 👤 USER: @${m.sender.split("@")[0]}\n`;
        message += `┃ 📦 TOTAL COMMANDS: ${totalCommands}\n`;
        message += `┃ 🔗 TOTAL ALIASES: ${totalAliases}\n`;
        message += `┃ 🔧 PREFIX: ${prefix}\n`;
        message += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        message += `╭━━━〔 COMMANDS & ALIASES 〕━━━╮\n\n`;

        commandsList.forEach((cmd, index) => {
            const num = String(index + 1).padStart(2, "0");
            message += `│ ${num} ➤ ${prefix}${cmd.command}\n`;
            
            if (cmd.aliases.length > 0) {
                const aliasList = cmd.aliases.map(a => `${prefix}${a}`).join(", ");
                message += `│     └─ Alias: ${aliasList}\n`;
            } else {
                message += `│     └─ Alias: None\n`;
            }
            
            message += `│     └─ Category: ${cmd.category}\n\n`;
        });

        message += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        message += `💡 Tip: Use any alias to run the command\n`;
        message += `📡 Powered by VEX AI System`;

        try {
            // Try to send with image
            let imageBuffer = null;
            try {
                const response = await axios.get(MENU_IMAGE, {
                    responseType: "arraybuffer",
                    timeout: 10000
                });
                if (response.headers['content-type']?.startsWith('image/')) {
                    imageBuffer = Buffer.from(response.data);
                }
            } catch {}

            if (imageBuffer) {
                await sock.sendMessage(m.chat, {
                    image: imageBuffer,
                    caption: message,
                    mentions: [m.sender]
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.chat, {
                    text: message,
                    mentions: [m.sender]
                }, { quoted: m });
            }

        } catch (err) {
            console.error("Alias command error:", err);
            await m.reply("⚠️ Failed to display alias list");
        }
    }
};
