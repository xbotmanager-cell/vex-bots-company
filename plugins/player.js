const axios = require("axios");
const translate = require("google-translate-api-x");

module.exports = {
    command: "player",
    alias: ["footballer", "pinfo", "fplayer"],
    category: "sports",
    description: "Get full intelligence about football players",

    async execute(m, sock, { args, userSettings, prefix }) {

        const API_KEY = "a47fca113GmLkaZvKbncgXkNj9hL8cQJCSCjXscK";

        // ================= SETTINGS =================
        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";
        const query = args.join(" ");

        // ================= STYLES =================
        const modes = {
            harsh: {
                title: "☣️ 𝕻𝕷𝕬𝖄𝕰𝕽 𝕴𝕹𝕿𝕰𝕷 ☣️",
                line: "━",
                react: "⚽",
                invalid: `❌ 𝕿𝖆𝖗𝖌𝖊𝖙 𝖒𝖎𝖘𝖘𝖎𝖓𝖌. Use: ${prefix}player Messi`
            },
            normal: {
                title: "⚽ PLAYER PROFILE",
                line: "─",
                react: "📊",
                invalid: `❓ Provide player name. Example: ${prefix}player Ronaldo`
            },
            girl: {
                title: "🫧 𝒫𝓁𝒶𝓎𝑒𝓇 𝒞𝓊𝓉𝑒 𝒫𝓇𝑜𝒻𝒾𝓁𝑒 🫧",
                line: "┄",
                react: "🎀",
                invalid: `🫧 who are we searching for? 🫧`
            }
        };

        const current = modes[style] || modes.normal;

        if (!query) return m.reply(current.invalid);

        try {
            await sock.sendMessage(m.chat, {
                react: { text: current.react, key: m.key }
            });

            // ================= FETCH PLAYER =================
            const res = await axios.get(`https://v3.football.api-sports.io/players?search=${query}`, {
                headers: { "x-apisports-key": API_KEY }
            });

            const playerData = res?.data?.response?.[0];

            if (!playerData) {
                return m.reply("❌ Player not found.");
            }

            const p = playerData.player;
            const stats = playerData.statistics?.[0] || {};

            // ================= SAFE EXTRACTION =================
            const name = p.name || "Unknown";
            const age = p.age || "N/A";
            const dob = p.birth?.date || "N/A";
            const country = p.nationality || "N/A";
            const height = p.height || "N/A";
            const weight = p.weight || "N/A";
            const injured = p.injured ? "🚑 YES" : "✅ NO";

            const team = stats.team?.name || "N/A";
            const league = stats.league?.name || "N/A";
            const position = stats.games?.position || "N/A";

            const appearances = stats.games?.appearences || 0;
            const goals = stats.goals?.total || 0;
            const assists = stats.goals?.assists || 0;

            const yellow = stats.cards?.yellow || 0;
            const red = stats.cards?.red || 0;

            const rating = stats.games?.rating || "N/A";

            // ================= BUILD REPORT =================
            let report = `*${current.title}*\n${current.line.repeat(20)}\n\n`;

            report += `👤 Name: ${name}\n`;
            report += `🌍 Nationality: ${country}\n`;
            report += `🎂 Age: ${age}\n`;
            report += `📅 DOB: ${dob}\n`;
            report += `📏 Height: ${height}\n`;
            report += `⚖️ Weight: ${weight}\n\n`;

            report += `${current.line.repeat(15)}\n`;

            report += `🏟 Team: ${team}\n`;
            report += `🏆 League: ${league}\n`;
            report += `📍 Position: ${position}\n\n`;

            report += `${current.line.repeat(15)}\n`;

            report += `⚽ Matches: ${appearances}\n`;
            report += `🥅 Goals: ${goals}\n`;
            report += `🎯 Assists: ${assists}\n`;
            report += `⭐ Rating: ${rating}\n\n`;

            report += `${current.line.repeat(15)}\n`;

            report += `🟨 Yellow Cards: ${yellow}\n`;
            report += `🟥 Red Cards: ${red}\n`;
            report += `🚑 Injured: ${injured}\n\n`;

            report += `${current.line.repeat(20)}\n`;
            report += `_VEX Football Intelligence_`;

            // ================= TRANSLATE SAFE =================
            let finalMsg = report;

            try {
                const { text } = await translate(report, { to: lang });
                finalMsg = text;
            } catch {
                finalMsg = report;
            }

            // ================= SEND =================
            await m.reply(finalMsg);

        } catch (error) {
            console.error("PLAYER ERROR:", error);
            await m.reply("⚠️ Failed to fetch player data.");
        }
    }
};
