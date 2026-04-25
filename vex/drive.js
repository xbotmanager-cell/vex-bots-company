// VEX MINI BOT - VEX: drive
// Nova: Cloud Storage & Archive Architect
// Dev: Lupin Starnley

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Mpangilio wa Google Drive API
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const CREDENTIALS_PATH = path.join(__dirname, '../credentials.json');

module.exports = {
    vex: 'drive',
    cyro: 'tools',
    nova: 'Uploads media or documents directly to Google Drive and generates a secure link',

    async execute(m, sock) {
        // 1. DATA RECONNAISSANCE (Kuangalia kama kuna file limetumwa)
        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const msgType = Object.keys(quotedMsg || {})[0];
        
        // Tunakubali Image, Document, Video au Audio
        const isMedia = ['imageMessage', 'documentMessage', 'videoMessage', 'audioMessage'].includes(msgType);

        if (!quotedMsg || !isMedia) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Please reply to a photo, video, or document to upload it to Drive!" 
            }, { quoted: m });
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "☁️", key: m.key } });

        try {
            // 2. AUTHENTICATION & INITIALIZATION
            const auth = new google.auth.GoogleAuth({
                keyFile: CREDENTIALS_PATH,
                scopes: SCOPES,
            });
            const drive = google.drive({ version: 'v3', auth });

            // 3. DOWNLOADING FROM WHATSAPP
            const stream = await sock.downloadContentFromMessage(quotedMsg[msgType], msgType.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }

            const tempFileName = `VEX_Cloud_${Date.now()}`;
            const tempPath = path.join(__dirname, `../temp/${tempFileName}`);
            fs.writeFileSync(tempPath, buffer);

            // 4. UPLOADING TO GOOGLE DRIVE
            const fileMetadata = {
                'name': quotedMsg[msgType].fileName || `VEX_Upload_${Date.now()}`,
            };
            const media = {
                mimeType: quotedMsg[msgType].mimetype,
                body: fs.createReadStream(tempPath),
            };

            const file = await drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id, webViewLink',
            });

            // Weka file liwe "Public" ili kila mwenye link alione
            await drive.permissions.create({
                fileId: file.data.id,
                resource: { type: 'anyone', role: 'viewer' },
            });

            // 5. DESIGN YA RIPOTI (Premium Design)
            const sender = m.sender || m.key.participant || m.key.remoteJid;
            let driveMsg = `╭━━━〔 ☁️ *VEX: DRIVE-CLOUD* 〕━━━╮\n`;
            driveMsg += `┃ 🌟 *Status:* Upload Successful\n`;
            driveMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            driveMsg += `┃ 🧬 *Engine:* Google-Cloud V3\n`;
            driveMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            driveMsg += `*🛰️ CLOUD ANALYSIS*\n`;
            driveMsg += `| ◈ *File:* ${fileMetadata.name} |\n`;
            driveMsg += `| ◈ *ID:* ${file.data.id.substring(0, 10)}... |\n`;
            driveMsg += `| ◈ *Access:* Public Link 🔓 |\n\n`;

            driveMsg += `*🔗 SECURE LINK*\n`;
            driveMsg += `${file.data.webViewLink}\n\n`;

            driveMsg += `*📢 SYSTEM NOTE*\n`;
            driveMsg += `┃ 💠 File successfully architected into the cloud.\n`;
            driveMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            driveMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            driveMsg += `_VEX MINI BOT: Unlimited Storage_`;

            // 6. TUMA MAJIBU NA JISAFISHE
            await sock.sendMessage(m.key.remoteJid, { 
                text: driveMsg, 
                mentions: [sender] 
            }, { quoted: m });

            fs.unlinkSync(tempPath); // Futa file la temp kwenye server

        } catch (error) {
            console.error("Drive Upload Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Intelligence failed to connect to the Cloud. Check credentials." 
            }, { quoted: m });
        }
    }
};