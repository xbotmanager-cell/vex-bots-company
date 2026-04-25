// VEX MINI BOT - VEX: promote (Smart Reply Version)
// Nova: Elevates a participant to Admin status instantly via reply or number.
// Dev: Lupin Starnley

module.exports = {
    vex: 'promote',
    cyro: 'group',
    nova: 'Promotes a member to an administrator role.',

    async execute(m, sock) {
        if (!m.isGroup) return m.reply("❌ *SYSTEM ERROR:* Group protocols required.");

        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const botAdmin = participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin;
        const userAdmin = participants.find(p => p.id === m.sender)?.admin;

        if (!botAdmin) return m.reply("⚠️ *PERMISSION DENIED:* Bot requires Admin privileges.");
        if (!userAdmin && !m.fromMe) return m.reply("⚠️ *SECURITY ALERT:* Unauthorized Command.");

        // SMART TARGETING: Priority 1: Quoted User | Priority 2: Provided Number
        const args = m.text.trim().split(/ +/).slice(1);
        let target = m.quoted ? m.quoted.sender : (args[0] ? args[0].replace(/[^0-9]/g, '') + "@s.whatsapp.net" : null);

        if (!target) return m.reply("❌ *USAGE:* Reply to a message with `.promote` or type `.promote [number]`");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🛡️", key: m.key } });

        try {
            await sock.groupParticipantsUpdate(m.chat, [target], 'promote');

            let proMsg = `╭━━━〔 🛡️ *VEX: ELEVATION* 〕━━━╮\n`;
            proMsg += `┃ 🌟 *Status:* Clearance Granted\n`;
            proMsg += `┃ 👤 *Target:* @${target.split('@')[0]}\n`;
            proMsg += `┃ 🧬 *Rank:* System Administrator\n`;
            proMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            proMsg += `*📢 PROCLAMATION:*\n`;
            proMsg += `> "Node @${target.split('@')[0]} has been elevated to Admin level by @${m.sender.split('@')[0]}."\n\n`;
            proMsg += `_VEX MINI BOT: Vision Beyond Limits_`;

            await sock.sendMessage(m.chat, { text: proMsg, mentions: [target, m.sender] }, { quoted: m });
        } catch (e) {
            m.reply("❌ *ELEVATION FAIL:* Ensure the target is in the group and not already an admin.");
        }
    }
};