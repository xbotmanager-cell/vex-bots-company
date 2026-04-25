// VEX MINI BOT - VEX: open
// Nova: Unlocks the group to allow messaging for all participants.
// Dev: Lupin Starnley

module.exports = {
    vex: 'open',
    cyro: 'group',
    nova: 'Opens the group chat for everyone.',

    async execute(m, sock) {
        if (!m.isGroup) return m.reply("❌ *SYSTEM ERROR:* Admin protocols required.");

        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const botAdmin = participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin;
        const userAdmin = participants.find(p => p.id === m.sender)?.admin;

        if (!botAdmin) return m.reply("⚠️ *PERMISSION DENIED:* Bot is not Admin.");
        if (!userAdmin && !m.fromMe) return m.reply("⚠️ *SECURITY ALERT:* Unauthorized Command.");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔓", key: m.key } });

        try {
            // 1. EXECUTE RESTORATION
            await sock.groupSettingUpdate(m.chat, 'not_announcement');

            // 2. WELCOME BACK DASHBOARD
            let openMsg = `╭━━━〔 🔓 *VEX: RESTORATION* 〕━━━╮\n`;
            openMsg += `┃ 🌟 *Status:* Online (Public Access)\n`;
            openMsg += `┃ 👤 *Authority:* Verified Moderator\n`;
            openMsg += `┃ 🧬 *Mode:* Active Communication\n`;
            openMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            openMsg += `*📢 SYSTEM ALERT:*\n`;
            openMsg += `> "Attention everyone! The group is now officially open for discussion. Thank you for your patience and for following the rules. Let's get to work!"\n\n`;

            openMsg += `*📊 ANALYTICS*\n`;
            openMsg += `┃ 💠 *Action:* Syncing with all nodes...\n`;
            openMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            closeMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n`;
            openMsg += `_VEX MINI BOT: Privacy is Power_`;

            await sock.sendMessage(m.chat, { text: openMsg }, { quoted: m });

        } catch (e) {
            m.reply("❌ *OPEN FAIL:* Failed to restore public access.");
        }
    }
};