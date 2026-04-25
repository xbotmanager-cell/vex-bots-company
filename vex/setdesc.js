// VEX MINI BOT - VEX: setdesc
// Nova: Updates the group description via text input or quoted message.
// Dev: Lupin Starnley

module.exports = {
    vex: 'setdesc',
    cyro: 'group',
    nova: 'Updates the group description.',

    async execute(m, sock) {
        if (!m.isGroup) return m.reply("❌ *SYSTEM ERROR:* Group protocols required.");

        const args = m.text.trim().split(/ +/).slice(1);
        let newDesc = m.quoted ? m.quoted.text : args.join(' ');

        if (!newDesc) return m.reply("❌ *USAGE:* Provide text or reply to a message with `.setdesc` ");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "📜", key: m.key } });

        try {
            // 1. EXECUTE DESCRIPTION UPDATE
            await sock.groupUpdateDescription(m.chat, newDesc);

            // 2. SUCCESS DASHBOARD
            let descMsg = `╭━━━〔 📜 *VEX: MISSION-SYNC* 〕━━━╮\n`;
            descMsg += `┃ 🌟 *Status:* Description Updated\n`;
            descMsg += `┃ 👤 *Master:* @${m.sender.split('@')[0]}\n`;
            descMsg += `┃ 🧬 *Engine:* Identity-Sync V2\n`;
            descMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            descMsg += `*🛰️ NEW PROTOCOL DEPLOYED:*\n`;
            descMsg += `> ${newDesc}\n\n`;
            descMsg += `_VEX MINI BOT: Information is Power_`;

            await sock.sendMessage(m.chat, { text: descMsg, mentions: [m.sender] }, { quoted: m });

        } catch (e) {
            m.reply("⚠️ *RESTRICTED:* Admin privileges required to modify group information nodes.");
        }
    }
};