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
        const args = m.message?.conversation?.split(' ').slice(1) || 
                     m.message?.extendedTextMessage?.text?.split(' ').slice(1);
        
        const playerName = args.join(' ');

        if (!playerName) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Please provide a player name.\nExample: `.player Erling Haaland`" 
            }, { quoted: m });
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "⚽", key: m.key } });

        try {
            // 2. SCOUTING ENGINE (Fetching Data from Global Sports API)
            // Tunatumia API inayokusanya data kutoka vyanzo vingi vya soka
            const response = await axios.get(`https://api.vreden.my.id/api/search-player?query=${encodeURIComponent(playerName)}`);
            const data = response.data.result[0]; // Inachukua mchezaji wa kwanza aliyepatikana

            if (!data) {
                return await sock.sendMessage(m.key.remoteJid, { text: "*❌ VEX-ERROR:* Player not found in the global database." });
            }

            // 3. CONSTRUCTING THE SCOUTING REPORT (Full English - Worldwide Standard)
            const sender = m.sender || m.key.participant || m.key.remoteJid;
            let playerMsg = `╭━━━〔 ⚽ *VEX: GLOBAL-SCOUT* 〕━━━╮\n`;
            playerMsg += `┃ 🌟 *Status:* Scouting Complete\n`;
            playerMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            playerMsg += `┃ 🧬 *Engine:* Football-Core V4\n`;
            playerMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            playerMsg += `*👤 PLAYER PROFILE*\n`;
            playerMsg += `| ◈ *Full Name:* ${data.name || 'N/A'}\n`;
            playerMsg += `| ◈ *Club:* ${data.team || 'Free Agent'}\n`;
            playerMsg += `| ◈ *Position:* ${data.position || 'N/A'}\n`;
            playerMsg += `| ◈ *Age:* ${data.age || 'N/A'} Years\n`;
            playerMsg += `| ◈ *Nationality:* ${data.nationality || 'N/A'}\n\n`;

            playerMsg += `*📊 PERFORMANCE & SPECS*\n`;
            playerMsg += `| ◈ *Height:* ${data.height || 'N/A'}\n`;
            playerMsg += `| ◈ *Preferred Foot:* ${data.foot || 'N/A'}\n`;
            playerMsg += `| ◈ *Market Value:* ${data.marketValue || 'Private'} 💎\n`;
            playerMsg += `| ◈ *League:* ${data.league || 'N/A'}\n\n`;

            playerMsg += `*📢 SYSTEM NOTE*\n`;
            playerMsg += `┃ 💠 Tactical data synchronized worldwide.\n`;
            playerMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            playerMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            playerMsg += `_VEX MINI BOT: Soccer Intelligence_`;

            // 4. VISUAL DELIVERY (Macho ya VEX)
            // Kama picha ya mchezaji haipo, tumia picha ya timu (Fallback)
            const imageUrl = data.image || data.teamLogo || "https://telegra.ph/file/af55d8f3ec608d4888be6.jpg";

            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: imageUrl }, 
                caption: playerMsg,
                mentions: [sender]
            }, { quoted: m });

        } catch (error) {
            console.error("Player Search Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Failed to establish connection with Football Servers." 
            }, { quoted: m });
        }
    }
};