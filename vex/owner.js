// VEX MINI BOT - VEX: owner
// Nova: Information about the bot developer.
// Dev: Lupin Starnley

const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'owner',           // Command
    cyro: 'system',         // Category
    nova: 'Show contact information of the VEX ENGINE developer', // Description

    async execute(m, sock) {
        // 1. ⚡ UNIQUE REACTION
        await sock.sendMessage(m.key.remoteJid, { 
            react: { text: "👑", key: m.key } 
        });

        // 2. 📇 VCARD DATA
        const ownerNumber = '255780470905';
        const vcard = 'BEGIN:VCARD\n'
            + 'VERSION:3.0\n' 
            + 'FN:VEX OWNER\n' 
            + 'ORG:Lupin Starnley;\n'
            + `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}\n`
            + 'END:VCARD';

        // 3. 📝 DESIGN THE MESSAGE
        const sender = m.sender || m.key.participant || m.key.remoteJid;
        let ownerText = `Hello @${sender.split('@')[0]}, VEX ENGINE status is stable.\n\n`;
        ownerText += `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
        ownerText += `┃ 👑 *Identity:* VEX OWNER\n`;
        ownerText += `┃ 🚀 *Status:* Optimized\n`;
        ownerText += `┃ 📡 *Engine:* V1 High-Speed\n`;
        ownerText += `┃ 👤 *Master:* Lupin Starnley\n`;
        ownerText += `┃ \n`;
        ownerText += `┃ *CYRO INFO:* SYSTEM\n`;
        ownerText += `┃ *VEX-NOVA:* Contact details retrieved.\n`;
        ownerText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        ownerText += `_VEX MINI BOT: Always Online_`;

        // 4. 🖼️ SEND WITH OWNER.PNG & VCARD
        try {
            // Path imerekebishwa kwenda assets/images/owner.png
            const ownerImageUrl = path.join(__dirname, '../assets/images/owner.png');

            if (fs.existsSync(ownerImageUrl)) {
                await sock.sendMessage(m.key.remoteJid, { 
                    image: { url: ownerImageUrl }, 
                    caption: ownerText,
                    mentions: [sender] 
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.key.remoteJid, { 
                    text: ownerText, 
                    mentions: [sender] 
                }, { quoted: m });
            }

            // Kutuma VCard
            await sock.sendMessage(m.key.remoteJid, {
                contacts: {
                    displayName: 'VEX OWNER',
                    contacts: [{ vcard }]
                }
            }, { quoted: m });

        } catch (e) {
            console.error("Owner Command Error:", e);
            await sock.sendMessage(m.key.remoteJid, { 
                text: ownerText, 
                mentions: [sender] 
            }, { quoted: m });
        }
    }
};