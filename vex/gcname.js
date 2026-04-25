// VEX MINI BOT - VEX: gcname (Smart Perms)
// Nova: Updates Group Name based on group permissions.
// Dev: Lupin Starnley

module.exports = {
    vex: 'gcname',
    cyro: 'group',
    nova: 'Updates group name if permitted by settings.',

    async execute(m, sock) {
        if (!m.isGroup) return m.reply("❌ *SYSTEM ERROR:* Groups only.");

        const args = m.text.trim().split(/ +/).slice(1);
        const newName = args.join(' ');
        if (!newName) return m.reply("❌ *USAGE:* `.gcname [New Name]`");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "✍️", key: m.key } });

        try {
            // JARIBIO LA KWANZA: Jaribu kubadili jina moja kwa moja
            await sock.groupUpdateSubject(m.chat, newName);

            let nameMsg = `╭━━━〔 ✍️ *VEX: GROUP-NAME* 〕━━━╮\n`;
            nameMsg += `┃ 🌟 *Status:* Name Deployed\n`;
            nameMsg += `┃ 📝 *New Name:* ${newName}\n`;
            nameMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n`;
            await sock.sendMessage(m.chat, { text: nameMsg }, { quoted: m });

        } catch (e) {
            // KAMA IMESHINDIKANA: Maana yake Group limefungwa kwa Admin tu
            m.reply("⚠️ *RESTRICTED:* Only Admins can change the name in this group. Make the bot an Admin to bypass this node.");
        }
    }
};