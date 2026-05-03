const translate = require('google-translate-api-x');

module.exports = {
    command: "efootball",
    alias: ["efoot", "pes", "game"],
    category: "games",
    description: "Anzisha mechi ya eFootball na marafiki zako",

    async execute(m, sock, { args, supabase, userSettings, prefix }) {
        // 1. SETTINGS & PREFERENCES
        const style = userSettings?.style || 'harsh';
        const lang = userSettings?.lang || 'en';

        // 2. LIST YA TIMU 15 (INTERNATIONAL)
        const teams = [
            { name: "Real Madrid", stars: "⭐⭐⭐⭐⭐", power: 9.8 },
            { name: "Manchester City", stars: "⭐⭐⭐⭐⭐", power: 9.7 },
            { name: "Bayern Munich", stars: "⭐⭐⭐⭐⭐", power: 9.5 },
            { name: "Arsenal", stars: "⭐⭐⭐⭐✧", power: 9.0 },
            { name: "Liverpool", stars: "⭐⭐⭐⭐✧", power: 8.9 },
            { name: "Barcelona", stars: "⭐⭐⭐⭐✧", power: 8.8 },
            { name: "Paris SG", stars: "⭐⭐⭐⭐✧", power: 8.7 },
            { name: "Inter Milan", stars: "⭐⭐⭐⭐✧", power: 8.6 },
            { name: "Bayer Leverkusen", stars: "⭐⭐⭐⭐✧", power: 8.5 },
            { name: "Atletico Madrid", stars: "⭐⭐⭐⭐", power: 8.2 },
            { name: "Borussia Dortmund", stars: "⭐⭐⭐⭐", power: 8.1 },
            { name: "Aston Villa", stars: "⭐⭐⭐✧", power: 7.8 },
            { name: "AC Milan", stars: "⭐⭐⭐✧", power: 7.7 },
            { name: "Sporting CP", stars: "⭐⭐⭐✧", power: 7.5 },
            { name: "Napoli", stars: "⭐⭐⭐✧", power: 7.3 }
        ];

        // 3. STYLES DEFINITION (FONTS & SYMBOLS)
        const modes = {
            harsh: {
                title: "☣️ 𝕰𝕱𝕺𝕺𝕿𝕭𝕬𝕷𝕷 𝖂𝕺𝕽𝕷𝕯 ☣️",
                line: "━",
                arrow: "╰─>",
                joinMsg: "⚙️ 𝕽𝖊𝖕𝖑𝖞 𝖜𝖎𝖙𝖍 𝖙𝖊𝖆𝖒 𝖓𝖚𝖒𝖇𝖊𝖗 𝖙𝖔 𝖏𝖔𝖎𝖓. 𝕯𝖔𝖓'𝖙 𝖇𝖊 𝖆 𝖑𝖔𝖘𝖊𝖗.",
                react: "⚽"
            },
            normal: {
                title: "🏟️ E-FOOTBALL CHAMPIONSHIP 🏟️",
                line: "─",
                arrow: "└──>",
                joinMsg: "📝 Reply with a number (1-15) to select your team!",
                react: "🏟️"
            },
            girl: {
                title: "🫧 𝑒𝐹𝑜𝑜𝑡𝒷𝒶𝓁𝓁 𝒫𝒾𝓃𝓀 𝒞𝓊𝓅 🫧",
                line: "┄",
                arrow: "╰┈➤",
                joinMsg: "🫧 𝓅𝒾𝒸𝓀 𝒶 𝓃𝓊𝓂𝒷𝑒𝓇 𝓉𝑜 𝓅𝓁𝒶𝓎 𝓌𝒾𝓉𝒽 𝓂𝑒, 𝓅𝓇𝒾𝓃𝒸𝑒𝓈𝓈! 🫧",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        // 4. BUILD THE UI (DASHBOARD)
        let dashboard = `*${current.title}*\n${current.line.repeat(20)}\n\n`;

        teams.forEach((t, i) => {
            const num = (i + 1).toString().padStart(2, '0');
            dashboard += `*${num}.* ${t.name}\n${current.arrow} ${t.stars} (${t.power})\n${current.line.repeat(15)}\n`;
        });

        dashboard += `\n[ 👥 *PARTICIPANTS:* 0 / 15 ]\n`;
        dashboard += `[ ⏳ *STATUS:* WAITING... (60s) ]\n\n`;
        dashboard += `_${current.joinMsg}_`;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 5. TRANSLATION (Optional for the join message)
            const { text: translatedMsg } = await translate(dashboard, { to: lang });

            // 6. SEND & SAVE TO CACHE (Kwa ajili ya Observer)
            const sent = await m.reply(translatedMsg);

            // Tunahifadhi game state kwenye cache ili Observer ajue hii ndio message ya kureply
            // Hapa itasaidia kuzuia spam na kuhakikisha game inaisha baada ya 60s
            global.activeGames = global.activeGames || {};
            global.activeGames[m.chat] = {
                messageId: sent.key.id,
                teams: teams,
                participants: [],
                startTime: Date.now(),
                style: style
            };

        } catch (error) {
            console.error("EFOOTBALL ERROR:", error);
            await m.reply("☣️ System Failure. Pitch is currently flooded.");
        }
    }
};
