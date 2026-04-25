// VEX MINI BOT - VEX: catalog
// Nova: Global Inventory Display & Trade Showcase
// Dev: Lupin Starnley

const fs = require('fs');
const path = require('path');

module.exports = {
    vex: 'catalog',
    cyro: 'premium',
    nova: 'Displays all available products in the VEX Global Marketplace',

    async execute(m, sock) {
        const filePath = path.join(__dirname, '../data/products.json');

        await sock.sendMessage(m.key.remoteJid, { react: { text: "📖", key: m.key } });

        try {
            // 1. CHECK IF DATABASE EXISTS
            if (!fs.existsSync(filePath)) {
                return await sock.sendMessage(m.key.remoteJid, { text: "*⚠️ VEX-MARKET:* No products registered yet. Market is empty." });
            }

            // 2. READ DATABASE
            let db = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            let items = db.items;

            if (items.length === 0) {
                return await sock.sendMessage(m.key.remoteJid, { text: "*⚠️ VEX-MARKET:* No active listings found in the database." });
            }

            // 3. CONSTRUCT THE CATALOG (Premium English Design)
            const sender = m.sender || m.key.participant || m.key.remoteJid;
            let catalogMsg = `╭━━━〔 📖 *VEX: GLOBAL-CATALOG* 〕━━━╮\n`;
            catalogMsg += `┃ 🌟 *Status:* Market Online\n`;
            catalogMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            catalogMsg += `┃ 🧬 *Total Items:* ${db.total_products}\n`;
            catalogMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            catalogMsg += `*🛒 CURRENT LISTINGS:*\n\n`;

            items.forEach((item, index) => {
                catalogMsg += `*📦 ITEM #${index + 1}*\n`;
                catalogMsg += `| ◈ *Name:* ${item.name}\n`;
                catalogMsg += `| ◈ *Price:* ${item.price}\n`;
                catalogMsg += `| ◈ *ID:* ${item.id}\n`;
                catalogMsg += `| ◈ *Vendor:* ${item.vendorName}\n`;
                catalogMsg += `| ◈ *Description:* ${item.description}\n`;
                catalogMsg += `╰───────────────╯\n\n`;
            });

            catalogMsg += `*📝 HOW TO BUY:*\n`;
            catalogMsg += `Type \`.buy [ID]\` to generate an invoice.\n`;
            catalogMsg += `Example: \`.buy VEX-1234\`\n\n`;

            catalogMsg += `*📢 SYSTEM NOTE*\n`;
            catalogMsg += `┃ 💠 Validating global trade protocols.\n`;
            catalogMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            catalogMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            catalogMsg += `_VEX MINI BOT: E-Commerce Solution_`;

            // 4. SEND CATALOG
            await sock.sendMessage(m.key.remoteJid, { 
                text: catalogMsg,
                mentions: [sender]
            }, { quoted: m });

        } catch (error) {
            console.error("Catalog Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Could not retrieve the catalog. Database error." 
            }, { quoted: m });
        }
    }
};