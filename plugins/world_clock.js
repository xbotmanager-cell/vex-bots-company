// ================= LUPER-MD WORLD CLOCK ENGINE =================
const translate = require('google-translate-api-x');

module.exports = {
    command: "timezone",
    alias: ["muda", "clock", "worldtime"],
    category: "world",
    description: "Check current time in different cities around the world",

    async execute(m, sock, { args, userSettings, lang, prefix }) {
        // 1. CONFIG & STYLE SYNC
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';
        const city = args[0]?.toLowerCase();

        // 2. DATA POOL (City Timezones)
        const timezones = {
            london: "Europe/London",
            newyork: "America/New_York",
            tokyo: "Asia/Tokyo",
            dubai: "Asia/Dubai",
            paris: "Europe/Paris",
            nairobi: "Africa/Nairobi",
            mumbai: "Asia/Kolkata",
            sydney: "Australia/Sydney",
            moscow: "Europe/Moscow"
        };

        // 3. STYLES DEFINITION
        const modes = {
            harsh: {
                title: "☣️ 𝕿𝕰𝕸𝕻𝕺𝕽𝕬𝕷 𝕾𝖀𝕽𝖁𝕰𝕴𝕷𝕷𝕬𝕹𝕮𝕰 ☣️",
                line: "━",
                header: "💀 𝕸𝖔𝖓𝖎𝖙𝖔𝖗𝖎𝖓𝖌 𝖌𝖑𝖔𝖇𝖆𝖑 𝖈𝖍𝖗𝖔𝖓𝖔𝖒𝖊𝖙𝖊𝖗𝖘:",
                invalid: `❌ 𝕾𝖕𝖊𝖈𝖎𝖋𝖞 𝖆 𝖈𝖎𝖙𝖞! 𝕰𝖝: ${prefix}𝖙𝖎𝖒𝖊𝖟𝖔𝖓𝖊 𝖑𝖔𝖓𝖉𝖔𝖓`,
                react: "⌚"
            },
            normal: {
                title: "🌍 VEX WORLD CLOCK 🌍",
                line: "─",
                header: "💡 Current Time Intel:",
                invalid: `❓ Please provide a city name! Example: ${prefix}timezone tokyo`,
                react: "🌍"
            },
            girl: {
                title: "🫧 𝒯𝒾𝓂𝑒𝓁𝓎 𝒫𝓇𝒾𝓃𝒸𝑒𝓈𝓈 𝒲𝒶𝓉𝒸𝒽 🫧",
                line: "┄",
                header: "🫧 𝓌𝒽𝒶𝓉 𝓉𝒾𝓂𝑒 𝒾𝓈 𝒾𝓉 𝓉𝒽𝑒𝓇𝑒, 𝒹𝑒𝒶𝓇? 🫧",
                invalid: `🫧 𝓉𝑒𝓁𝓁 𝓂𝑒 𝓌𝒽𝒾𝒸𝒽 𝒸𝒾𝓉𝓎, 𝒹𝒶𝓇𝓁𝒾𝓃𝑔~ 🫧`,
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        // 4. VALIDATION
        if (!city || !timezones[city]) {
            return m.reply(current.invalid);
        }

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 5. TIME CALCULATION
            const options = {
                timeZone: timezones[city],
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            };
            
            const localTime = new Intl.DateTimeFormat('en-US', options).format(new Date());

            // 6. BUILD THE REPORT
            let report = `*${current.title}*\n${current.line.repeat(15)}\n\n`;
            report += `*${current.header}*\n\n`;
            report += `📍 *City:* ${city.toUpperCase()}\n`;
            report += `⏰ *Time:* ${localTime}\n\n`;
            report += `${current.line.repeat(15)}\n_VEX System - Lupin Edition_`;

            // 7. TRANSLATE & SEND
            const { text: translatedMsg } = await translate(report, { to: targetLang });
            await m.reply(translatedMsg);

        } catch (error) {
            console.error("TIMEZONE ERROR:", error);
            await m.reply("☣️ Clock synchronization failed.");
        }
    }
};
