// VEX MINI BOT - VEX: bet
// Nova: Predictive Analytics & Betting Oracle (API-FOOTBALL Edition)
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'bet',
    cyro: 'games',
    nova: 'Generates real-time football predictions, win probabilities, and betting strategy',

    async execute(m, sock) {
        const apiKey = 'f43fca818abd662df539e18d2f28826eb4bf125a18eaf49b07804e9bd72cf059';
        const baseUrl = 'https://v3.football.api-sports.io';

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔮", key: m.key } });

        try {
            // 1. GET TODAY'S DATE (YYYY-MM-DD)
            const today = new Date().toISOString().split('T')[0];

            // 2. FETCH FIXTURES (Tunatafuta mechi za leo - mfano Premier League '39' au zote)
            // Unaweza kubadilisha league=39 kwa EPL au ondoa league kwa mechi zote
            const fixturesRes = await axios.get(`${baseUrl}/fixtures?date=${today}&next=10`, {
                headers: {
                    'x-rapidapi-key': apiKey,
                    'x-rapidapi-host': 'v3.football.api-sports.io'
                }
            });

            const fixtures = fixturesRes.data.response;

            if (!fixtures || fixtures.length === 0) {
                return m.reply("*❌ VEX-ERROR:* No elite fixtures detected for the current tactical window.");
            }

            let betMsg = `╭━━━〔 🔮 *VEX: BET-ORACLE* 〕━━━╮\n`;
            betMsg += `┃ 🌟 *Status:* Market Analysis Live\n`;
            betMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            betMsg += `┃ 🧬 *Engine:* API-Sports V3\n`;
            betMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            betMsg += `*🛰️ TOP ANALYZED PICKS*\n\n`;

            // 3. LOOP THROUGH FIXTURES TO GET PREDICTIONS (Limit to 5 to avoid rate limits)
            for (let i = 0; i < Math.min(fixtures.length, 5); i++) {
                const fixId = fixtures[i].fixture.id;
                const teamHome = fixtures[i].teams.home.name;
                const teamAway = fixtures[i].teams.away.name;

                // Fetch Detailed Prediction
                const predRes = await axios.get(`${baseUrl}/predictions?fixture=${fixId}`, {
                    headers: {
                        'x-rapidapi-key': apiKey,
                        'x-rapidapi-host': 'v3.football.api-sports.io'
                    }
                });

                const predData = predRes.data.response[0];
                if (predData) {
                    const winner = predData.predictions.winner.name;
                    const winProb = predData.predictions.percent.home || predData.predictions.percent.away;
                    const advice = predData.predictions.advice;

                    betMsg += `*${i + 1}. ${teamHome} vs ${teamAway}*\n`;
                    betMsg += `| ◈ *Oracle Tip:* ${winner}\n`;
                    betMsg += `| ◈ *Confidence:* ${winProb}\n`;
                    betMsg += `| ◈ *Tactical Adv:* ${advice}\n`;
                    betMsg += `╰───────────────╯\n`;
                }
            }

            betMsg += `\n*💰 VEX STAKING STRATEGY*\n`;
            betMsg += `| ◈ *Risk Level:* Moderate\n`;
            betMsg += `| ◈ *Stake Type:* Multi-Bet (Accumulator)\n`;
            betMsg += `| ◈ *Strategy:* 2.5% of Bankroll\n\n`;

            betMsg += `*⚠️ LEGAL DISCLAIMER*\n`;
            betMsg += `_VEX predictions are calculated by AI models. Bet responsibly. 18+ only._\n\n`;

            betMsg += `*📢 SYSTEM NOTE*\n`;
            betMsg += `┃ 💠 Tactical market sync established.\n`;
            betMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            betMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            betMsg += `_VEX MINI BOT: Beat The Bookies_`;

            await sock.sendMessage(m.key.remoteJid, { text: betMsg }, { quoted: m });

        } catch (error) {
            console.error("Bet Oracle Error:", error);
            await m.reply("*❌ VEX-ERROR:* Statistical servers (API-Football) are unreachable. Check your API Key status.");
        }
    }
};
