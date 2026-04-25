// VEX MINI BOT - VEX: app
// Nova: Play Store Intelligence & App Scout
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'app',
    cyro: 'tools',
    nova: 'Searches and retrieves detailed application metadata from Play Store',

    async execute(m, sock) {
        // 1. KUPATA JINA LA APP (Reply au Text)
        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || "";
        const argsText = m.message?.conversation?.split(' ').slice(1).join(' ') || 
                         m.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ');
        
        const query = argsText || quotedText;

        if (!query) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Please provide an app name or reply to one!" 
            }, { quoted: m });
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "📲", key: m.key } });

        try {
            // 2. FETCHING DATA (Tunatumia Play Store Scraper API)
            const response = await axios.get(`https://api.shizokeji.com/api/playstore?q=${encodeURIComponent(query)}`);
            const app = response.data.result;

            if (!app) throw new Error("App not found");

            // 3. CONSTRUCTING THE REPORT (Kishua Design)
            const sender = m.sender || m.key.participant || m.key.remoteJid;
            let appMsg = `╭━━━〔 📲 *VEX: APP-SCOUT* 〕━━━╮\n`;
            appMsg += `┃ 🌟 *Status:* App Found\n`;
            appMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            appMsg += `┃ 🧬 *Engine:* Play-Store V2\n`;
            appMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            appMsg += `*🛠️ APP METADATA*\n`;
            appMsg += `| ◈ *Name:* ${app.title}\n`;
            appMsg += `| ◈ *Developer:* ${app.developer}\n`;
            appMsg += `| ◈ *Size:* ${app.size || 'Varies'}\n`;
            appMsg += `| ◈ *Downloads:* ${app.installs || 'N/A'}\n\n`;

            appMsg += `*⭐ RATINGS & INFO*\n`;
            appMsg += `| ◈ *Score:* ${app.scoreText || 'N/A'} Stars\n`;
            appMsg += `| ◈ *Price:* ${app.free ? 'FREE 🔓' : app.price}\n`;
            appMsg += `| ◈ *URL:* ${app.url.substring(0, 25)}...\n\n`;

            appMsg += `*📢 SYSTEM NOTE*\n`;
            appMsg += `┃ 💠 Application specs decoded successfully.\n`;
            appMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            appMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            appMsg += `_VEX MINI BOT: Tech Navigator_`;

            // 4. KUTUMA PICHA (ICON) NA DATA
            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: app.icon }, 
                caption: appMsg,
                mentions: [sender]
            }, { quoted: m });

        } catch (error) {
            console.error("App Search Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Failed to retrieve app data. Ensure the name is correct." 
            }, { quoted: m });
        }
    }
};