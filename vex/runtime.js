// VEX MINI BOT - VEX: runtime
// Nova: Shows the active session duration.
// Dev: Lupin Starnley

const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'runtime',           // Command
    cyro: 'system',          // Category
    nova: 'Show how long VEX ENGINE has been active', // Description

    async execute(m, sock) {
        // 1. ⚡ UNIQUE REACTION
        // Kwa runtime tunatumia alama ya muda.
        await sock.sendMessage(m.key.remoteJid, { 
            react: { text: "⏳", key: m.key } 
        });

        // 2. 🕒 CALCULATE TIME (Uptime Logic)
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        // 3. 📝 DESIGN THE MESSAGE
        // Itaanza kwa kum-mention aliyeweka command.
        const sender = m.sender;
        let runtimeText = `Hello @${sender.split('@')[0]}, VEX ENGINE status is stable.\n\n`;
        runtimeText += `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
        runtimeText += `┃ ⏳ *Uptime:* ${hours}h ${minutes}m ${seconds}s\n`;
        runtimeText += `┃ 🚀 *Status:* Optimized\n`;
        runtimeText += `┃ 📡 *Engine:* V1 High-Speed\n`;
        runtimeText += `┃ 👤 *Master:* Lupin Starnley\n`;
        runtimeText += `┃ \n`;
        runtimeText += `┃ *CYRO INFO:* SYSTEM\n`;
        runtimeText += `┃ *VEX-NOVA:* Active duration retrieved.\n`;
        runtimeText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        runtimeText += `_VEX MINI BOT: Always Online_`;

        // 4. 🖼️ SEND WITH VEX.PNG
        try {
            const botImageUrl = path.join(__dirname, '../assets/images/vex.png');

            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: botImageUrl }, 
                caption: runtimeText,
                mentions: [sender] // Hapa ndipo mention inafanyika
            }, { quoted: m });

        } catch (e) {
            console.error("Runtime Error:", e);
            await sock.sendMessage(m.key.remoteJid, { 
                text: runtimeText, 
                mentions: [sender] 
            }, { quoted: m });
        }
    }
};