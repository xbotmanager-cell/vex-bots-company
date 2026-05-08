const fs = require('fs');
const path = require('path');
const translate = require('google-translate-api-x');
const axios = require('axios');

// DIRECT LINK YA PICHA - HII NDIO SAHI
const MENU_IMAGE = "https://i.ibb.co/7JXpzLf6/menu.jpg";

module.exports = {
    command: "allmenu",
    alias: ["list", "commands"], // MENU NIMEONDOA
    category: "system",
    description: "Display all commands with image + elegant VEX UI",

    async execute(m, sock, ctx) {
        const { args, userSettings } = ctx;
        const lang = args[0] && args[0].length === 2? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'normal';

        const pluginDir = path.join(__dirname, '../plugins');
        let menuData = {};

        // Safe Plugin Scan
        try {
            const files = fs.readdirSync(pluginDir).filter(file => file.endsWith('.js'));
            for (const file of files) {
                try {
                    const pluginPath = path.join(pluginDir, file);
                    delete require.cache[require.resolve(pluginPath)];
                    const plugin = require(pluginPath);
                    if (plugin.command && plugin.category) {
                        const cat = plugin.category.toLowerCase();
                        if (!menuData[cat]) menuData[cat] = [];
                        if (!menuData[cat].includes(plugin.command)) {
                            menuData[cat].push(plugin.command);
                        }
                    }
                } catch (e) { continue; }
            }
        } catch (err) {
            return sock.sendMessage(m.chat, { text: "⚠️ Failed to load menu" });
        }

        const ping = Math.abs(Date.now() - (m.messageTimestamp * 1000 || Date.now()));

        // Time-based Greeting
        const hour = new Date().getHours();
        let greeting = "Good Day";
        if (hour < 12) greeting = "Good Morning 🌅";
        else if (hour < 17) greeting = "Good Afternoon ☀️";
        else if (hour < 22) greeting = "Good Evening 🌆";
        else greeting = "Good Night 🌙";

        // ================= ELEGANT DESIGNS =================
        const designs = {
            harsh: {
                header: `╔════════════════════════════╗\n` +
                        `║ ⚡ VEX OVERLOAD SYSTEM ⚡ ║\n` +
                        `║ User: @${m.sender.split('@')[0]} ║\n` +
                        `║ ${greeting} • ${ping}ms ║\n` +
                        `╚════════════════════════════╝`,
                sep: `╔───────────────◆───────────────╗`,
                foot: `╚───────────────◆───────────────╝`,
                bullet: "⚔️",
                footer: `☣️ Don't waste time. Execute now.`
            },

            normal: {
                header: `╔════════════════════════════╗\n` +
                        `║ 💠 VEX COMMAND CENTER 💠 ║\n` +
                        `║ User : @${m.sender.split('@')[0]} ║\n` +
                        `║ ${greeting} • ${ping}ms ║\n` +
                        `╚════════════════════════════╝`,
                sep: `╔───────────────◇───────────────╗`,
                foot: `╚───────────────◇───────────────╝`,
                bullet: "➤",
                footer: `✅ System Online • Ready to serve`
            },

            girl: {
                header: `🌸╔════════════════════════════╗🌸\n` +
                        `💖 𝑉𝐸𝒳 𝐷𝐼𝒜𝑅𝒴 💖\n` +
                        `✨ User : @${m.sender.split('@')[0]}\n` +
                        `🌙 ${greeting} • ${ping}ms\n` +
                        `🌸╚════════════════════════════╝`,
                sep: `🌸╔──────────── ✧ ────────────╗🌸`,
                foot: `🌸╚──────────── ✧ ────────────╝🌸`,
                bullet: "💕",
                footer: `🎀 Choose anything you like, darling~`
            }
        };

        const d = designs[style] || designs.normal;

        try {
            await sock.sendMessage(m.chat, {
                react: { text: style === 'girl'? '💖' : '📜', key: m.key }
            });

            let body = "\n";
            Object.keys(menuData).sort().forEach(cat => {
                body += `${d.sep}\n`;
                body += ` 📁 *${cat.toUpperCase()}*\n\n`;

                menuData[cat].sort().forEach(cmd => {
                    body += ` ${d.bullet}.${cmd}\n`;
                });

                body += `${d.foot}\n`;
            });

            let finalText = `${d.header}${body}\n${d.footer}`;

            // Translation Support
            if (lang!== 'en') {
                try {
                    const res = await translate(finalText, { to: lang });
                    finalText = res.text;
                } catch (e) {}
            }

            // ================= PAKUA PICHA KWANZA =================
            let imageBuffer = null;
            try {
                const response = await axios.get(MENU_IMAGE, {
                    responseType: "arraybuffer",
                    timeout: 20000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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

            const buttons = [
                {
                    buttonId: `.xtsearch`,
                    buttonText: { displayText: "🔍 TikTok Search" },
                    type: 1
                },
                {
                    buttonId: `.allmenu`,
                    buttonText: { displayText: "🔄 Refresh Menu" },
                    type: 1
                },
                {
                    buttonId: `.ping`,
                    buttonText: { displayText: "📡 Check Speed" },
                    type: 1
                }
            ];

            if (imageBuffer) {
                await sock.sendMessage(m.chat, {
                    image: imageBuffer,
                    caption: finalText,
                    mentions: [m.sender],
                    footer: "VEX AI • Powered by Lupin Starnley",
                    buttons,
                    headerType: 4
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.chat, {
                    text: finalText,
                    mentions: [m.sender],
                    footer: "VEX AI • Powered by Lupin Starnley",
                    buttons,
                    headerType: 1
                }, { quoted: m });
            }

        } catch (err) {
            console.error(err);
            sock.sendMessage(m.chat, { text: "❌ Failed to generate menu" });
        }
    }
};
