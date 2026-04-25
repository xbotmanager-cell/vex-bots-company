// VEX MINI BOT - VEX: zip
// Nova: File Compression & Archiving Engine
// Dev: Lupin Starnley

const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

module.exports = {
    vex: 'zip',
    cyro: 'tools',
    nova: 'Compresses text, links, or media into a secure ZIP archive',

    async execute(m, sock) {
        // 1. DATA RECONNAISSANCE (Kupata maudhui)
        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || "";
        const argsText = m.message?.conversation?.split(' ').slice(1).join(' ') || 
                         m.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ');
        
        const contentToZip = argsText || quotedText;
        const hasImage = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

        if (!contentToZip && !hasImage) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Please provide text/link or reply to a file/image to compress!" 
            }, { quoted: m });
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "📦", key: m.key } });

        const zip = new AdmZip();
        const fileName = `VEX_Archive_${Date.now()}.zip`;
        const tempPath = path.join(__dirname, `../temp/${fileName}`);

        try {
            // Hakikisha folder la temp lipo
            if (!fs.existsSync(path.join(__dirname, '../temp'))) {
                fs.mkdirSync(path.join(__dirname, '../temp'));
            }

            // 2. LOGIC YA KUTENGENEZA ZIP
            if (hasImage) {
                // Kama amereply picha
                const stream = await sock.downloadContentFromMessage(hasImage, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
                zip.addFile("captured_media.jpg", buffer);
            } 
            
            if (contentToZip) {
                // Kama kuna maandishi au link
                zip.addFile("vex_intel.txt", Buffer.from(contentToZip, "utf8"));
            }

            // Hifadhi ZIP
            zip.writeZip(tempPath);

            // 3. DESIGN YA RIPOTI (Kishua)
            const sender = m.sender || m.key.participant || m.key.remoteJid;
            let zipMsg = `╭━━━〔 📦 *VEX: ZIP-ARCHIVE* 〕━━━╮\n`;
            zipMsg += `┃ 🌟 *Status:* Compression Complete\n`;
            zipMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            zipMsg += `┃ 🧬 *Engine:* Adm-Zip V1H\n`;
            zipMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            zipMsg += `*📊 ARCHIVE SPECS*\n`;
            zipMsg += `| ◈ *Package:* ${fileName} |\n`;
            zipMsg += `| ◈ *Objects:* ${hasImage && contentToZip ? '2' : '1'} Items |\n`;
            zipMsg += `| ◈ *Security:* Encapsulated 🛡️ |\n\n`;

            zipMsg += `*📢 SYSTEM NOTE*\n`;
            zipMsg += `┃ 💠 File has been virtualized into a ZIP container.\n`;
            zipMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            zipMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            zipMsg += `_VEX MINI BOT: Efficiency Optimized_`;

            // 4. KUTUMA ZIP NA KUJISAFISHA
            await sock.sendMessage(m.key.remoteJid, { 
                document: fs.readFileSync(tempPath), 
                mimetype: 'application/zip', 
                fileName: fileName,
                caption: zipMsg
            }, { quoted: m });

            // Jisafishe baada ya sekunde 5
            setTimeout(() => {
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            }, 5000);

        } catch (error) {
            console.error("Zip Error:", error);
            await sock.sendMessage(m.key.remoteJid, { text: "*❌ VEX-ERROR:* Internal core failed to pack the archive." });
        }
    }
};