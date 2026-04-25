// VEX MINI BOT - VEX: pdf
// Nova: Document Architect
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'pdf',
    cyro: 'tools',
    nova: 'Converts web content or text to a professional PDF document',

    async execute(m, sock) {
        // 1. KUPATA MAELEZO (Kutoka mbele ya command au kwenye reply)
        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || "";
        const argsText = m.message?.conversation?.split(' ').slice(1).join(' ') || 
                         m.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ');
        
        // Inachukua kilichopo mbele ya command, isipokuwepo inaangalia kwenye reply
        const source = argsText || quotedText;

        if (!source) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Please provide a link/text or reply to a message to convert to PDF!" 
            }, { quoted: m });
        }

        const sender = m.sender || m.key.participant || m.key.remoteJid;
        await sock.sendMessage(m.key.remoteJid, { react: { text: "📄", key: m.key } });

        // 2. PDFSHIFT LOGIC (Conversion Engine)
        try {
            const apiKey = "36bc10a3d2575b551f97366d1257a491";
            const response = await axios.post('https://api.pdfshift.io/v1/convert', {
                source: source,
                // Tunaongeza muonekano mzuri kidogo
                margin: '10mm',
                format: 'A4'
            }, {
                auth: { username: apiKey, password: '' },
                responseType: 'arraybuffer'
            });

            // 3. DESIGN YA CAPTION (Ule muundo wa mabox)
            let pdfMsg = `╭━━━〔 📄 *VEX: PDF-GEN* 〕━━━╮\n`;
            pdfMsg += `┃ 🌟 *Status:* Document Ready\n`;
            pdfMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            pdfMsg += `┃ 🧬 *Engine:* PDFShift-V1H\n`;
            pdfMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            pdfMsg += `*📊 DOCUMENT INFO*\n`;
            pdfMsg += `| ◈ *Source:* ${source.substring(0, 20)}${source.length > 20 ? '...' : ''} |\n`;
            pdfMsg += `| ◈ *Format:* A4 Standard |\n`;
            pdfMsg += `| ◈ *Security:* Encrypted 🛡️ |\n\n`;

            pdfMsg += `*📢 SYSTEM NOTE*\n`;
            pdfMsg += `┃ 💠 Your document has been architected.\n`;
            pdfMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            pdfMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            pdfMsg += `_VEX MINI BOT: Converting Reality to Paper_`;

            // 4. KUTUMA DOCUMENT
            await sock.sendMessage(m.key.remoteJid, { 
                document: Buffer.from(response.data), 
                mimetype: 'application/pdf', 
                fileName: 'VEX_Document.pdf',
                caption: pdfMsg,
                mentions: [sender]
            }, { quoted: m });

        } catch (error) {
            console.error("PDF Generation Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Failed to architect the PDF. Ensure the link/text is valid." 
            }, { quoted: m });
        }
    }
};