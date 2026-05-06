// ================= VEX ASTROLOGY ENGINE - LUPIN EDITION =================
const translate = require('google-translate-api-x');

module.exports = {
    command: "star",
    alias: ["star", "horoscope", "fortune", "zodiac"],
    category: "lifestyle",
    description: "Get your daily zodiac sign prediction with luck analysis",

    async execute(m, sock, { args, userSettings, lang, prefix }) {
        // 1. CONFIG & STYLE SYNC
        const style = userSettings?.style || 'normal';
        const targetLang = lang || 'en';
        const sign = args[0]?.toLowerCase();

        // 2. DATA POOL (Zodiac Predictions)
        const zodiacs = {
            aries: { msg: "Your energy is high today. Take the lead in your projects.", sym: "♈" },
            taurus: { msg: "Financial stability is coming. Be patient with your investments.", sym: "♉" },
            gemini: { msg: "Communication is key today. Reach out to an old friend.", sym: "♊" },
            cancer: { msg: "Your intuition is sharp. Trust your gut feelings.", sym: "♋" },
            leo: { msg: "You are the center of attention. Shine bright like a star.", sym: "♌" },
            virgo: { msg: "Focus on the details. Organization will bring you peace.", sym: "♍" },
            libra: { msg: "Balance is needed in your relationships. Stay calm.", sym: "♎" },
            scorpio: { msg: "Passion is driving you today. Focus it on something creative.", sym: "♏" },
            sagittarius: { msg: "Adventure is calling. Explore new ideas and places.", sym: "♐" },
            capricorn: { msg: "Hard work pays off. Keep pushing toward your goals.", sym: "♑" },
            aquarius: { msg: "Innovation is your strength. Think outside the box.", sym: "♒" },
            pisces: { msg: "Your dreams are vivid. Listen to what they are telling you.", sym: "♓" }
        };

        // 3. STYLES DEFINITION
        const modes = {
            harsh: {
                title: "☣️ 𝕯𝕴𝕲𝕴𝕿𝕬𝕷 𝕺𝕽𝕬𝕮𝕷𝕰 ☣️",
                line: "━",
                header: "💀 𝖄𝖔𝖚𝖗 𝖋𝖆𝖙𝖊 𝖎𝖘 𝖘𝖊𝖆𝖑𝖊𝖉, 𝖒𝖔𝖗𝖙𝖆𝖑:",
                luck: "🩸 𝕷𝖚𝖈𝖐 𝕽𝖆𝖙𝖊:",
                invalid: `❌ 𝕾𝖕𝖊𝖈𝖎𝖋𝖞 𝖆 𝖘𝖎𝖌𝖓! 𝕰𝖝: ${prefix}𝖘𝖙𝖆𝖗 𝖑𝖊𝖔`,
                react: "🔮"
            },
            normal: {
                title: "🌟 VEX HOROSCOPE 🌟",
                line: "─",
                header: "💡 Daily Zodiac Insight:",
                luck: "🍀 Luck Meter:",
                invalid: `❓ Please provide a sign! Example: ${prefix}star aries`,
                react: "🌟"
            },
            girl: {
                title: "🫧 𝒮𝓉𝒶𝓇𝓇𝓎 𝐹𝑜𝓇𝓉𝓊𝓃𝑒 𝒫𝓇𝒾𝓃𝒸𝑒𝓈𝓈 🫧",
                line: "┄",
                header: "🫧 𝓌𝒽𝒶𝓉 𝒹𝑜 𝓉𝒽𝑒 𝓈𝓉𝒶𝓇𝓈 𝓈𝒶𝓎 𝒻𝑜𝓇 𝓎𝑜𝓊? 🫧",
                luck: "✨ 𝓁𝓊𝒸𝓀𝓎 𝓈𝒸𝑜𝓇𝑒:",
                invalid: `🫧 𝓅𝓁𝑒𝒶𝓈𝑒 𝓉𝑒𝓁𝓁 𝓂𝑒 𝓎𝑜𝓊𝓇 𝓈𝒾𝑔𝓃, 𝒹𝑒𝒶𝓇~ 🫧`,
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        // 4. VALIDATION
        if (!sign || !zodiacs[sign]) {
            return m.reply(current.invalid);
        }

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 5. GENERATE UPGRADED FEATURES
            const luckRate = Math.floor(Math.random() * 101);
            const luckyNumber = Math.floor(Math.random() * 99) + 1;
            const colors = ["Red", "Blue", "Gold", "Silver", "Black", "Green", "Purple", "White"];
            const luckyColor = colors[Math.floor(Math.random() * colors.length)];

            // 6. BUILD THE MESSAGE
            let report = `*${current.title}*\n${current.line.repeat(15)}\n\n`;
            report += `*${current.header}*\n\n`;
            report += `${zodiacs[sign].sym} *${sign.toUpperCase()}:* \n"${zodiacs[sign].msg}"\n\n`;
            report += `${current.luck} *${luckRate}%*\n`;
            report += `🎨 Lucky Color: *${luckyColor}*\n`;
            report += `🔢 Lucky Number: *${luckyNumber}*\n\n`;
            report += `${current.line.repeat(15)}\n_VEX Intelligence - Lupin Edition_`;

            // 7. TRANSLATE & SEND
            const { text: translatedMsg } = await translate(report, { to: targetLang });
            await m.reply(translatedMsg);

        } catch (error) {
            console.error("STAR ERROR:", error);
            await m.reply("☣️ The stars are hidden behind cosmic clouds.");
        }
    }
};
