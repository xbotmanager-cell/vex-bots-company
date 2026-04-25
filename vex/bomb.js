// VEX MINI BOT - VEX: bomb
// Nova: High-speed message saturation tool.
// Dev: Lupin Starnley (VEX Master)

module.exports = {
    vex: 'bomb',
    cyro: 'exploit',
    nova: 'Sends a specific number of messages to a target node. Max: 20.',

    async execute(m, sock) {
        // Tunapasua kwa kutumia '|'
        const parts = m.text.split('|');
        
        if (parts.length < 3) {
            return m.reply("⚠️ *VEX BOMB:* Invalid Format.\nUsage: `.bomb @user | Wake up! | 10`\nOr: `.bomb 255xxx | Target Locked | 5` ");
        }

        let targetRaw = parts[0].replace('.bomb', '').trim();
        const message = parts[1].trim();
        let count = parseInt(parts[2].trim());

        // 1. RESOLVE TARGET (Tag au Namba)
        let jid;
        if (m.mentionedJid && m.mentionedJid[0]) {
            jid = m.mentionedJid[0];
        } else {
            // Safisha namba ili ibaki namba tupu
            let cleanNumber = targetRaw.replace(/[^0-9]/g, '');
            if (!cleanNumber) return m.reply("❌ *VEX-ERROR:* Target node is invalid. Provide a number or tag.");
            jid = cleanNumber + '@s.whatsapp.net';
        }

        // 2. CONSTRAINTS & PROTECTION
        if (isNaN(count) || count <= 0) count = 1;
        if (count > 20) {
            count = 20;
            await m.reply("🔒 *VEX LIMIT:* Safety protocol engaged. Max bomb count restricted to 20.");
        }

        // Inazuia usijipige mwenyewe au bot
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        if (jid === botId || jid === m.sender) {
            return m.reply("🛡️ *VEX SAFETY:* Operation aborted. Cannot saturate Master or Bot node.");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🚀", key: m.key } });
        
        m.reply(`💣 *VEX BOMB INITIATED*\n🎯 *Target:* ${jid.split('@')[0]}\n📦 *Payload:* ${message}\n🔢 *Quantity:* ${count}\n\n_System is executing sequence..._`);

        // 3. EXECUTION LOOP
        for (let i = 0; i < count; i++) {
            try {
                await sock.sendMessage(jid, { text: message });
                
                // Anti-Ban Delay: 1.5 seconds kuzuia WhatsApp wasikustrike
                await new Promise(resolve => setTimeout(resolve, 1500)); 
            } catch (err) {
                console.error("Bombing interupted:", err);
                break;
            }
        }

        await sock.sendMessage(m.key.remoteJid, { 
            text: "✅ *BOMBING COMPLETE:* Target node saturated successfully." 
        }, { quoted: m });
    }
};
