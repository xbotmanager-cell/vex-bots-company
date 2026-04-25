// VEX MINI BOT - VEX: approve
// Nova: Approves all pending participant requests in a single execution.
// Dev: Lupin Starnley

module.exports = {
    vex: 'approve',
    cyro: 'group',
    nova: 'Accepts all pending join requests for the group.',

    async execute(m, sock) {
        if (!m.isGroup) return m.reply("❌ *SYSTEM ERROR:* Group protocols required.");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "✅", key: m.key } });

        try {
            // 1. FETCH PENDING REQUESTS
            const response = await sock.groupRequestParticipantsList(m.chat);
            
            if (!response || response.length === 0) {
                return m.reply("📝 *LOG:* No pending requests detected in the security buffer.");
            }

            // 2. APPROVE ALL NODES
            for (let user of response) {
                await sock.groupRequestParticipantsUpdate(m.chat, [user.jid], 'approve');
            }

            // 3. SUCCESS DASHBOARD
            let appMsg = `╭━━━〔 ✅ *VEX: GATEKEEPER* 〕━━━╮\n`;
            appMsg += `┃ 🌟 *Status:* Access Granted\n`;
            appMsg += `┃ 👥 *Approved:* ${response.length} New Nodes\n`;
            appMsg += `┃ 🧬 *Action:* Bulk Synchronization\n`;
            appMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            appMsg += `*📢 SYSTEM UPDATE:* \n`;
            appMsg += `> "All pending security clearances have been authorized. New participants are now integrated into the network."\n\n`;
            appMsg += `_VEX MINI BOT: Vision Beyond Limits_`;

            await sock.sendMessage(m.chat, { text: appMsg }, { quoted: m });

        } catch (e) {
            m.reply("⚠️ *RESTRICTED:* Elevated privileges (Admin) are required to manage group approvals.");
        }
    }
};