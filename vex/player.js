// VEX MINI BOT - VEX: player
// Nova: Global Football Intelligence & Scouting Engine
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'player',
    cyro: 'games',
    nova: 'Retrieves worldwide football player statistics, market value, and transfer data',

    async execute(m, sock) {
        // 1. INPUT EXTRACTION
        const args = m.text.trim().split(/ +/).slice(1);
        const playerName = args.join(' ');

        if (!playerName) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Please provide a player name.\nExample: `.player Erling Haaland`" 
            }, { quoted: m });
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "⚽", key: m.key } });

        try {
            // 2. SCOUTING ENGINE (Using Football-Data.org API)
            // Token: 1f6a085908a6462e83f1d5c9b770feb6
            const response = await axios.get(`https://api.football-data.org/v4/persons?name=${encodeURIComponent(playerName)}`, {
                headers: { 'X-Auth-Token': '1f6a085908a6462e83f1d5c9b770feb6' }
            });

            const data = response.data.persons[0]; // Inachukua mchezaji wa kwanza aliyepatikana

            if (!data) {
                return await sock.sendMessage(m.key.remoteJid, { text: "*❌ VEX-ERROR:* Player not found in the global database." });
            }

            // 3. CONSTRUCTING THE SCOUTING REPORT
            const sender = m.sender || m.key.participant || m.key.remoteJid;
            let playerMsg = `╭━━━〔 ⚽ *VEX: GLOBAL-SCOUT* 〕━━━╮\n`;
            playerMsg += `┃ 🌟 *Status:* Scouting Complete\n`;
            playerMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            playerMsg += `┃ 🧬 *Engine:* Football-Data V4\n`;
            playerMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            playerMsg += `*👤 PLAYER PROFILE*\n`;
            playerMsg += `| ◈ *Full Name:* ${data.name || 'N/A'}\n`;
            playerMsg += `| ◈ *Current Club:* ${data.currentTeam?.name || 'Free Agent'}\n`;
            playerMsg += `| ◈ *Position:* ${data.position || 'N/A'}\n`;
            playerMsg += `| ◈ *Date of Birth:* ${data.dateOfBirth || 'N/A'}\n`;
            playerMsg += `| ◈ *Nationality:* ${data.nationality || 'N/A'}\n\n`;

            playerMsg += `*📊 PERFORMANCE & SPECS*\n`;
            playerMsg += `| ◈ *Shirt Number:* ${data.shirtNumber || 'N/A'}\n`;
            playerMsg += `| ◈ *Last Updated:* ${new Date(data.lastUpdated).toLocaleDateString()}\n`;
            playerMsg += `| ◈ *Contract Until:* ${data.currentTeam?.contract?.until || 'N/A'}\n\n`;

            playerMsg += `*📢 SYSTEM NOTE*\n`;
            playerMsg += `┃ 💠 Tactical data synchronized worldwide.\n`;
            playerMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            playerMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            playerMsg += `_VEX MINI BOT: Soccer Intelligence_`;

            // 4. VISUAL DELIVERY
            // Football-data.org haitoi picha za wachezaji moja kwa moja mara nyingi,
            // hivyo tunatumia picha ya timu kama fallback au placeholder ya VEX.
            const imageUrl = data.currentTeam?.crest || "https://telegra.ph/file/af55d8f3ec608d4888be6.jpg";

            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: imageUrl }, 
                caption: playerMsg,
                mentions: [sender]
            }, { quoted: m });

        } catch (error) {
            console.error("Player Search Error:", error.response?.data || error.message);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Failed to establish connection with Football-Data Servers. Check if API limit is reached." 
            }, { quoted: m });
        }
    }
};
