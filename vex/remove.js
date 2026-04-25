// VEX MINI BOT - VEX: remove
// Nova: Administrative Purge & Database Sanitization
// Dev: Lupin Starnley (The Master Admin)

const fs = require('fs');
const path = require('path');

module.exports = {
    vex: 'remove',
    cyro: 'supreme',
    nova: 'Executes administrative termination of marketplace listings via ID or Batch Purge',

    async execute(m, sock) {
        const filePath = path.join(__dirname, '../data/products.json');
        const masterAdmin = "255780470905@s.whatsapp.net"; // Namba yako pekee
        const sender = m.sender;

        // 1. SECURITY CHECK (Strict Authorization)
        if (sender !== masterAdmin) {
            await sock.sendMessage(m.key.remoteJid, { react: { text: "🚫", key: m.key } });
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ SECURITY BREACH DETECTED ⚠️*\n\n*ID:* Unauthorized User\n*Action:* Restricted Access\n\n_System has logged this attempt. Only the Supreme Admin (Lupin) can execute termination protocols._" 
            }, { quoted: m });
        }

        const args = m.message?.conversation?.split(' ').slice(1).join(' ') || 
                     m.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ');

        if (!args) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*🛡️ SUPREME-ADMIN:* Specify Product IDs to purge.\nExample: `.remove VEX-101, VEX-202` or `.remove all`" 
            }, { quoted: m });
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "💀", key: m.key } });

        try {
            let db = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            let initialCount = db.items.length;
            let removedCount = 0;

            // 2. TERMINATION LOGIC
            if (args.toLowerCase() === 'all') {
                db.items = [];
                removedCount = initialCount;
            } else {
                const targets = args.split(',').map(id => id.trim().toUpperCase());
                db.items = db.items.filter(item => {
                    if (targets.includes(item.id)) {
                        removedCount++;
                        return false; // Remove this item
                    }
                    return true;
                });
            }

            // 3. DATABASE RE-SYNC
            db.total_products = db.items.length;
            fs.writeFileSync(filePath, JSON.stringify(db, null, 2));

            // 4. TERMINATION REPORT (The Intimidation UI)
            let purgeMsg = `╭━━━〔 💀 *VEX: TERMINATION-REPORT* 〕━━━╮\n`;
            purgeMsg += `┃ 🌟 *Authority:* Supreme Admin (Lupin)\n`;
            purgeMsg += `┃ 🛠️ *Protocol:* Purge-X6\n`;
            purgeMsg += `┃ 🧬 *Status:* Database Sanitized\n`;
            purgeMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            purgeMsg += `*🛡️ KERNEL EXECUTION*\n`;
            purgeMsg += `| ◈ *Target(s):* ${args.toUpperCase()}\n`;
            purgeMsg += `| ◈ *Records Deleted:* ${removedCount}\n`;
            purgeMsg += `| ◈ *Remaining Items:* ${db.total_products}\n\n`;

            purgeMsg += `*📢 LOGS*\n`;
            purgeMsg += `┃ 💠 Metadata wiped from server cache.\n`;
            purgeMsg += `┃ 💠 Marketplace listings updated.\n`;
            purgeMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            purgeMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            purgeMsg += `_VEX MINI BOT: Order Restored_`;

            await sock.sendMessage(m.key.remoteJid, { text: purgeMsg }, { quoted: m });

        } catch (error) {
            console.error("Purge Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Failed to access secure kernel for deletion." 
            }, { quoted: m });
        }
    }
};