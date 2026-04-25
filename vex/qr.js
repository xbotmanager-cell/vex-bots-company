/**
 * VEX MINI BOT - VEX: qr
 * Nova: Standard QR Code generator (Render Optimized)
 * Dev: Lupin Starnley
 */

const QRCode = require('qrcode');

module.exports = {
    vex: 'qr',
    cyro: 'tools',
    nova: 'Encodes text or links into a QR Code.',

    async execute(m, sock) {
        let textToEncode = m.text?.trim().split(/ +/).slice(1).join(' ');

        // 1. SMART CHECK: Angalia kama kuna quoted message
        if (!textToEncode && m.quoted && m.quoted.text) {
            textToEncode = m.quoted.text;
        }

        // 2. ERROR CHECK
        if (!textToEncode) {
            return sock.sendMessage(m.key.remoteJid, { 
                text: "❌ *ERROR:* Please provide text, a link, or quote a message.\nExample: `.qr https://lupinuniverse.com`" 
            }, { quoted: m });
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "⚛️", key: m.key } });

        try {
            // 3. GENERATE QR CODE AS BUFFER (No Canvas Needed)
            const qrBuffer = await QRCode.toBuffer(textToEncode, {
                errorCorrectionLevel: 'H',
                margin: 2,
                scale: 10,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            // 4. CONSTRUCTING THE REPORT
            let qrMsg = `╭━━━〔 ⚛️ *VEX: QR-ENCODER* 〕━━━╮\n`;
            qrMsg += `┃ 🌟 *Status:* Encoded Successful\n`;
            qrMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            qrMsg += `┃ 🧬 *Engine:* Vex-QR Lite\n`;
            qrMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            qrMsg += `*📊 ENCODED DATA*\n`;
            qrMsg += `| ◈ *Content:* ${textToEncode.substring(0, 100)}${textToEncode.length > 100 ? "..." : ""} |\n\n`;

            qrMsg += `*🛡️ SCAN COMPATIBILITY*\n`;
            qrMsg += `┃ 💠 Use any camera or QR scanner.\n`;
            qrMsg += `┃ 🛰️ *Powered by:* Vex Engine\n`;
            qrMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            qrMsg += `_VEX MINI BOT: Vision Beyond Limits_`;

            // 5. SEND THE QR CODE
            await sock.sendMessage(m.key.remoteJid, { 
                image: qrBuffer, 
                caption: qrMsg 
            }, { quoted: m });

        } catch (e) {
            console.error("VEX QR ERROR:", e);
            sock.sendMessage(m.key.remoteJid, { text: "❌ *SYSTEM ERROR:* Failed to generate QR Code." }, { quoted: m });
        }
    }
};
