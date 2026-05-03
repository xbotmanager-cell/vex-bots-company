// ================= LUPER-MD BETTING INTELLIGENCE =================
const axios = require("axios");
const translate = require("google-translate-api-x");

module.exports = {
    command: "surebet",
    alias: ["bet", "odds"],
    category: "games",
    description: "Advanced surebet & value betting intelligence",

    async execute(m, sock, { args, userSettings, prefix }) {

        // ================= API KEYS =================
        const ODDS_API_KEY = "b771e884a70de4db3c108e6cbbb9e233";

        // ================= SETTINGS =================
        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        // ================= STYLES =================
        const modes = {
            harsh: {
                title: "☣️ 𝕾𝖀𝕽𝕰𝕭𝕰𝕿 𝕴𝕹𝕿𝕰𝕷 ☣️",
                line: "━",
                scan: "⚡ Scanning global betting networks...",
                fail: "☠️ Market feed lost.",
                react: "💀"
            },
            normal: {
                title: "💰 SUREBET ANALYSIS 💰",
                line: "─",
                scan: "🔎 Scanning matches...",
                fail: "⚠️ Could not fetch odds.",
                react: "📊"
            },
            girl: {
                title: "🫧 𝒮𝓊𝓇𝑒𝒷𝑒𝓉 𝐿𝑜𝓋𝑒𝓁𝓎 𝒜𝓃𝒶𝓁𝓎𝓈𝒾𝓈 🫧",
                line: "┄",
                scan: "🫧 checking cute matches~",
                fail: "🥺 couldn't find bets...",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            await m.reply(current.scan);

            // ================= FETCH ODDS =================
            const url = `https://api.the-odds-api.com/v4/sports/soccer/odds/?apiKey=${ODDS_API_KEY}&regions=eu,uk&markets=h2h,totals`;

            const { data } = await axios.get(url);

            let report = `*${current.title}*\n${current.line.repeat(20)}\n\n`;

            let found = 0;

            for (const match of data.slice(0, 15)) {

                const home = match.home_team;
                const away = match.away_team;

                let bestHome = 0;
                let bestDraw = 0;
                let bestAway = 0;

                let over25 = 0;
                let under25 = 0;

                // ================= EXTRACT BEST ODDS =================
                match.bookmakers?.forEach(b => {
                    b.markets?.forEach(market => {

                        // 1X2
                        if (market.key === "h2h") {
                            market.outcomes.forEach(o => {
                                if (o.name === home) bestHome = Math.max(bestHome, o.price);
                                if (o.name === away) bestAway = Math.max(bestAway, o.price);
                                if (o.name === "Draw") bestDraw = Math.max(bestDraw, o.price);
                            });
                        }

                        // OVER UNDER
                        if (market.key === "totals") {
                            market.outcomes.forEach(o => {
                                if (o.name === "Over" && o.point === 2.5) {
                                    over25 = Math.max(over25, o.price);
                                }
                                if (o.name === "Under" && o.point === 2.5) {
                                    under25 = Math.max(under25, o.price);
                                }
                            });
                        }

                    });
                });

                if (!bestHome || !bestAway || !bestDraw) continue;

                // ================= SUREBET CALC =================
                const sum = (1 / bestHome) + (1 / bestDraw) + (1 / bestAway);

                // ================= DISPLAY =================
                if (sum < 1) {
                    found++;
                    report += `🔥 *SUREBET*\n`;
                    report += `${home} vs ${away}\n`;
                    report += `H:${bestHome} D:${bestDraw} A:${bestAway}\n`;
                    report += `Edge: ${(1 - sum).toFixed(3)}\n`;
                    report += `${current.line.repeat(10)}\n`;
                }

                // ================= VALUE BET =================
                else if (bestHome > 2.2 || bestAway > 2.2) {
                    report += `⚡ *VALUE BET*\n`;
                    report += `${home} vs ${away}\n`;
                    report += `H:${bestHome} D:${bestDraw} A:${bestAway}\n`;
                    report += `${current.line.repeat(10)}\n`;
                }

                // ================= OVER/UNDER =================
                if (over25 && under25) {
                    report += `🎯 O/U 2.5\n`;
                    report += `Over: ${over25} | Under: ${under25}\n`;
                    report += `${current.line.repeat(10)}\n`;
                }
            }

            if (found === 0) {
                report += "❌ No surebets found. Market tight.\n";
            }

            report += `\n${current.line.repeat(20)}\n_Lupin Betting Intelligence_`;

            // ================= TRANSLATE =================
            let finalMsg = report;

            try {
                const { text } = await translate(report, { to: lang });
                finalMsg = text;
            } catch {}

            await m.reply(finalMsg);

        } catch (err) {
            console.error("SUREBET ERROR:", err);
            await m.reply(current.fail);
        }
    }
};
