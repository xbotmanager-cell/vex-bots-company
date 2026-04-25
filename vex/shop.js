// VEX MINI BOT - VEX: shop
// Nova: Market Entry & Inventory Management
// Dev: Lupin Starnley

const fs = require('fs');
const path = require('path');

module.exports = {
    vex: 'shop',
    cyro: 'premium',
    nova: 'Registers new products into the VEX Global Marketplace with image support',

    async execute(m, sock) {
        const filePath = path.join(__dirname, '../data/products.json');
        
        // 1. EXTRACT INPUT (Format: .shop Name | Price | Description)
        const args = m.message?.conversation?.split(' ').slice(1).join(' ') || 
                     m.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ');

        if (!args || !args.includes('|')) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-MARKET ERROR:*\nInvalid format. Use:\n`.shop Name | Price | Description`" 
            }, { quoted: m });
        }

        const [name, price, desc] = args.split('|').map(item => item.trim());
        const sender = m.sender;
        const pushName = m.pushName || "Vendor";

        await sock.sendMessage(m.key.remoteJid, { react: { text: "📥", key: m.key } });

        try {
            // 2. READ DATABASE
            let db = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

            // 3. GENERATE UNIQUE ID & PRODUCT DATA
            const productId = `VEX-${Math.floor(1000 + Math.random() * 9000)}`;
            
            const newProduct = {
                id: productId,
                name: name,
                price: price,
                description: desc,
                vendorName: pushName,
                vendorNumber: sender.split('@')[0],
                timestamp: new Date().toLocaleString(),
                status: "Available"
            };

            // 4. SAVE TO DATABASE
            db.items.push(newProduct);
            db.total_products = db.items.length;
            fs.writeFileSync(filePath, JSON.stringify(db, null, 2));

            // 5. SUCCESS NOTIFICATION (Premium Design)
            let successMsg = `╭━━━〔 🛍️ *VEX: MARKET-ENTRY* 〕━━━╮\n`;
            successMsg += `┃ 🌟 *Status:* Item Registered\n`;
            successMsg += `┃ 👤 *Vendor:* ${pushName}\n`;
            successMsg += `┃ 🧬 *Engine:* Cyro-Premium V1\n`;
            successMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            successMsg += `*📦 PRODUCT DETAILS*\n`;
            successMsg += `| ◈ *ID:* ${productId}\n`;
            successMsg += `| ◈ *Name:* ${name}\n`;
            successMsg += `| ◈ *Price:* ${price}\n`;
            successMsg += `| ◈ *Desc:* ${desc}\n\n`;

            successMsg += `*📢 SYSTEM NOTE*\n`;
            successMsg += `┃ 💠 Item is now live in .catalog\n`;
            successMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            successMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            successMsg += `_VEX MINI BOT: Global Trade_`;

            await sock.sendMessage(m.key.remoteJid, { text: successMsg }, { quoted: m });

        } catch (error) {
            console.error("Shop Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Failed to access marketplace database." 
            }, { quoted: m });
        }
    }
};