// VEX MINI BOT - VEX: close
// Nova: Locks the group to Admin-Only messaging with a professional notice.
// Dev: Lupin Starnley

module.exports = {
    vex: 'close',
    cyro: 'group',
    nova: 'Closes the group chat for non-admin participants.',

    async execute(m, sock) {
        if (!m.isGroup) return m.reply("❌ *SYSTEM ERROR:* Admin protocols required.");

        // 1. PERMISSION CHECK
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const botAdmin = participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin;
        const userAdmin = participants.find(p => p.id === m.sender)?.admin;

        if (!botAdmin) return m.reply("⚠️ *PERMISSION DENIED:* I need Admin privileges to execute lockdown.");
        if (!userAdmin && !m.fromMe) return m.reply("⚠️ *SECURITY ALERT:* Only Administrators can issue lockdown commands.");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔒", key: m.key } });

        try {
            // 2. EXECUTE LOCKDOWN
            await sock.groupSettingUpdate(m.chat, 'announcement');

            // 3. ENCOURAGING DASHBOARD
            let closeMsg = `╭━━━〔 🔒 *VEX: GROUP-LOCKDOWN* 〕━━━╮\n`;
            closeMsg += `┃ 🌟 *Status:* Secured (Admin Only)\n`;
            closeMsg += `┃ 👤 *Authority:* Verified Moderator\n`;
            closeMsg += `┃ 🧬 *Mode:* Maintenance / Privacy\n`;
            closeMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            closeMsg += `*📢 NOTICE TO ALL MEMBERS:*\n`;
            closeMsg += `> "The group is temporarily closed for maintenance. Please don't worry, we will be back online shortly. Stay tuned for further updates."\n\n`;

            closeMsg += `*📊 SYSTEM ANALYTICS*\n`;
            closeMsg += `┃ 💠 *Action:* Communications Halted\n`;
            closeMsg += `┃ 💠 *Reason:* Scheduled Protocol\n`;
            closeMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            closeMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n`;
            closeMsg += `_VEX MINI BOT: Vision Beyond Limits_`;

            await sock.sendMessage(m.chat, { text: closeMsg }, { quoted: m });

        } catch (e) {
            m.reply("❌ *LOCK FAIL:* Internal server error during lockdown.");
        }
    }
};