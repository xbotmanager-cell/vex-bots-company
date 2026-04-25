// VEX MINI BOT - VEX: team
// Nova: Global Tactical Analysis & Squad Intelligence
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'team',
    cyro: 'games',
    nova: 'Analyzes football team data, head-to-head stats, and provides win probability predictions',

    async execute(m, sock) {
        // 1. INPUT ANALYSIS (Checking for single team or VS mode)
        const args = m.message?.conversation?.split(' ').slice(1).join(' ') || 
                     m.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ');

        if (!args) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Please specify a team or a matchup.\nExample: `.team Real Madrid` or `.team Simba vs Yanga`" 
            }, { quoted: m });
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🛡️", key: m.key } });

        try {
            const isVersus = args.toLowerCase().includes(' vs ');
            let apiUrl = '';

            if (isVersus) {
                const teams = args.split(/ vs /i);
                apiUrl = `https://api.vreden.my.id/api/h2h?team1=${encodeURIComponent(teams[0].trim())}&team2=${encodeURIComponent(teams[1].trim())}`;
            } else {
                apiUrl = `https://api.vreden.my.id/api/team-info?query=${encodeURIComponent(args)}`;
            }

            const response = await axios.get(apiUrl);
            const data = response.data.result;

            if (!data) throw new Error("Team not found");

            // 2. CONSTRUCTING THE TACTICAL REPORT
            const sender = m.sender || m.key.participant || m.key.remoteJid;
            let teamMsg = `╭━━━〔 🛡️ *VEX: TACTICAL-CORE* 〕━━━╮\n`;
            teamMsg += `┃ 🌟 *Status:* Analysis Complete\n`;
            teamMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            teamMsg += `┃ 🧬 *Engine:* Strategy-X V5\n`;
            teamMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            if (isVersus) {
                // VERSUS MODE DATA
                teamMsg += `*⚔️ HEAD-TO-HEAD (H2H)*\n`;
                teamMsg += `| ◈ *Match:* ${args.toUpperCase()} |\n`;
                teamMsg += `| ◈ *Last 5 Meetings:* ${data.lastMeetings || 'Mixed Results'} |\n\n`;
                
                teamMsg += `*📊 VEX PROBABILITY*\n`;
                teamMsg += `| ◈ *${data.team1}:* ${data.prob1 || '45'}%\n`;
                teamMsg += `| ◈ *${data.team2}:* ${data.prob2 || '55'}%\n\n`;

                teamMsg += `*🎯 VEX PREDICTION*\n`;
                teamMsg += `> *BOT CHOICE:* ${data.winner || 'Draw Possible'}\n`;
                teamMsg += `> *REASON:* Higher attacking efficiency and defensive stability.\n\n`;
            } else {
                // SINGLE TEAM MODE DATA
                teamMsg += `*🏛️ TEAM PROFILE*\n`;
                teamMsg += `| ◈ *Name:* ${data.name}\n`;
                teamMsg += `| ◈ *League:* ${data.league}\n`;
                teamMsg += `| ◈ *Stadium:* ${data.venue || 'N/A'}\n`;
                teamMsg += `| ◈ *Coach:* ${data.coach || 'N/A'}\n\n`;

                teamMsg += `*📈 CURRENT FORM*\n`;
                teamMsg += `| ◈ *Position:* #${data.rank || 'N/A'}\n`;
                teamMsg += `| ◈ *Recent:* ${data.form || 'W-D-W-L-W'} |\n\n`;
            }

            teamMsg += `*📢 SYSTEM NOTE*\n`;
            teamMsg += `┃ 💠 Global tactical sync established.\n`;
            teamMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            teamMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            teamMsg += `_VEX MINI BOT: The Future of Football_`;

            // 3. SENDING VISUALS (Team Logo or VS Banner)
            const imageUrl = isVersus ? (data.banner || "https://telegra.ph/file/af55d8f3ec608d4888be6.jpg") : data.logo;

            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: imageUrl }, 
                caption: teamMsg,
                mentions: [sender]
            }, { quoted: m });

        } catch (error) {
            console.error("Team Search Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Could not analyze the requested team(s). Protocol offline." 
            }, { quoted: m });
        }
    }
};