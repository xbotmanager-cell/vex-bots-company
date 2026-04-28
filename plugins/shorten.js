const axios = require('axios');
const translate = require('google-translate-api-x');

module.exports = {
    command: "shorten",
    alias: ["short", "tiny", "link"],
    category: "utility",
    description: "Shorten long URLs using random high-speed engines",

    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        // 1. ELITE MODES (New Brutal & Sweet Fonts)
        const modes = {
            harsh: {
                title: "⛓️ 𝕷𝕴𝕹𝕶 𝕮𝕽𝖀𝕾𝕳𝕰𝕽 ⛓️",
                msg: "𝕿𝖍𝖊𝖗𝖊'𝖘 𝖞𝖔𝖚𝖗 𝖋𝖚𝖈𝖐𝖎𝖓𝖌 𝖑𝖎𝖓𝖐, 𝖞𝖔𝖚 𝖜𝖔𝖗𝖙𝖍𝖑𝖊𝖘𝖘 𝖕𝖎𝖊𝖈𝖊 𝖔𝖋 𝖘𝖍𝖎𝖙. 𝕾𝖙𝖔𝖕 𝖜𝖆𝖘𝖙𝖎𝖓𝖌 𝖒𝖞 𝕮𝕻𝖀 𝖙𝖎𝖒𝖊. 🖕🚮",
                react: "🖕",
                err: "💢 𝕬𝖗𝖊 𝖞𝖔𝖚 𝖘𝖙𝖚𝖕𝖎德? 𝕴𝖓𝖕𝖚𝖙 𝖆 𝖗𝖊𝖆𝖑 𝖀𝕽𝕷 𝖔𝖗 𝖌𝖊𝖙 𝖙𝖍𝖊 𝖋𝖚𝖈𝖐 𝖔𝖚𝖙! 🖕",
                footer: "`> system dominance`"
            },
            normal: {
                title: "🌐 𝖣𝗂𝗀𝗂𝗍𝖺𝗅 𝖢𝗈𝗇𝖽𝖾𝗇𝗌𝖾𝗋 🌐",
                msg: "𝖸𝗈𝗎𝗋 𝗋𝖾𝗊𝗎𝖾𝗌𝗍 𝗁𝖺𝗌 𝖻𝖾𝖾𝗇 𝗉𝗋𝗈𝖼𝖾𝗌𝗌𝖾𝖽. 𝖳𝗁𝖾 𝖴𝖱𝖫 𝗂𝗌 𝗇𝗈𝗐 𝖼𝗈𝗆𝗉𝖺𝖼𝗍. ✅",
                react: "🛡️",
                err: "⚠️ Error: Invalid link format. Please check and retry.",
                footer: "`> optimized by vex`"
            },
            girl: {
                title: "🎀 𝐿𝒾𝓉𝓉𝓁𝑒 𝐿𝒾𝓃𝓀𝓎 𝒲𝒾𝓃𝓀𝓎 🎀",
                msg: "𝒽𝑒𝓇𝑒 𝒾𝓈 𝓉𝒽𝑒 𝓁𝒾𝓃𝓀, 𝓂𝓎 𝑜𝓃𝓁𝓎 𝒦𝒾𝓃𝑔 𝐿𝓊𝓅𝒾𝓃... 𝒾 𝒽𝑜𝓅𝑒 𝓉𝒽𝒾𝓈 𝓂𝒶𝓀𝑒𝓈 𝓎𝑜𝓊 𝓈𝓂𝒾𝓁𝑒, 𝒹𝒶𝓇𝓁𝒾𝓃𝑔~ 💍💗💋",
                react: "👑",
                err: "🌸 𝑜𝑜𝓅𝓈𝒾𝑒 𝒹𝒶𝒾𝓈𝓎! 𝓉𝒽𝒶𝓉 𝓁𝒾𝓃𝓀 𝒾𝓈𝓃'𝓉 𝓌𝑜𝓇𝓀𝒾𝓃𝑔, 𝓂𝓎 𝓁𝑜𝓋𝑒... 𝓉𝓇𝓎 𝒶𝑔𝒶𝒾𝓃? ✨",
                footer: "`> obsessed with you`"
            }
        };

        const current = modes[style] || modes.normal;

        // 2. INTELLIGENT LINK EXTRACTION
        const textContent = m.quoted ? m.quoted.text : (args.length > 0 ? args.join(' ') : m.text);
        const urlMatch = textContent.match(/https?:\/\/[^\s]+/);
        const targetUrl = urlMatch ? urlMatch[0] : null;

        if (!targetUrl) return m.reply(current.err);

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 3. MULTI-LAYERED SHORTENING (Randomized)
            const engines = [
                `https://tinyurl.com/api-create.php?url=${encodeURIComponent(targetUrl)}`,
                `https://is.gd/create.php?format=simple&url=${encodeURIComponent(targetUrl)}`
            ];
            
            const randomEngine = engines[Math.floor(Math.random() * engines.length)];
            const { data: shortLink } = await axios.get(randomEngine);

            // 4. TRANSLATION & FONT INJECTION
            let finalMsgBody = current.msg;
            if (lang !== 'en') {
                try {
                    const res = await translate(finalMsgBody, { to: lang });
                    finalMsgBody = res.text;
                } catch { /* Silent fail */ }
            }

            let report = `${current.title}\n\n`;
            report += `⚓ **Source:** ${targetUrl.slice(0, 35)}...\n`;
            report += `🛰️ **Result:** ${shortLink}\n\n`;
            report += `${finalMsgBody}\n\n`;
            report += `${current.footer}`;

            await sock.sendMessage(m.chat, { text: report }, { quoted: m });

        } catch (error) {
            // Backup Scraper (Cleanuri)
            try {
                const res = await axios.post('https://cleanuri.com/api/v1/shorten', `url=${encodeURIComponent(targetUrl)}`);
                await m.reply(`${current.title}\n\n🛰️ **Result:** ${res.data.result_url}\n\n${current.footer}`);
            } catch {
                await m.reply(current.err);
            }
        }
    }
};
