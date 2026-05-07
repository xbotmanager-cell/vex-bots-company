const axios = require("axios");
const translate = require("google-translate-api-x");

module.exports = {
    command: "surebet",
    alias: ["bet", "odds"],
    category: "games",
    description: "Advanced surebet & betting intelligence",

    async execute(m, sock, { userSettings }) {

        // ================= API =================
        const ODDS_API_KEY =
            "b771e884a70de4db3c108e6cbbb9e233";

        // ================= SETTINGS =================
        const style =
            userSettings?.style || "harsh";

        const lang =
            userSettings?.lang || "en";

        // DEFAULT STAKE
        const STAKE = 1000;

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

        const current =
            modes[style] || modes.normal;

        try {

            // REACTION
            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: current.react,
                        key: m.key
                    }
                }
            );

            await m.reply(current.scan);

            // ================= FETCH ODDS =================
            const url =
`https://api.the-odds-api.com/v4/sports/soccer/odds/?apiKey=${ODDS_API_KEY}&regions=eu,uk&markets=h2h`;

            const { data } =
                await axios.get(url);

            let report =
`*${current.title}*
${current.line.repeat(25)}

💵 *Default Stake:* 1000 TSH
✅ = Recommended
❌ = Avoid

`;

            let totalMatches = 0;

            // ================= LOOP =================
            for (const match of data.slice(0, 10)) {

                const home =
                    match.home_team;

                const away =
                    match.away_team;

                let bestHome = 0;
                let bestDraw = 0;
                let bestAway = 0;

                let homeBook = "";
                let drawBook = "";
                let awayBook = "";

                // ================= BEST ODDS =================
                match.bookmakers?.forEach(book => {

                    book.markets?.forEach(market => {

                        if (market.key === "h2h") {

                            market.outcomes.forEach(o => {

                                if (
                                    o.name === home &&
                                    o.price > bestHome
                                ) {
                                    bestHome = o.price;
                                    homeBook = book.title;
                                }

                                if (
                                    o.name === away &&
                                    o.price > bestAway
                                ) {
                                    bestAway = o.price;
                                    awayBook = book.title;
                                }

                                if (
                                    o.name === "Draw" &&
                                    o.price > bestDraw
                                ) {
                                    bestDraw = o.price;
                                    drawBook = book.title;
                                }

                            });
                        }

                    });

                });

                if (
                    !bestHome ||
                    !bestDraw ||
                    !bestAway
                ) continue;

                totalMatches++;

                // ================= CALCULATIONS =================
                const homeReturn =
                    (STAKE * bestHome).toFixed(0);

                const drawReturn =
                    (STAKE * bestDraw).toFixed(0);

                const awayReturn =
                    (STAKE * bestAway).toFixed(0);

                const sum =
                    (1 / bestHome) +
                    (1 / bestDraw) +
                    (1 / bestAway);

                const surebet =
                    sum < 1;

                const edge =
                    ((1 - sum) * 100)
                    .toFixed(2);

                // ================= PICK LOGIC =================
                let bestPick = "";
                let bestOdd = 0;

                if (bestHome > bestDraw && bestHome > bestAway) {
                    bestPick = `🏠 ${home}`;
                    bestOdd = bestHome;
                }

                if (bestDraw > bestHome && bestDraw > bestAway) {
                    bestPick = `🤝 DRAW`;
                    bestOdd = bestDraw;
                }

                if (bestAway > bestHome && bestAway > bestDraw) {
                    bestPick = `🛫 ${away}`;
                    bestOdd = bestAway;
                }

                // ================= SAFE RATING =================
                let status = "❌";

                if (bestOdd >= 1.50 && bestOdd <= 2.50) {
                    status = "✅";
                }

                if (surebet) {
                    status = "🔥";
                }

                // ================= REPORT =================
                report +=
`${current.line.repeat(20)}

⚽ *${home} vs ${away}*

${status} *Recommended:* ${bestPick}

📊 *ODDS*
🏠 Home  → ${bestHome}
🤝 Draw  → ${bestDraw}
🛫 Away  → ${bestAway}

💰 *1000 TSH RETURNS*
🏠 ${home}  → ${homeReturn} TSH
🤝 Draw     → ${drawReturn} TSH
🛫 ${away}  → ${awayReturn} TSH

🏪 *BOOKMAKERS*
🏠 ${homeBook}
🤝 ${drawBook}
🛫 ${awayBook}
`;

                // ================= SUREBET =================
                if (surebet) {

                    report +=
`
🔥 *SUREBET DETECTED*
📈 Edge Profit: ${edge}%
`;
                }

            }

            // ================= FOOTER =================
            report +=
`
${current.line.repeat(25)}

📌 *Total Matches:* ${totalMatches}

💡 Betting Guide:
✅ = safer odds
🔥 = surebet chance
❌ = risky market

_Lupin Betting Intelligence_
`;

            // ================= TRANSLATION =================
            let finalMsg = report;

            try {

                if (lang !== "en") {

                    const translated =
                        await translate(
                            report,
                            {
                                to: lang
                            }
                        );

                    finalMsg =
                        translated.text;
                }

            } catch {}

            // ================= SEND =================
            await m.reply(finalMsg);

        } catch (err) {

            console.error(
                "SUREBET ERROR:",
                err
            );

            return m.reply(
                current.fail
            );
        }
    }
};
