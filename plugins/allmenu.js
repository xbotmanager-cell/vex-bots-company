const translate = require('google-translate-api-x');
const fs = require('fs');
const path = require('path');

module.exports = {
    command: "allmenu",
    alias: ["list", "commands"],
    category: "system",
    description: "Display all available commands with unique UI per mode",
    
    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        const pluginDir = path.join(__dirname, '../plugins');
        const files = fs.readdirSync(pluginDir).filter(file => file.endsWith('.js'));
        
        let menuData = {};
        files.forEach(file => {
            const plugin = require(path.join(pluginDir, file));
            const cat = plugin.category || "UNDEFINED";
            if (!menuData[cat]) menuData[cat] = [];
            menuData[cat].push(plugin.command);
        });

        // Unique Design Matrix per Mode
        const designs = {
            harsh: {
                h: "┏━━━━━━〔 *VEX OVERLOAD* 〕━━━━━━┓\n┃ 👤 *Mstr:* Lupin Starnley\n┃ ⚡ *Spd:* " + (Date.now() - m.messageTimestamp * 1000) + "ms\n┗━━━━━━━━━━━━━━━━━━━━━━┛\n",
                sep: "▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n",
                bullet: " ❯❯ .",
                f: "\n_Don't look at it too long. Get moving._ 🖕",
                react: "🛡️",
                err: "⚠️ _Interface failed. Stop breaking things._"
            },
            normal: {
                h: "╭━━━〔 *VEX COMMAND CENTER* 〕━━━╮\n┃ 👤 *Master:* Lupin Starnley\n┃ 📡 *Latency:* " + (Date.now() - m.messageTimestamp * 1000) + "ms\n╰━━━━━━━━━━━━━━━━━━━━╯\n",
                sep: "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n",
                bullet: " ❯❯ .",
                f: "\n_VEX Engine v1.0 | Stable_ ✅",
                react: "📋",
                err: "❌ _Critical: Menu synchronization error._"
            },
            girl: {
                h: "🌸✨ ╭━〔 *VEX SWEET LIST* 〕━╮ ✨🌸\n💖 *Master:* My Lupin\n🎀 *Mood:* Sparkling\n╰━━━━━━━━━━━━━━━━━━━━╯\n",
                sep: "✧･ﾟ: *✧･ﾟ:* *:･ﾟ✧*:･ﾟ✧\n",
                bullet: " ❯❯ .",
                f: "\n_Hope you like my commands, babe!_ 🎀🌸",
                react: "💖",
                err: "📂 _Oopsie! I can't find my list. Sowwy!_ 🎀"
            }
        };

        const current = designs[style] || designs.normal;

        try {
            // Send Specific React per Mode
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            if (userSettings?.silent === true) return;

            let body = "";
            Object.keys(menuData).sort().forEach(category => {
                body += `\n${current.sep}✨ *${category.toUpperCase()}* ✨\n`;
                menuData[category].forEach(cmd => {
                    body += `${current.bullet}${cmd}\n`;
                });
            });

            let finalMessage = current.h + body + current.f;

            if (lang !== 'en') {
                const res = await translate(finalMessage, { to: lang });
                finalMessage = res.text;
            }

            await sock.sendMessage(m.chat, { text: finalMessage }, { quoted: m });

        } catch (error) {
            console.error("AllMenu Error:", error);
            await sock.sendMessage(m.chat, { text: current.err });
        }
    }
};
