// VEX MINI BOT - VEX: translate
// Nova: Multi-language neural translation engine.
// Dev: Lupin Starnley

const translate = require('google-translate-api-x');
const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'tr',           // Shortcut: .tr
    cyro: 'tools',         
    nova: 'Translates text to any language with auto-detection',

    async execute(m, sock) {
        // 1. 🌐 UNIQUE REACTION
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🌐", key: m.key } });

        // 2. LOGIC: GET TEXT AND TARGET LANGUAGE
        const args = m.text.trim().split(/ +/).slice(1);
        let lang = args[0]; // Targeted language (e.g., en, sw, fr)
        let text = args.slice(1).join(' ');

        // If user quoted a message, take text from the quoted message
        if (m.quoted) {
            text = m.quoted.text;
            lang = args[0] || 'en'; // Default to English if no lang provided
        }

        if (!text || !lang) {
            const warningMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n` +
                               `┃ ⚠️ *Status:* Warning\n` +
                               `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                               `*❌ INVALID INPUT ❌*\n` +
                               `| ◈ *Usage:* .tr [lang] [text] |\n` +
                               `| ◈ *Example:* .tr en habari yako |\n` +
                               `| ◈ *Or:* Reply to a message with .tr en |\n\n` +
                               `_VEX MINI BOT: Global Communication_`;
            return await sock.sendMessage(m.key.remoteJid, { text: warningMsg }, { quoted: m });
        }

        try {
            // 3. TRANSLATION ENGINE
            const res = await translate(text, { to: lang });

            // 📝 PREPARE THE MESSAGE TEXT (Quantum-Flow Design)
            const sender = m.sender;
            let trText = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
            trText += `┃ 🌟 *Status:* Processed\n`;
            trText += `┃ 👤 *Master:* Lupin Starnley\n`;
            trText += `┃ 🧬 *Engine:* VEX Translator\n`;
            trText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            
            trText += `Hello @${sender.split('@')[0]}, translation completed!\n\n`;
            trText += `✨ *CYRO: TOOLS* ✨\n`;
            trText += `| ◈ *From:* ${res.from.language.iso.toUpperCase()} |\n`;
            trText += `| ◈ *To:* ${lang.toUpperCase()} |\n`;
            trText += `| ◈ *Result:* ${res.text} |\n\n`;
            
            trText += `*📊 TRANSLATION INFO*\n`;
            trText += `┃ 🛰️ *Service:* Google Neural Engine\n`;
            trText += `┃ 💠 *Accuracy:* High-Definition\n`;
            trText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            trText += `_VEX MINI BOT: Breaking Borders_`;

            const botImageUrl = path.join(__dirname, '../assets/images/vex.png');
            
            if (fs.existsSync(botImageUrl)) {
                await sock.sendMessage(m.key.remoteJid, { 
                    image: { url: botImageUrl }, 
                    caption: trText,
                    mentions: [sender]
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.key.remoteJid, { text: trText, mentions: [sender] }, { quoted: m });
            }

        } catch (e) {
            console.error("VEX Translate Error:", e);
            const errorMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n` +
                             `┃ ⚠️ *Status:* Error\n` +
                             `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                             `*❌ VEX-ERROR ❌*\n` +
                             `| ◈ *Reason:* Language code not supported! |\n` +
                             `| ◈ *Solution:* Use codes like 'en', 'sw', 'fr', 'ar'. |`;
            await sock.sendMessage(m.key.remoteJid, { text: errorMsg }, { quoted: m });
        }
    }
};