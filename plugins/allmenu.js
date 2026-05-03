const translate = require('google-translate-api-x');
const fs = require('fs');
const path = require('path');

module.exports = {
    command: "allmenu",
    alias: ["list", "commands"],
    category: "system",
    description: "Display all commands with VEX UI optimization",

    async execute(m, sock, ctx) {
        const { args, userSettings } = ctx;
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        const pluginDir = path.join(__dirname, '../plugins');
        let menuData = {};

        // ================= SAFE SCAN =================
        try {
            const files = fs.readdirSync(pluginDir).filter(file => file.endsWith('.js'));
            for (const file of files) {
                try {
                    const plugin = require(path.join(pluginDir, file));
                    if (plugin.command && plugin.category) {
                        const cat = plugin.category.toLowerCase();
                        if (!menuData[cat]) menuData[cat] = [];
                        menuData[cat].push(plugin.command);
                    }
                } catch {
                    continue;
                }
            }
        } catch {
            return await sock.sendMessage(m.chat, { text: "⚠️ Interface Sync Error" });
        }

        const ping = Math.abs(Date.now() - (m.messageTimestamp * 1000));

        // ================= DESIGN SYSTEM =================
        const designs = {
            harsh: {
                h:
`╭━━━〔 ⚡ 𝖁𝕰𝖃 𝕺𝖁𝕰𝕽𝕷𝕺𝕬𝕯 ⚡ 〕━━━╮
┃ 👤 User  : @${m.sender.split('@')[0]}
┃ 🧠 Dev   : Lupin Starnley
┃ ⚡ Speed : ${ping}ms
╰━━━━━━━━━━━━━━━━━━━━━━━╯`,

                sep: "╭───────────────◇───────────────╮",
                footSep: "╰───────────────◇───────────────╯",
                bullet: "┃ ⚔️  .",
                end:
`╰━━━━━━━━━━━━━━━━━━━━━━━╯
☣️ _System loaded. Don’t waste time._`,
                react: "⚡"
            },

            normal: {
                h:
`╭━━━〔 💠 VEX COMMAND CENTER 💠 〕━━━╮
┃ 👤 User     : @${m.sender.split('@')[0]}
┃ 🤖 System   : Online
┃ 📡 Latency  : ${ping}ms
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,

                sep: "╭───────────────◆───────────────╮",
                footSep: "╰───────────────◆───────────────╯",
                bullet: "┃ ➤  .",
                end:
`╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯
✅ _All systems stable_`,
                react: "📊"
            },

            girl: {
                h:
`🌸╭━━━〔 𝑉𝐸𝒳 𝑀𝐸𝒩𝒰 𝒟𝐼𝒜𝑅𝒴 〕━━━╮🌸
💖 User   : @${m.sender.split('@')[0]}
🎀 Mood   : Cute & Ready
✨ Speed  : ${ping}ms
🌸╰━━━━━━━━━━━━━━━━━━━━━━━╯`,

                sep: "╭────────── ✦ ──────────╮",
                footSep: "╰────────── ✦ ──────────╯",
                bullet: "┃ 💕  .",
                end:
`🌸╰━━━━━━━━━━━━━━━━━━━━━━━╯
🎀 _Pick anything you like, babe~_`,
                react: "💖"
            }
        };

        const current = designs[style] || designs.normal;

        try {
            await sock.sendMessage(m.chat, {
                react: { text: current.react, key: m.key }
            });

            let bodyText = "";

            Object.keys(menuData).sort().forEach(category => {
                bodyText += `\n${current.sep}\n`;
                bodyText += `┃ 📂  *${category.toUpperCase()}*\n`;
                bodyText += `┃\n`;

                menuData[category].sort().forEach(cmd => {
                    bodyText += `${current.bullet}${cmd}\n`;
                });

                bodyText += `${current.footSep}\n`;
            });

            let finalMessage = `${current.h}\n${bodyText}\n${current.end}`;

            if (lang !== 'en') {
                try {
                    const res = await translate(finalMessage, { to: lang });
                    finalMessage = res.text;
                } catch {}
            }

            await sock.sendMessage(m.chat, {
                text: finalMessage,
                mentions: [m.sender]
            }, { quoted: m });

        } catch {
            await sock.sendMessage(m.chat, { text: "❌ Menu Error" });
        }
    }
};
