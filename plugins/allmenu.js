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

        // 1. SAFE SCANNING ENGINE
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
                } catch (e) {
                    continue; // Ruka mafaili yenye error
                }
            }
        } catch (err) {
            return await sock.sendMessage(m.chat, { text: "⚠️ _Interface_Sync_Error_" });
        }

        const ping = Math.abs(Date.now() - (m.messageTimestamp * 1000));

        // 2. DESIGN MATRIX
        const designs = {
            harsh: {
                h: `╰►Hey, @${m.sender.split('@')[0]}\n┏━━━━━━〔 *VEX OVERLOAD* 〕━━━━━━┓\n┃ 👤 *Mstr:* Lupin Starnley\n┃ ⚡ *Spd:* ${ping}ms\n┗━━━━━━━━━━━━━━━━━━━━━━┛\n`,
                sep: "▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰",
                bullet: " │✵│▸ .",
                f: "\n_Don't look at it too long. Get moving._ 🖕",
                react: "🛡️"
            },
            normal: {
                h: `╰►Welcome, @${m.sender.split('@')[0]}\n╭━━━〔 *VEX COMMAND CENTER* 〕━━━╮\n┃ 👤 *Master:* Lupin Starnley\n┃ 📡 *Latency:* ${ping}ms\n╰━━━━━━━━━━━━━━━━━━━━╯\n`,
                sep: "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯",
                bullet: " │◦➛ .",
                f: "\n_VEX Engine v1.2 | Stable_ ✅",
                react: "📋"
            },
            girl: {
                h: `╰►Hiie, @${m.sender.split('@')[0]}\n🌸✨ ╭━〔 *VEX SWEET LIST* 〕━╮ ✨🌸\n💖 *Master:* My Lupin\n🎀 *Mood:* Sparkling\n╰━━━━━━━━━━━━━━━━━━━━╯\n`,
                sep: "✧･ﾟ: *✧･ﾟ:* *:･ﾟ✧*:･ﾟ✧",
                bullet: " │✨💞 .",
                f: "\n_Hope you like my commands, babe!_ 🎀🌸",
                react: "💖"
            }
        };

        const current = designs[style] || designs.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            let bodyText = "";
            Object.keys(menuData).sort().forEach(category => {
                bodyText += `\n${current.sep}\n✨ *${category.toUpperCase()}* ✨\n`;
                menuData[category].sort().forEach(cmd => {
                    bodyText += `${current.bullet}${cmd}\n`;
                });
            });

            let finalMessage = current.h + bodyText + current.f;

            if (lang !== 'en') {
                const res = await translate(finalMessage, { to: lang });
                finalMessage = res.text;
            }

            await sock.sendMessage(m.chat, { 
                text: finalMessage,
                mentions: [m.sender]
            }, { quoted: m });

        } catch (error) {
            await sock.sendMessage(m.chat, { text: "❌ _Critical_Menu_Failure_" });
        }
    }
};
