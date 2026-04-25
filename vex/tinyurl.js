// VEX MINI BOT - VEX: tiny
// Nova: Advanced URL Shortener with Custom Alias support.
// Dev: Lupin Starnley

const axios = require('axios');
const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'tiny',           
    cyro: 'tools',         
    nova: 'Shortens long URLs with optional custom alias',

    async execute(m, sock) {
        // 1. 💠 UNIQUE REACTION
        await sock.sendMessage(m.key.remoteJid, { react: { text: "💠", key: m.key } });

        const args = m.text.trim().split(/ +/).slice(1);
        const url = args[0];
        const alias = args[1]; 

        if (!url) {
            const warningMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n` +
                               `┃ ⚠️ *Status:* Warning\n` +
                               `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                               `*❌ MISSING INPUT ❌*\n` +
                               `| ◈ *Usage:* .tiny [url] [alias] |\n` +
                               `| ◈ *Example:* .tiny https://google.com lupinvex |`;
            return await sock.sendMessage(m.key.remoteJid, { text: warningMsg }, { quoted: m });
        }

        try {
            // Constructing API URL
            let apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`;
            if (alias) {
                apiUrl += `&alias=${encodeURIComponent(alias)}`;
            }

            const response = await axios.get(apiUrl);
            const shortUrl = response.data;

            // 📝 PREPARE THE MESSAGE TEXT
            const sender = m.sender;
            let tinyText = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
            tinyText += `┃ 🌟 *Status:* Online\n`;
            tinyText += `┃ 👤 *Master:* Lupin Starnley\n`;
            tinyText += `┃ 🧬 *Engine:* URL Compressor\n`;
            tinyText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            
            tinyText += `Hello @${sender.split('@')[0]}, link processed successfully!\n\n`;
            tinyText += `✨ *CYRO: TOOLS* ✨\n`;
            tinyText += `| ◈ *Shortened:* ${shortUrl} |\n\n`;
            
            tinyText += `*📊 LINK INFO*\n`;
            tinyText += `┃ 💠 *Alias:* ${alias ? 'Custom Applied' : 'Random Generated'}\n`;
            tinyText += `┃ 🛰️ *Server:* TinyURL Global\n`;
            tinyText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            tinyText += `_VEX MINI BOT: Precision in Every Bit_`;

            const botImageUrl = path.join(__dirname, '../assets/images/vex.png');
            
            if (fs.existsSync(botImageUrl)) {
                await sock.sendMessage(m.key.remoteJid, { 
                    image: { url: botImageUrl }, 
                    caption: tinyText,
                    mentions: [sender]
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.key.remoteJid, { text: tinyText, mentions: [sender] }, { quoted: m });
            }

        } catch (e) {
            // ❌ ERROR HANDLING
            let errorMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
            errorMsg += `┃ ⚠️ *Status:* Alert\n`;
            errorMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            errorMsg += `*❌ VEX-ERROR ❌*\n`;
            errorMsg += `| ◈ *Reason:* Alias taken or Link Invalid! |\n`;
            errorMsg += `| ◈ *Solution:* Try again with a unique name. |`;

            await sock.sendMessage(m.key.remoteJid, { text: errorMsg }, { quoted: m });
        }
    }
};