// VEX MINI BOT - VEX: readqr
// Nova: Advanced QR Code decoder and data extractor.
// Dev: Lupin Starnley

const jsqr = require('jsqr');
const Jimp = require('jimp');

module.exports = {
    vex: 'readqr',
    cyro: 'tools',
    nova: 'Decodes and extracts data from any QR code image provided.',

    async execute(m, sock) {
        // 1. SMART CHECK: Angalia kama kuna picha (Quoted au Direct)
        const quoted = m.quoted ? m.quoted : m;
        const mime = (quoted.msg || quoted).mimetype || '';

        if (!/image/.test(mime)) {
            return m.reply("❌ *ERROR:* Please quote or send a QR Code image with `.readqr` ");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔍", key: m.key } });

        try {
            // 2. DOWNLOAD & PROCESS IMAGE
            const buffer = await quoted.download();
            const image = await Jimp.read(buffer);
            const { data, width, height } = image.bitmap;

            // 3. DECODE QR DATA
            const code = jsqr(data, width, height);

            if (!code) {
                return m.reply("❌ *SCAN FAIL:* No valid QR Code found in this image. Make sure it's clear.");
            }

            // 4. CONSTRUCTING THE DECRYPTED REPORT
            let readMsg = `╭━━━〔 🔍 *VEX: QR-DECODER* 〕━━━╮\n`;
            readMsg += `┃ 🌟 *Status:* Decryption Success\n`;
            readMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            readMsg += `┃ 🧬 *Engine:* Matrix-Vision V1\n`;
            readMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            readMsg += `*📂 EXTRACTED DATA*\n`;
            readMsg += `| ◈ *Content:* \n\n${code.data}\n\n`;

            readMsg += `*📊 ANALYSIS*\n`;
            readMsg += `┃ 💠 *Type:* Text / URL\n`;
            readMsg += `┃ 🛰️ *Security:* Scanned Safely\n`;
            readMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            readMsg += `_VEX MINI BOT: Knowledge is Power_`;

            await sock.sendMessage(m.key.remoteJid, { text: readMsg }, { quoted: m });

        } catch (e) {
            console.error("ReadQR Error:", e);
            m.reply("❌ *SYSTEM ERROR:* Failed to decode the image. The matrix is unstable.");
        }
    }
};