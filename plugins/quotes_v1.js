// ================= LUPER-MD QUOTE ENGINE =================
const translate = require('google-translate-api-x');

module.exports = {
    command: "quote",
    alias: ["nukuu", "motivation", "words"],
    category: "inspiration",
    description: "Get daily inspiration and powerful quotes",

    async execute(m, sock, { userSettings, lang }) {
        // 1. CONFIG & STYLE SYNC
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';

        // 2. DATA POOL (Powerful Quotes)
        const quotes = [
            { text: "Knowledge is the only weapon which can kill poverty.", author: "Nelson Mandela" },
            { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
            { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
            { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
            { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
            { text: "Don't count the days, make the days count.", author: "Muhammad Ali" }
        ];

        const selected = quotes[Math.floor(Math.random() * quotes.length)];

        // 3. STYLES DEFINITION
        const modes = {
            harsh: {
                title: "☣️ 𝕯𝕴𝕲𝕴𝕿𝕬𝕷 𝖂𝕴𝕾𝕯𝕺𝕸 ☣️",
                line: "━",
                header: "💀 𝕷𝖎𝖘𝖙𝖊𝖓 𝖈𝖆𝖗𝖊𝖋𝖚𝖑𝖑𝖞, 𝖜𝖊𝖆𝖐𝖑𝖎𝖓𝖌:",
                footer: "𝕰𝖝𝖊𝖈𝖚𝖙𝖊 𝖔𝖗 𝖇𝖊 𝖋𝖔𝖗𝖌𝖔𝖙𝖙𝖊𝖓.",
                react: "🧠"
            },
            normal: {
                title: "📜 VEX QUOTES 📜",
                line: "─",
                header: "💡 Words of Wisdom:",
                footer: "Stay focused and keep moving.",
                react: "📜"
            },
            girl: {
                title: "🫧 𝒬𝓊𝑜𝓉𝑒 𝒫𝓇𝒾𝓃𝒸𝑒𝓈𝓈 🫧",
                line: "┄",
                header: "🫧 𝓈𝑜𝓂𝑒𝓉𝒽𝒾𝓃𝑔 𝓈𝓌𝑒𝑒𝓉 𝒻𝑜𝓇 𝓎𝑜𝓊~ 🫧",
                footer: "🌸 𝒷𝑒𝓁𝒾𝑒𝓋𝑒 𝒾𝓃 𝓎𝑜𝓊𝓇𝓈𝑒𝓁𝒻, 𝒹𝑒𝒶𝓇! 🌸",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 4. BUILD THE MESSAGE
            let message = `*${current.title}*\n${current.line.repeat(15)}\n\n`;
            message += `*${current.header}*\n\n`;
            message += `"${selected.text}"\n\n`;
            message += `— *${selected.author}*\n\n`;
            message += `${current.line.repeat(15)}\n_${current.footer}_`;

            // 5. TRANSLATE & SEND
            const { text: translatedMsg } = await translate(message, { to: targetLang });
            await m.reply(translatedMsg);

        } catch (error) {
            console.error("QUOTE ERROR:", error);
            await m.reply("☣️ Wisdom database is offline.");
        }
    }
};
