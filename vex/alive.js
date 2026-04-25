/**
 * VEX MINI BOT - VEX: alive (FORCE MODE)
 * Nova: Checks system status with Quantum Flow design.
 * Dev: Lupin Starnley
 */

const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'alive',
    cyro: 'system',
    nova: 'Checks if VEX MINI BOT is active',

    async execute(m, sock, commands) {
        // 1. 🔥 IMMEDIATE REACTION
        try {
            await sock.sendMessage(m.chat, { 
                react: { text: "🌹", key: m.key } 
            });
        } catch (e) { console.log("React Error ignored"); }

        // 2. 📊 SYSTEM METADATA
        const timestamp = m.messageTimestamp * 1000;
        const ping = Date.now() - timestamp;
        
        let aliveText = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
        aliveText += `┃ 🌟 *Status:* Online\n`;
        aliveText += `┃ 📡 *Latency:* ${ping < 0 ? '0' : ping}ms\n`;
        aliveText += `┃ 👤 *Master:* Lupin Starnley\n`;
        aliveText += `┃ 🧬 *Mode:* Supreme High-Speed\n`;
        aliveText += `┃ 📁 *Arsenal:* ${commands ? commands.size : '83'} Cmds\n`;
        aliveText += `┃ \n`;
        aliveText += `┃ *CYRO INFO:* SYSTEM\n`;
        aliveText += `┃ *VEX-NOVA:* Active & Ready for action.\n`;
        aliveText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        aliveText += `_Powered by VEX Engine_`;

        // 3. 🖼️ FORCE IMAGE DELIVERY (vex.png)
        // Tunajaribu njia mbili za kupata picha ili isifeli hata kama folder limehamishwa
        const path1 = path.join(__dirname, '../assets/images/vex.png');
        const path2 = path.join(process.cwd(), 'assets/images/vex.png');
        
        const botImageUrl = fs.existsSync(path1) ? path1 : (fs.existsSync(path2) ? path2 : null);

        try {
            if (botImageUrl) {
                // Tuma picha kwa nguvu
                await sock.sendMessage(m.chat, { 
                    image: { url: botImageUrl }, 
                    caption: aliveText 
                }, { quoted: m });
            } else {
                // Ikishindikana kabisa kupata picha, tuma text kishujaa
                console.log("⚠️ vex.png not found, sending text only.");
                await sock.sendMessage(m.chat, { text: aliveText }, { quoted: m });
            }
        } catch (err) {
            console.error("🛑 ALIVE EXECUTION ERROR:", err);
            // Last resort: Simple text message
            await sock.sendMessage(m.chat, { text: aliveText }, { quoted: m });
        }
    }
};
