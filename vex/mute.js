// VEX MINI BOT - VEX: mute
// Nova: Temporarily silences a participant via auto-delete protocol.
// Dev: Lupin Starnley

module.exports = {
    vex: 'mute',
    cyro: 'group',
    nova: 'Silences a specific member by auto-deleting their messages.',

    async execute(m, sock) {
        if (!m.isGroup) return m.reply("❌ *SYSTEM ERROR:* Admin protocols required.");

        const participants = (await sock.groupMetadata(m.chat)).participants;
        const botAdmin = participants.find(p => p.id === sock.user.id.split(':')[0] + '@s.whatsapp.net')?.admin;
        if (!botAdmin) return m.reply("⚠️ *PERMISSION DENIED:* Bot must be Admin to enforce silence.");

        const args = m.text.trim().split(/ +/).slice(1);
        let target = m.quoted ? m.quoted.sender : (args[0] ? args[0].replace(/[^0-9]/g, '') + "@s.whatsapp.net" : null);

        if (!target) return m.reply("❌ *USAGE:* Reply to a node with `.mute` to silence it.");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🤐", key: m.key } });

        try {
            // Adding to Global Muted List (This should be saved in your database/JSON)
            global.mutedNodes = global.mutedNodes || [];
            if (!global.mutedNodes.includes(target)) {
                global.mutedNodes.push(target);
            }

            let muteMsg = `╭━━━〔 🤐 *VEX: SILENCE-MODE* 〕━━━╮\n`;
            muteMsg += `┃ 🌟 *Status:* Node Silenced\n`;
            muteMsg += `┃ 👤 *Target:* @${target.split('@')[0]}\n`;
            muteMsg += `┃ 🧬 *Effect:* Auto-Delete Active\n`;
            muteMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            muteMsg += `> "Node @${target.split('@')[0]} has been restricted from broadcasting. Any attempt to send data will be terminated."\n\n`;
            muteMsg += `_VEX MINI BOT: Operational Silence._`;

            await sock.sendMessage(m.chat, { text: muteMsg, mentions: [target] }, { quoted: m });
        } catch (e) {
            m.reply("❌ *ERROR:* Failed to initiate silence protocol.");
        }
    }
};