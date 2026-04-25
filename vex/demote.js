// VEX MINI BOT - VEX: demote (Smart Reply Version)
// Nova: Removes Admin privileges from a participant instantly via reply or number.
// Dev: Lupin Starnley

module.exports = {
    vex: 'demote',
    cyro: 'group',
    nova: 'Removes a member from an administrator role.',

    async execute(m, sock) {
        if (!m.isGroup) return m.reply("❌ *SYSTEM ERROR:* Group protocols required.");

        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const botAdmin = participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin;
        const userAdmin = participants.find(p => p.id === m.sender)?.admin;

        if (!botAdmin) return m.reply("⚠️ *PERMISSION DENIED:* Bot is not Admin.");
        if (!userAdmin && !m.fromMe) return m.reply("⚠️ *SECURITY ALERT:* Unauthorized Access.");

        // SMART TARGETING: Priority 1: Quoted User | Priority 2: Provided Number
        const args = m.text.trim().split(/ +/).slice(1);
        let target = m.quoted ? m.quoted.sender : (args[0] ? args[0].replace(/[^0-9]/g, '') + "@s.whatsapp.net" : null);

        if (!target) return m.reply("❌ *USAGE:* Reply to a message with `.demote` or type `.demote [number]`");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "⬇️", key: m.key } });

        try {
            await sock.groupParticipantsUpdate(m.chat, [target], 'demote');

            let demMsg = `╭━━━〔 ⬇️ *VEX: REVOCATION* 〕━━━╮\n`;
            demMsg += `┃ 🌟 *Status:* Clearance Revoked\n`;
            demMsg += `┃ 👤 *Target:* @${target.split('@')[0]}\n`;
            demMsg += `┃ 🧬 *Rank:* Regular Node\n`;
            demMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            demMsg += `*📢 NOTICE:*\n`;
            demMsg += `> "Admin privileges for node @${target.split('@')[0]} have been stripped by @${m.sender.split('@')[0]}."\n\n`;
            demMsg += `_VEX MINI BOT: Privacy is Power_`;

            await sock.sendMessage(m.chat, { text: demMsg, mentions: [target, m.sender] }, { quoted: m });
        } catch (e) {
            m.reply("❌ *REVOCATION FAIL:* Check if the target is actually an admin.");
        }
    }
};