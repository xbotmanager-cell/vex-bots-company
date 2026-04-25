// VEX MINI BOT - VEX: logo
// Nova: Visual Branding Engine
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'logo',
    cyro: 'tools',
    nova: 'Generates a visual logo or web capture from text or a replied message',

    async execute(m, sock) {
        // 1. KUPATA MAELEZO (Kutoka mbele ya command au kwenye reply)
        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || "";
        const argsText = m.message?.conversation?.split(' ').slice(1).join(' ') || 
                         m.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ');
        
        // Kama amereply, quotedText itatumika. Kama ameandika mbele, argsText itatumika.
        const description = argsText || quotedText;

        if (!description) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Please provide a description or reply to a message to generate a logo!" 
            }, { quoted: m });
        }

        const sender = m.sender || m.key.participant || m.key.remoteJid;
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🎨", key: m.key } });

        // 2. APILASH LOGIC (Tuna-convert text/url kwenda image)
        const apiKey = "a811ffd2d8464b75a23bfc99233ab7ff";
        // Kama maelezo ni URL, inapiga screenshot. Kama ni text, inaitengeneza picha.
        const apiUrl = `https://api.apiflash.com/v1/urltoimage?access_key=${apiKey}&url=${encodeURIComponent(description)}&width=1080&height=1080&format=png`;

        // 3. DESIGN YA CAPTION (Ule muundo wa mabox)
        let logoMsg = `╭━━━〔 🎨 *VEX: LOGO-GEN* 〕━━━╮\n`;
        logoMsg += `┃ 🌟 *Status:* Rendered Successfully\n`;
        logoMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
        logoMsg += `┃ 🧬 *Engine:* ApiFlash-V1H\n`;
        logoMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        logoMsg += `*🖼️ VISUAL IDENTITY*\n`;
        logoMsg += `| ◈ *Concept:* ${description.substring(0, 20)}${description.length > 20 ? '...' : ''} |\n`;
        logoMsg += `| ◈ *Resolution:* 1080x1080 |\n`;
        logoMsg += `| ◈ *Quality:* Ultra High 💎 |\n\n`;

        logoMsg += `*📢 DESIGNER NOTE*\n`;
        logoMsg += `┃ 💠 Your visual concept has been materialized.\n`;
        logoMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
        logoMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        logoMsg += `_VEX MINI BOT: Visualizing Your Mind_`;

        // 4. KUTUMA PICHA NA CAPTION
        try {
            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: apiUrl }, 
                caption: logoMsg,
                mentions: [sender]
            }, { quoted: m });
        } catch (error) {
            console.error("Logo Generation Error:", error);
            await sock.sendMessage(m.key.remoteJid, { text: "*❌ VEX-ERROR:* Architecture failed to render the image." });
        }
    }
};