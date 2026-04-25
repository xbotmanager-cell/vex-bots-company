// VEX MINI BOT - VEX: bomb
// Nova: High-speed message saturation tool.
// Dev: Lupin Starnley

module.exports = {
    vex: 'bomb',
    cyro: 'exploit',
    nova: 'Sends a specific number of messages to a target node. Max: 20.',

    async execute(m, sock) {
        const args = m.text.trim().split('|');
        // Format: .bomb @tag au namba | maelezo | idadi
        
        if (args.length < 3) {
            return m.reply("⚠️ *VEX BOMB:* Invalid Format.\nUsage: `.bomb @user | Wake up! | 10`\nOr: `.bomb 255xxx | Target Locked | 5` ");
        }

        let target = args.replace('.bomb', '').trim();
        const message = args[1].trim();
        let count = parseInt(args[2].trim());

        // Target processing (Tag au Namba)
        let jid;
        if (m.mentionedJid && m.mentionedJid) {
            jid = m.mentionedJid;
        } else {
            // Safisha namba
            let cleanNumber = target.replace(/[^0-9]/g, '');
            if (!cleanNumber.endsWith('@s.whatsapp.net')) {
                jid = cleanNumber + '@s.whatsapp.net';
            } else {
                jid = cleanNumber;
            }
        }

        // Constraints
        if (isNaN(count) || count <= 0) count = 1;
        if (count > 20) {
            count = 20;
            await m.reply("🔒 *VEX LIMIT:* Safety protocol engaged. Max bomb count set to 20.");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🚀", key: m.key } });
        
        m.reply(`💣 *VEX BOMB INITIATED*\n🎯 *Target:* ${target}\n📦 *Payload:* ${message}\n🔢 *Quantity:* ${count}\n\n_System is executing sequence..._`);

        for (let i = 0; i < count; i++) {
            // Hapa bot inatumia namba iliyohost (sock) kutuma
            await sock.sendMessage(jid, { text: message });
            
            // Delay ya sekunde 1.5 kuzuia Ban ya WhatsApp (Anti-Ban Delay)
            await new Promise(resolve => setTimeout(resolve, 1500)); 
        }

        await sock.sendMessage(m.key.remoteJid, { text: "✅ *BOMBING COMPLETE:* Target node saturated." }, { quoted: m });
    }
};
