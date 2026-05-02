const translate = require('google-translate-api-x');
const fs = require('fs');
const path = require('path');

module.exports = {
    command: "menu",
    category: "system",
    description: "Advanced categorized interface with numerical mapping",

    async execute(m, sock, ctx) {
        const { args, userSettings, supabase, cache } = ctx;
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        const pluginDir = path.join(__dirname, '../plugins');
        let categories = new Set();
        
        // 1. DYNAMIC SCANNING (With Safety Guard)
        try {
            const files = fs.readdirSync(pluginDir);
            for (const file of files) {
                if (file.endsWith('.js')) {
                    try {
                        const plugin = require(path.join(pluginDir, file));
                        if (plugin.category) {
                            categories.add(plugin.category.toLowerCase());
                        }
                    } catch (e) {
                        // Skip broken files silently without crashing the menu
                        continue;
                    }
                }
            }
        } catch (err) {
            return await sock.sendMessage(m.chat, { text: "⚠️ _FileSystem_Error_" });
        }

        const sortedCategories = Array.from(categories).sort();
        
        // 2. NUMERICAL MAPPING (Setting up the 'Ear')
        // Tunahifadhi hii map kwenye cache ili Observer iijue namba 1 ni nini
        cache.set(`menu_map_${m.chat}`, sortedCategories);

        let listBody = "";
        sortedCategories.forEach((cat, index) => {
            listBody += `│✵│▸ ${index + 1}. ${cat.toUpperCase()}\n`;
        });

        // 3. UI DESIGNS (VEX Edition)
        const header = `╰►Hey, @${m.sender.split('@')[0]}\n╭───〔 *VEX ARSENAL* 〕──────┈⊷`;
        const footer = `╰──────────────────────⊷\n\n╭───◇ *CATEGORIES* ◇──────┈⊷\n│「 Reply with a number below 」\n`;
        
        const modes = {
            harsh: {
                text: `${header}\n├──────────────\n${listBody}${footer}> _Pick a number or get lost._ 🖕`,
                react: "🖕"
            },
            normal: {
                text: `${header}\n├──────────────\n${listBody}${footer}> _Select a category to explore._ 📋`,
                react: "📋"
            },
            girl: {
                text: `${header}\n├──────────────\n${listBody}${footer}> _Choose a number, sweetie!_ 🎀✨`,
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

            await sock.sendMessage(m.chat, { 
                text: finalMessage,
                mentions: [m.sender]
            }, { quoted: m });

        } catch (error) {
            console.error("Menu Error:", error);
            await sock.sendMessage(m.chat, { text: "⚠️ _Interface_Timeout_" });
        }
    }
};
