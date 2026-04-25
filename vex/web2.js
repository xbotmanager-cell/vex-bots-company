// VEX MINI BOT - VEX: web
// Nova: AI-Powered HTML/Website Architect
// Dev: Lupin Starnley

const path = require('path');
const fs = require('fs');
const { AI_Manager } = require('../lib/ai_logic');

module.exports = {
    vex: '2web',
    cyro: 'exploit',
    nova: 'Generates a custom HTML website using VEX AI and provides a temporary link',

    async execute(m, sock) {
        // 1. KUPATA MAELEZO (Kutoka kwenye reply/quoted au text ya mbele)
        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || "";
        const argsText = m.message?.conversation?.split(' ').slice(1).join(' ') || 
                         m.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ');
        
        const description = argsText || quotedText;

        if (!description) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Please describe the website or reply to a message with instructions!\nExample: `.web a landing page for my music`" 
            }, { quoted: m });
        }

        const sender = m.sender || m.key.participant || m.key.remoteJid;
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🌐", key: m.key } });

        // 2. VEX AI LOGIC
        const aiPrompt = `Build a professional, single-file HTML/CSS website. 
        Description: "${description}". 
        Use Tailwind CSS (CDN) for styling. Ensure it is mobile-friendly. 
        Return ONLY the raw HTML code.`;

        const generatedCode = await AI_Manager.generateResponse(sender, aiPrompt, "VEX Architect");

        if (!generatedCode) {
            return await sock.sendMessage(m.key.remoteJid, { text: "*❌ VEX-AI ERROR:* Failed to generate web architecture." }, { quoted: m });
        }

        // 3. FILE SYSTEM (Saving to public/web)
        const fileName = `vex_${Date.now()}.html`;
        const webFolderPath = path.join(__dirname, '../public/web');
        const filePath = path.join(webFolderPath, fileName);

        if (!fs.existsSync(webFolderPath)) {
            fs.mkdirSync(webFolderPath, { recursive: true });
        }

        fs.writeFileSync(filePath, generatedCode);

        // 4. PREPARING LINKS
        const liveLink = `https://lupper-md-k0ij.onrender.com/web/${fileName}`; 
        
        let successMsg = `💠 ═══ *VEX ARCHITECT* ═══ 💠\n\n`;
        successMsg += `✅ *Status:* Website Online\n`;
        successMsg += `🔗 *Live Link:* ${liveLink}\n`;
        successMsg += `⏳ *Expiry:* 2 Minutes\n\n`;
        successMsg += `_The source file is attached below._\n`;
        successMsg += `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`;

        await sock.sendMessage(m.key.remoteJid, { text: successMsg, mentions: [sender] }, { quoted: m });

        await sock.sendMessage(m.key.remoteJid, { 
            document: fs.readFileSync(filePath), 
            mimetype: 'text/html', 
            fileName: 'VEX_Project.html',
            caption: `*VEX ENGINE:* HTML Source Generated`
        }, { quoted: m });

        // 5. AUTO-DELETE & FINAL MESSAGE LOGIC
        setTimeout(async () => {
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }

                const waLink = "https://wa.me/255780470905?text=Hello+Master+Lupin,+I+need+a+permanent+free+website";
                
                const finalMsg = `*VEX SYSTEM NOTICE*\n\n`;
                finalMsg += `Hello @${sender.split('@')[0]}, the temporary web session has ended. Your link has been deactivated and files were purged to save server resources.\n\n`;
                finalMsg += `*Want a Permanent Web Presence?*\n`;
                finalMsg += `To get a 24/7 active website for free, message my Master here:\n`;
                finalMsg += `🔗 ${waLink}\n\n`;
                finalMsg += `_VEX MINI BOT: Session Terminated._`;

                await sock.sendMessage(m.key.remoteJid, { text: finalMsg, mentions: [sender] });

            } catch (err) {
                console.error("VEX Cleanup Error:", err);
            }
        }, 120000); // 2 Minutes
    }
};