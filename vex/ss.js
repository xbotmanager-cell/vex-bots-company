// VEX MINI BOT - VEX: screenshot / ss
// Nova: Web Recon & Visual Capture Engine
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'ss',
    cyro: 'tools',
    nova: 'Captures a high-quality visual of any website via URL',

    async execute(m, sock) {
        // 1. LINK EXTRACTION (Inasafisha link kutoka text au reply)
        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || "";
        const argsText = m.message?.conversation?.split(' ').slice(1).join(' ') || 
                         m.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ');
        
        const rawInput = argsText || quotedText;

        if (!rawInput) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Please provide a link or reply to a message containing a URL!" 
            }, { quoted: m });
        }

        // Regex ya kusafisha link (Inatafuta URL halisi hata kama kuna maneno mengine)
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let targetUrl = rawInput.match(urlRegex)?.[0] || rawInput.trim();

        // Kama mtumiaji hajaweka http/https, tunaiongeza ili API isikatae
        if (!targetUrl.startsWith('http')) {
            targetUrl = 'https://' + targetUrl;
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "📸", key: m.key } });

        try {
            // 2. APIFLASH RECON (The Capture Engine)
            const apiKey = "a811ffd2d8464b75a23bfc99233ab7ff";
            const apiUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${apiKey}&url=${encodeURIComponent(targetUrl)}&width=1280&height=800&fresh=true&quality=100`;

            // 3. CONSTRUCTING THE REPORT (Design ya Kishua)
            const sender = m.sender || m.key.participant || m.key.remoteJid;
            let ssMsg = `╭━━━〔 📸 *VEX: WEB-RECON* 〕━━━╮\n`;
            ssMsg += `┃ 🌟 *Status:* Capture Successful\n`;
            ssMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            ssMsg += `┃ 🧬 *Engine:* Visual-Brute V1\n`;
            ssMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            ssMsg += `*🌐 TARGET ANALYSIS*\n`;
            ssMsg += `| ◈ *URL:* ${targetUrl.substring(0, 30)}... |\n`;
            ssMsg += `| ◈ *Mode:* Full Desktop View |\n`;
            ssMsg += `| ◈ *Quality:* 100% Raw 💎 |\n\n`;

            ssMsg += `*📢 RECON NOTE*\n`;
            ssMsg += `┃ 💠 Web interface successfully materialized.\n`;
            ssMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            ssMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            ssMsg += `_VEX MINI BOT: Seeing is Believing_`;

            // 4. SEND CAPTURE
            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: apiUrl }, 
                caption: ssMsg,
                mentions: [sender]
            }, { quoted: m });

        } catch (error) {
            console.error("Screenshot Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Target link is unreachable or restricted by protocol." 
            }, { quoted: m });
        }
    }
};