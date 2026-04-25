// VEX MINI BOT - VEX: bet
// Nova: Predictive Analytics & Betting Oracle
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'bet',
    cyro: 'games',
    nova: 'Generates real-time football predictions, win probabilities, and betting strategy',

    async execute(m, sock) {
        // 1. REACTION & INITIALIZATION
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔮", key: m.key } });

        try {
            // 2. FETCHING TODAY'S FIXTURES (Worldwide Live Data)
            // Tunatumia API inayovuta mechi zote za leo na utabiri wake
            const response = await axios.get(`https://api.vreden.my.id/api/football-predict`);
            const matches = response.data.result.slice(0, 10); // Tunachukua mechi 10 bora za kwanza

            if (!matches || matches.length === 0) {
                return await sock.sendMessage(m.key.remoteJid, { 
                    text: "*❌ VEX-ERROR:* No active fixtures detected for the current timeframe." 
                });
            }

            // 3. CONSTRUCTING THE ORACLE REPORT (Premium English)
            const sender = m.sender || m.key.participant || m.key.remoteJid;
            let betMsg = `╭━━━〔 🔮 *VEX: BET-ORACLE* 〕━━━╮\n`;
            betMsg += `┃ 🌟 *Status:* Market Analysis Live\n`;
            betMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            betMsg += `┃ 🧬 *Engine:* Predictive-AI V9\n`;
            betMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            betMsg += `*🛰️ TODAY'S TOP PICKS*\n`;

            let totalOdds = 1.0;

            matches.forEach((match, index) => {
                const homeProb = match.probability.home || "40%";
                const drawProb = match.probability.draw || "30%";
                const awayProb = match.probability.away || "30%";
                const currentOdds = parseFloat(match.odds || 1.5);
                totalOdds *= currentOdds;

                betMsg += `*${index + 1}. ${match.home} vs ${match.away}*\n`;
                betMsg += `| ◈ *Outcome:* ${match.prediction} (${homeProb})\n`;
                betMsg += `| ◈ *BTTS (GG):* ${match.btts === 'Yes' ? '✅' : '❌'}\n`;
                betMsg += `| ◈ *Est. Odds:* ${match.odds || '1.50'}\n`;
                betMsg += `╰───────────────╯\n`;
            });

            // 4. VEX STAKE INTELLIGENCE (Hesabu za Pesa)
            const recommendedStake = 10000; // Default stake 10k
            const potentialWin = Math.floor(recommendedStake * totalOdds);

            betMsg += `\n*💰 VEX STAKING STRATEGY*\n`;
            betMsg += `| ◈ *Total Acc. Odds:* ${totalOdds.toFixed(2)}\n`;
            betMsg += `| ◈ *Recommended Stake:* ${recommendedStake.toLocaleString()} TZS\n`;
            betMsg += `| ◈ *Potential Returns:* ${potentialWin.toLocaleString()} TZS\n\n`;

            betMsg += `*⚠️ LEGAL DISCLAIMER*\n`;
            betMsg += `_VEX predictions are based on statistical probability. Bet responsibly. 18+ only._\n\n`;

            betMsg += `*📢 SYSTEM NOTE*\n`;
            betMsg += `┃ 💠 Tactical market sync established.\n`;
            betMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            betMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            betMsg += `_VEX MINI BOT: Beat The Bookies_`;

            // 5. SEND THE FINAL TICKET
            await sock.sendMessage(m.key.remoteJid, { 
                text: betMsg,
                mentions: [sender]
            }, { quoted: m });

        } catch (error) {
            console.error("Bet Oracle Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Statistical servers are currently congested. Retry later." 
            }, { quoted: m });
        }
    }
};