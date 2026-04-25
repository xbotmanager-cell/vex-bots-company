// VEX MINI BOT - VEX: kick
// Nova: Removes a participant from the group instantly via reply or number.
// Dev: Lupin Starnley

module.exports = {
    vex: 'kick',
    cyro: 'group',
    nova: 'Removes a member from the group.',

    async execute(m, sock) {
        if (!m.isGroup) return m.reply("❌ *SYSTEM ERROR:* Admin protocols required.");

        // 1. IDENTITY & PERMISSION CHECK
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const botAdmin = participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin;
        const userAdmin = participants.find(p => p.id === m.sender)?.admin;

        if (!botAdmin) return m.reply("⚠️ *PERMISSION DENIED:* Bot requires Admin privileges to kick.");
        if (!userAdmin && !m.fromMe) return m.reply("⚠️ *SECURITY ALERT:* Unauthorized Execution.");

        // 2. SMART TARGETING (Priority: Reply > Number)
        const args = m.text.trim().split(/ +/).slice(1);
        let target = m.quoted ? m.quoted.sender : (args[0] ? args[0].replace(/[^0-9]/g, '') + "@s.whatsapp.net" : null);

        if (!target) return m.reply("❌ *USAGE:* Reply to a message with `.kick` or type `.kick [number]`");
        if (target === sock.user.id.split(':')[0] + '@s.whatsapp.net') return m.reply("🚫 *ERROR:* I cannot terminate my own process.");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🚷", key: m.key } });

        try {
            // 3. EXECUTE REMOVAL
            await sock.groupParticipantsUpdate(m.chat, [target], 'remove');

            // 4. TERMINATION REPORT
            let kickMsg = `╭━━━〔 🚷 *VEX: TERMINATION* 〕━━━╮\n`;
            kickMsg += `┃ 🌟 *Status:* Node Removed\n`;
            kickMsg += `┃ 👤 *Target:* @${target.split('@')[0]}\n`;
            kickMsg += `┃ 🧬 *Action:* Forced Disconnection\n`;
            kickMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            kickMsg += `*📢 SYSTEM LOG:* \n`;
            kickMsg += `> "Node @${target.split('@')[0]} has been disconnected from the network by @${m.sender.split('@')[0]}. Violation of protocols detected."\n\n`;

            kickMsg += `_VEX MINI BOT: Vision Beyond Limits_`;

            await sock.sendMessage(m.chat, { text: kickMsg, mentions: [target, m.sender] }, { quoted: m });

        } catch (e) {
            m.reply("❌ *KICK FAIL:* Failed to terminate the specified node.");
        }
    }
};