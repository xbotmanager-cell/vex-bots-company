// VEX MINI BOT - VEX: link
// Nova: Fetches the group invite link.
// Dev: Lupin Starnley

module.exports = {
    vex: 'link',
    cyro: 'group',
    nova: 'Retrieves the group invite link for the host.',

    async execute(m, sock) {
        if (!m.isGroup) return m.reply("❌ *SYSTEM ERROR:* Groups only.");

        // PERMISSION CHECK: Bot must be Admin to get link
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const botAdmin = participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin;

        if (!botAdmin) return m.reply("⚠️ *PERMISSION DENIED:* Bot needs to be an Admin to fetch the link.");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔗", key: m.key } });

        try {
            // 1. FETCH LINK
            const code = await sock.groupInviteCode(m.chat);
            const inviteLink = `https://chat.whatsapp.com/${code}`;

            // 2. LINK DASHBOARD
            let linkMsg = `╭━━━〔 🔗 *VEX: ACCESS-LINK* 〕━━━╮\n`;
            linkMsg += `┃ 🌐 *Group:* ${groupMetadata.subject}\n`;
            linkMsg += `┃ 🧬 *Type:* Secure Invite\n`;
            linkMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            linkMsg += `*🛰️ ENCRYPTED LINK:*\n`;
            linkMsg += `${inviteLink}\n\n`;

            linkMsg += `*📊 ANALYTICS*\n`;
            linkMsg += `┃ 💠 Share this link to bring new nodes.\n`;
            linkMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            linkMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n`;
            linkMsg += `_VEX MINI BOT: Privacy is Power_`;

            await sock.sendMessage(m.chat, { text: linkMsg }, { quoted: m });

        } catch (e) {
            m.reply("❌ *LINK FAIL:* Could not retrieve invite code.");
        }
    }
};