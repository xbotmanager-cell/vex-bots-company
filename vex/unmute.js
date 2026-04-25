// VEX MINI BOT - VEX: unmute
// Nova: Restores a participant's ability to broadcast messages.
// Dev: Lupin Starnley

module.exports = {
    vex: 'unmute',
    cyro: 'group',
    nova: 'Restores the voice of a silenced member.',

    async execute(m, sock) {
        if (!m.isGroup) return m.reply("❌ *SYSTEM ERROR:* Admin protocols required.");

        const args = m.text.trim().split(/ +/).slice(1);
        let target = m.quoted ? m.quoted.sender : (args[0] ? args[0].replace(/[^0-9]/g, '') + "@s.whatsapp.net" : null);

        if (!target) return m.reply("❌ *USAGE:* Reply to a node with `.unmute` ");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔊", key: m.key } });

        try {
            global.mutedNodes = global.mutedNodes || [];
            global.mutedNodes = global.mutedNodes.filter(node => node !== target);

            let unmuteMsg = `╭━━━〔 🔊 *VEX: VOICE-RESTORED* 〕━━━╮\n`;
            unmuteMsg += `┃ 🌟 *Status:* Node Activated\n`;
            unmuteMsg += `┃ 👤 *Target:* @${target.split('@')[0]}\n`;
            unmuteMsg += `┃ 🧬 *Mode:* Full Broadcast Allowed\n`;
            unmuteMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            unmuteMsg += `> "Protocol lifted for @${target.split('@')[0]}. You may now transmit data to the network."\n\n`;
            unmuteMsg += `_VEX MINI BOT: Vision Beyond Limits_`;

            await sock.sendMessage(m.chat, { text: unmuteMsg, mentions: [target] }, { quoted: m });
        } catch (e) {
            m.reply("❌ *ERROR:* Failed to restore node access.");
        }
    }
};