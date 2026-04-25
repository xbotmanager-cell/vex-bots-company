// VEX MINI BOT - VEX: menu
// Nova: Dynamic command list with Vertical Shield design.
// Dev: Lupin Starnley

const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'menu',
    cyro: 'system',
    nova: 'Display all available VEX modules',

    async execute(m, sock, commands) {
        // 1. 🛰️ REACTION
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🛰️", key: m.key } });

        // 2. 🕒 CALCULATE STATS
        const ping = Date.now() - m.messageTimestamp * 1000;
        const sender = m.sender;

        // 3. 🏗️ BUILD DYNAMIC MENU
        let menuText = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
        menuText += `┃ 🌟 *Status:* Online\n`;
        menuText += `┃ 📡 *Latency:* ${ping}ms\n`;
        menuText += `┃ 👤 *Master:* Lupin Starnley\n`;
        menuText += `┃ 🧬 *Engine:* V1 Auto-Sync\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        menuText += `Hello @${sender.split('@')[0]}, VEX modules are listed below:\n\n`;

        // Panga commands kwa Category (Cyro)
        const categories = {};
        commands.forEach(cmd => {
            if (!categories[cmd.cyro]) categories[cmd.cyro] = [];
            categories[cmd.cyro].push(cmd.vex);
        });

        // Tengeneza List ya kila Category
        for (const cyro in categories) {
            menuText += `✨ *CYRO: ${cyro.toUpperCase()}* ✨\n`;
            categories[cyro].forEach(vexName => {
                // Hapa ndio mistari uliyotaka | | kwa kila command
                menuText += `| ◈ .${vexName} |\n`;
            });
            menuText += `\n`;
        }

        menuText += `*📊 SYSTEM STATS*\n`;
        menuText += `┃ 📂 *Total Vexes:* ${commands.length}\n`;
        menuText += `┃ 🛠️ *Categories:* ${Object.keys(categories).length}\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        menuText += `_VEX MINI BOT: Powered by VEX Engine_`;

        // 4. 🖼️ SEND WITH VEX.PNG
        try {
            const botImageUrl = path.join(__dirname, '../assets/images/vex.png');

            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: botImageUrl }, 
                caption: menuText,
                mentions: [sender]
            }, { quoted: m });

        } catch (e) {
            console.error("VEX Menu Error:", e);
            await sock.sendMessage(m.key.remoteJid, { 
                text: menuText, 
                mentions: [sender] 
            }, { quoted: m });
        }
    }
};