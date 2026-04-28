const translate = require('google-translate-api-x');
const fs = require('fs');
const path = require('path');

module.exports = {
    command: "menu",
    category: "system",
    description: "Display categorized command menu",
    
    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        const pluginDir = path.join(__dirname, '../plugins');
        const files = fs.readdirSync(pluginDir).filter(file => file.endsWith('.js'));
        
        let categories = [];
        files.forEach(file => {
            const plugin = require(path.join(pluginDir, file));
            if (plugin.category && !categories.includes(plugin.category)) {
                categories.push(plugin.category);
            }
        });
        categories.sort();

        let listBody = "";
        categories.forEach((cat, index) => {
            listBody += `┃ ${index + 1}. ${cat.toUpperCase()}\n`;
        });

        const modes = {
            harsh: {
                text: `╭━━〔 *VEX INTERFACE* 〕━━╮\n${listBody}╰━━━━━━━━━━━━━━━━━━━╯\n\n_Reply with a number. Don't make me wait._ 🖕`,
                react: "🖕"
            },
            normal: {
                text: `╭━━〔 *VEX MENU* 〕━━╮\n${listBody}╰━━━━━━━━━━━━━━━━━━━╯\n\n_Reply with a number to view commands._ ✅`,
                react: "📋"
            },
            girl: {
                text: `╭━━〔 *VEX SWEET MENU* 〕━━╮\n${listBody}╰━━━━━━━━━━━━━━━━━━━╯\n\n_Pick a number, babe! Let's play..._ 🎀✨`,
                react: "✨"
            }
        };

        const currentMode = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: currentMode.react, key: m.key } });
            let finalMessage = currentMode.text;
            if (lang !== 'en') {
                const res = await translate(finalMessage, { to: lang });
                finalMessage = res.text;
            }
            await sock.sendMessage(m.chat, { text: finalMessage }, { quoted: m });
        } catch (error) {
            await sock.sendMessage(m.chat, { text: "⚠️ _Menu_Failure_" });
        }
    }
};
