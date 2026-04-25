// VEX MINI BOT - VEX: buy
// Nova: Transaction Processing & Automated Invoicing
// Dev: Lupin Starnley

const fs = require('fs');
const path = require('path');

module.exports = {
    vex: 'buy',
    cyro: 'premium',
    nova: 'Processes product orders and generates professional digital invoices',

    async execute(m, sock) {
        const filePath = path.join(__dirname, '../data/products.json');
        const adminNumber = "255780470905@s.whatsapp.net"; // Namba yako ya Admin

        const args = m.message?.conversation?.split(' ').slice(1) || 
                     m.message?.extendedTextMessage?.text?.split(' ').slice(1);
        
        const productId = args[0]?.toUpperCase();

        if (!productId) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-MARKET ERROR:*\nPlease provide the Product ID.\nExample: `.buy VEX-1234`" 
            }, { quoted: m });
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "💳", key: m.key } });

        try {
            // 1. SEARCH FOR PRODUCT
            let db = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const product = db.items.find(item => item.id === productId);

            if (!product) {
                return await sock.sendMessage(m.key.remoteJid, { text: "*❌ VEX-ERROR:* Product ID not found in the marketplace." });
            }

            const sender = m.sender;
            const customerName = m.pushName || "Customer";
            const customerNumber = sender.split('@')[0];

            // 2. GENERATE RECEIPT FOR CUSTOMER
            let receiptMsg = `╭━━━〔 💳 *VEX: DIGITAL-INVOICE* 〕━━━╮\n`;
            receiptMsg += `┃ 🌟 *Status:* Order Processed\n`;
            receiptMsg += `┃ 👤 *Client:* ${customerName}\n`;
            receiptMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            receiptMsg += `*📑 ORDER SUMMARY*\n`;
            receiptMsg += `| ◈ *Item:* ${product.name}\n`;
            receiptMsg += `| ◈ *Price:* ${product.price}\n`;
            receiptMsg += `| ◈ *Order ID:* ${Math.floor(100000 + Math.random() * 900000)}\n\n`;

            receiptMsg += `*📢 NEXT STEPS*\n`;
            receiptMsg += `The admin and the vendor have been notified. Please wait for a direct contact to finalize your payment and delivery.\n\n`;

            receiptMsg += `_Thank you for trading with VEX Arsenal._`;

            await sock.sendMessage(m.key.remoteJid, { text: receiptMsg }, { quoted: m });

            // 3. SEND ALERT TO ADMIN (LUPIN)
            let adminAlert = `*🚨 VEX-MARKET: NEW ORDER RECEIVED*\n\n`;
            adminAlert += `*👤 CUSTOMER INFO*\n`;
            adminAlert += `| ◈ *Name:* ${customerName}\n`;
            adminAlert += `| ◈ *Number:* wa.me/${customerNumber}\n\n`;

            adminAlert += `*📦 PRODUCT INFO*\n`;
            adminAlert += `| ◈ *Name:* ${product.name}\n`;
            adminAlert += `| ◈ *Price:* ${product.price}\n`;
            adminAlert += `| ◈ *Vendor:* ${product.vendorName} (wa.me/${product.vendorNumber})\n\n`;

            adminAlert += `*📝 FORWARD THIS TO VENDOR:*\n`;
            adminAlert += `------------------------------\n`;
            adminAlert += `Hello ${product.vendorName}, I am the VEX Market Assistant. A customer named *${customerName}* (wa.me/${customerNumber}) is interested in buying your product: *${product.name}*. Please reach out to them to complete the sale.\n`;
            adminAlert += `------------------------------`;

            await sock.sendMessage(adminNumber, { text: adminAlert });

        } catch (error) {
            console.error("Buy Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Transaction failed due to a database sync error." 
            }, { quoted: m });
        }
    }
};