// VEX MINI BOT - VEX: top
// Nova: Web-based ranking engine for "Top" list queries.
// Dev: Lupin Starnley

const googleIt = require('google-it');
const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'top',           
    cyro: 'tools',         
    nova: 'Searches and ranks top results from the web with sources',

    async execute(m, sock) {
        // 1. 🏆 UNIQUE REACTION
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🏆", key: m.key } });

        const args = m.text.trim().split(/ +/).slice(1);
        const query = args.join(' ');

        if (!query) {
            const warningMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n` +
                               `┃ ⚠️ *Status:* Warning\n` +
                               `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                               `*❌ MISSING QUERY ❌*\n` +
                               `| ◈ *Usage:* .top [your search] |\n` +
                               `| ◈ *Example:* .top 10 richest people |\n\n` +
                               `_VEX MINI BOT: Data Intelligence_`;
            return await sock.sendMessage(m.key.remoteJid, { text: warningMsg }, { quoted: m });
        }

        try {
            // 2. WEB SCRAPING LOGIC
            // Searching the web for the top results
            const results = await googleIt({ query: `top ${query}`, limit: 5 });
            
            const sender = m.sender;
            let topText = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
            topText += `┃ 🌟 *Status:* Data Retrieved\n`;
            topText += `┃ 👤 *Master:* Lupin Starnley\n`;
            topText += `┃ 🧬 *Engine:* VEX TOP Search\n`;
            topText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            topText += `Hello @${sender.split('@')[0]}, here are the top results for your search:\n\n`;
            topText += `✨ *CYRO: TOOLS* ✨\n`;

            results.forEach((res, index) => {
                // Formatting each result in the vertical shield | ◈ |
                topText += `| ◈ ${index + 1}. ${res.title} |\n`;
            });

            topText += `\n*🔗 EVIDENCE LINKS*\n`;
            results.slice(0, 3).forEach((res) => {
                topText += `┃ 🌐 ${res.link}\n`;
            });

            topText += `\n*📊 SEARCH INFO*\n`;
            topText += `┃ 💠 *Source:* Global Web Index\n`;
            topText += `┃ 🛰️ *Accuracy:* Real-time Sync\n`;
            topText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            topText += `_VEX MINI BOT: Precision Data_`;

            const botImageUrl = path.join(__dirname, '../assets/images/vex.png');
            
            if (fs.existsSync(botImageUrl)) {
                await sock.sendMessage(m.key.remoteJid, { 
                    image: { url: botImageUrl }, 
                    caption: topText,
                    mentions: [sender]
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.key.remoteJid, { text: topText, mentions: [sender] }, { quoted: m });
            }

        } catch (e) {
            console.error("VEX TOP Search Error:", e);
            const errorMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n` +
                             `┃ ⚠️ *Status:* Error\n` +
                             `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                             `*❌ DATA FETCH FAILED ❌*\n` +
                             `| ◈ *Reason:* Network Timeout |\n` +
                             `| ◈ *Solution:* Please try again in a few seconds. |`;
            await sock.sendMessage(m.key.remoteJid, { text: errorMsg }, { quoted: m });
        }
    }
};