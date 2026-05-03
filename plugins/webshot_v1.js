// ================= LUPER-MD WEB CAPTURE =================
const axios = require('axios');
const translate = require('google-translate-api-x');

module.exports = {
    command: "webshot",
    alias: ["ss", "screenshot", "webcap"],
    category: "tools",
    description: "Capture a screenshot of any website (PC or Mobile view)",

    async execute(m, sock, { args, userSettings, lang, prefix }) {
        // 1. CONFIG & STYLE SYNC
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';
        
        // 2. LINK DETECTION (Direct or Reply)
        let url = args[0] || (m.quoted ? m.quoted.text : null);
        if (!url) return m.reply(`☣️ Please provide a URL or reply to a link! \nExample: ${prefix}ss https://google.com --pc`);

        // Safisha link kama ina maneno mengine
        const urlMatch = url.match(/\bhttps?:\/\/\S+/gi);
        if (!urlMatch) return m.reply("❌ Invalid URL format. Ensure it starts with http:// or https://");
        url = urlMatch[0];

        // 3. VIEWPORT SELECTION (PC or Mobile)
        const isPC = args.join(' ').includes('--pc') || args.join(' ').includes('-p');
        const viewport = isPC ? "desktop" : "mobile";
        const width = isPC ? 1920 : 1080;
        const height = isPC ? 1080 : 1920;

        // 4. STYLES DEFINITION
        const modes = {
            harsh: {
                title: "☣️ 𝕯𝕴𝕲𝕴𝕿𝕬𝕷 𝕾𝖀𝕽𝖁𝕰𝕴𝕷𝕷𝕬𝕹𝕮𝕰 ☣️",
                line: "━",
                wait: `⏳ 𝕴𝖓𝖎𝖙𝖎𝖆𝖙𝖎𝖓𝖕 𝖈𝖆𝖕𝖙𝖚𝖗𝖊... (${viewport} mode)\n🕒 𝕬𝖕𝖕𝖑𝖞𝖎𝖓𝖌 3𝖘 𝖉𝖊𝖑𝖆𝖞 𝖋𝖔𝖗 𝖗𝖊𝖓𝖉𝖊𝖗𝖎𝖓𝖌.`,
                done: "✅ 𝕿𝖆𝖗𝖌𝖊𝖙 𝖈𝖆𝖕𝖙𝖚𝖗𝖊𝖉 𝖘𝖚𝖈𝖈𝖊𝖘𝖘𝖋𝖚𝖑𝖑𝖞.",
                react: "📸"
            },
            normal: {
                title: "🌐 VEX WEBSHOT 🌐",
                line: "─",
                wait: `⏳ Accessing site in ${viewport} mode...\n🕒 Waiting 3s for page load...`,
                done: "✅ Screenshot generated.",
                react: "🌐"
            },
            girl: {
                title: "🫧 𝒲𝑒𝒷 𝒮𝓃𝒶𝓅 𝒫𝓇𝒾𝓃𝒸𝑒𝓈𝓈 🫧",
                line: "┄",
                wait: `🫧 𝓈𝓃𝒶𝓅𝓅𝒾𝓃𝑔 𝓉𝒽𝑒 𝓅𝒶𝑔𝑒 𝒻𝑜𝓇 𝓎𝑜𝓊~ (${viewport})\n🫧 𝓅𝓁𝑒𝒶𝓈𝑒 𝓌𝒶𝒾𝓉 𝒶 𝒻𝑒𝓌 𝓈𝑒𝒸𝑜𝓃𝒹𝓈~`,
                done: "🌸 𝒽𝑒𝓇𝑒 𝒾𝓈 𝓎𝑜𝓊𝓇 𝓈𝓃𝒶𝓅𝓈𝒽𝑜𝓉, 𝒹𝑒𝒶𝓇! 🌸",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 5. TRANSLATE & SEND INITIAL STATUS
            const { text: translatedWait } = await translate(`*${current.title}*\n${current.line.repeat(15)}\n\n${current.wait}`, { to: targetLang });
            await m.reply(translatedWait);

            // 6. EXECUTE DELAY (3 Seconds)
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 7. FETCH SCREENSHOT (Using a standard API for reliability)
            const ssUrl = `https://image.thum.io/get/width/${width}/crop/800/fullpage/wait/3/${url}`;
            
            // 8. SEND THE IMAGE
            const { text: translatedDone } = await translate(current.done, { to: targetLang });
            
            await sock.sendMessage(m.chat, { 
                image: { url: ssUrl }, 
                caption: `*${current.title}*\n${current.line.repeat(15)}\n${translatedDone}\n\n🔗 *URL:* ${url}\n🖥️ *Mode:* ${viewport.toUpperCase()}\n${current.line.repeat(15)}\n_VEX Intelligence - Lupin Edition_`
            }, { quoted: m });

        } catch (error) {
            console.error("WEBSHOT ERROR:", error);
            await m.reply("☣️ Surveillance failed. The host is unreachable or blocking access.");
        }
    }
};
