// VEX MINI BOT - VEX: ping
// Nova: Checks system latency with VEX PING ENGINE image.
// Dev: Lupin Starnley

const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'ping',           // Command name: .ping
    cyro: 'system',         // Category
    nova: 'Checks system latency', // Description

    async execute(m, sock, commands) {
        // 1. 🔥 FLASH REACTION (Signature Rose Emoji)
        // Mseji ikipokelewa tu, bot inareact na ua la rose kwanza.
        const roseReact = {
            react: {
                text: "🌹",
                key: m.key
            }
        };
        await sock.sendMessage(m.key.remoteJid, roseReact);

        // 2. 📝 PREPARE THE MESSAGE TEXT
        // Tunatengeneza meseji kwa muundo wetu wa Quantum-Flow tuliyoukubali.
        const ping = Date.now() - m.messageTimestamp * 1000;
        let pingText = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
        pingText += `┃ 📶 *Signal Status:* Excellent\n`;
        pingText += `┃ 📡 *Latency:* ${ping}ms\n`;
        pingText += `┃ 👤 *Dev:* Lupin Starnley\n`;
        pingText += `┃ ⚡ *Mode:* Zero Lag\n`;
        pingText += `┃ 🧬 *Mode:* Supreme High-Speed\n`;
        pingText += `┃ \n`;
        pingText += `┃ *CYRO INFO:* SYSTEM\n`;
        pingText += `┃ *VEX-NOVA:* PING ENGINE Active.\n`;
        pingText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        pingText += `_Powered by VEX Engine_`;

        // 3. 🖼️ HANDLE AND SEND THE IMAGE (vex_ping.png)
        try {
            // Tunatafuta location ya picha ya vex_ping.png kwenye folder la assets/images
            const pingImageUrl = path.join(__dirname, '../assets/images/vex_ping.png');

            // Je, picha ipo?
            if (fs.existsSync(pingImageUrl)) {
                // Kama picha ipo, tunatuma picha pamoja na meseji (caption)
                await sock.sendMessage(m.key.remoteJid, { 
                    image: { url: pingImageUrl }, 
                    caption: pingText 
                }, { quoted: m });
            } else {
                // Kama picha haipo (kitu ambacho hakitotokea), tunatuma text tu
                console.error("VEX ERROR: assets/images/vex_ping.png not found!");
                await sock.sendMessage(m.key.remoteJid, { text: pingText }, { quoted: m });
            }

        } catch (e) {
            // Kama kuna hitilafu nyingine, tuma text tu
            console.error("VEX Msg Error:", e);
            await sock.sendMessage(m.key.remoteJid, { text: pingText }, { quoted: m });
        }
    }
};