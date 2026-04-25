// VEX MINI BOT - VEX: web
// Nova: Ethical hacking gateway and deep web resources.
// Dev: Lupin Starnley

const axios = require('axios');
const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'web',
    cyro: 'exploit',
    nova: 'Provides secure gateways to deep web tools and master resources',

    async execute(m, sock) {
        // 1. ⚡ REACT WITH HACKER SYMBOL
        await sock.sendMessage(m.key.remoteJid, { react: { text: "⚡", key: m.key } });

        const sender = m.sender;
        const githubUrl = "https://lupinstarnley.github.io/Lupin-V1H/";
        
        try {
            // 2. SHORTENING THE MASTER LINK VIA TINYURL
            const response = await axios.get(`https://tinyurl.com/api-create.php?url=${githubUrl}`);
            const shortUrl = response.data;

            // 3. CONSTRUCTING THE EXPLOIT MESSAGE
            let webMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
            webMsg += `┃ 🌟 *Status:* Access Granted\n`;
            webMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            webMsg += `┃ 🧬 *Engine:* Exploit Gateway\n`;
            webMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            webMsg += `*🌐 DARK WEB GATEWAYS*\n`;
            webMsg += `| ◈ *Tor Browser:* https://www.torproject.org/ |\n`;
            webMsg += `| ◈ *Search Engine:* https://duckduckgo.com/ |\n\n`;

            webMsg += `*🔥 MASTER RESOURCE (LupinUniverse)*\n`;
            webMsg += `| ◈ *Short Link:* ${shortUrl} |\n`;
            webMsg += `| ◈ *Original:* GitHub Pages |\n\n`;

            webMsg += `*⚠️ DISCLAIMER*\n`;
            webMsg += `┃ 💠 *Usage:* Educational Purpose Only\n`;
            webMsg += `┃ 🛰️ *Security:* Use VPN/Tor for anonymity\n`;
            webMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            webMsg += `_VEX MINI BOT: Knowledge is Freedom_`;

            // 4. SEND WITH VEX IMAGE
            const botImageUrl = path.join(__dirname, '../assets/images/vex.png');
            if (fs.existsSync(botImageUrl)) {
                await sock.sendMessage(m.key.remoteJid, { image: { url: botImageUrl }, caption: webMsg, mentions: [sender] }, { quoted: m });
            } else {
                await sock.sendMessage(m.key.remoteJid, { text: webMsg, mentions: [sender] }, { quoted: m });
            }

        } catch (e) {
            console.error("VEX Web Error:", e);
            await sock.sendMessage(m.key.remoteJid, { text: "*❌ VEX-ERROR:* Failed to shorten the master link. Check internet." }, { quoted: m });
        }
    }
};