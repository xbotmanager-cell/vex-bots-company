// VEX MINI BOT - VEX: bug
// Nova: Transmission protocol for system error reporting.
// Dev: Lupin Starnley

module.exports = {
    vex: 'bug',
    cyro: 'feedback',
    nova: 'Reports a system bug or feature request directly to the Master Developer.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        const report = args.join(' ');
        const ownerNumber = "255780470905@s.whatsapp.net"; // Your Direct Line

        if (!report) {
            return m.reply("⚠️ *VEX BUG REPORT:* Please provide details of the issue.\nExample: `.bug the .ai command is not responding` ");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "📩", key: m.key } });

        // Constructing the transmission for the owner
        let devMsg = `╭━━━〔 ⚠️ *SYSTEM BUG REPORT* 〕━━━╮\n`;
        devMsg += `┃ 👤 *Reporter:* ${m.pushName || 'Unknown Node'}\n`;
        devMsg += `┃ 🆔 *JID:* ${m.sender.split('@')}\n`;
        devMsg += `┃ 📍 *Source:* ${m.isGroup ? 'Group Chat' : 'Private Chat'}\n`;
        devMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        devMsg += `*📝 REPORT DETAILS:*\n${report}\n\n`;
        devMsg += `_VEX MINI BOT: Diagnostic Data Incoming_`;

        try {
            // Forwarding to Master Developer
            await sock.sendMessage(ownerNumber, { text: devMsg });

            // Confirming to the user
            await m.reply("🚀 *REPORT TRANSMITTED:* Your message has been sent directly to Lupin Starnley. Thank you for the intelligence, Node.");

        } catch (e) {
            console.error("BUG REPORT FAIL:", e);
            m.reply("❌ *TRANSMISSION ERROR:* Could not reach the Master Developer's node. System offline.");
        }
    }
};
