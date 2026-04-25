// VEX MINI BOT - VEX: all (Hidetag)
// Nova: Invisible group summoning for a clean UI experience.
// Dev: Lupin Starnley

module.exports = {
    vex: 'all',
    cyro: 'group',
    nova: 'Pings every member in the group invisibly without listing names.',

    async execute(m, sock) {
        if (!m.isGroup) return m.reply("❌ *SYSTEM ERROR:* This stealth command is for Groups only.");

        // 1. DATA EXTRACTION
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const groupName = groupMetadata.subject;
        const mentions = participants.map(p => p.id);

        const args = m.text.trim().split(/ +/).slice(1);
        let messageText = args.join(' ');

        // 2. QUOTED CHECK: Kama hakuna maandishi, inachukua ya quoted message
        if (!messageText && m.quoted && m.quoted.text) {
            messageText = m.quoted.text;
        }

        if (!messageText) {
            return m.reply("❌ *USAGE:* Type `.all [message]` or reply to a message with `.all` ");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "👻", key: m.key } });

        try {
            // 3. THE GHOST DASHBOARD (Modern Layout)
            let ghostMsg = `╭━━━〔 👻 *VEX: GHOST-SUMMON* 〕━━━╮\n`;
            ghostMsg += `┃ 🌐 *Group:* ${groupName}\n`;
            ghostMsg += `┃ 👤 *From:* @${m.sender.split('@')[0]}\n`;
            ghostMsg += `┃ 🧬 *Range:* Full Stealth (All Nodes)\n`;
            ghostMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            ghostMsg += `> ${messageText}\n\n`;

            ghostMsg += `*🛰️ TRANSMISSION STATUS:*\n`;
            ghostMsg += `┃ 💠 *Visibility:* Invisible Pings\n`;
            ghostMsg += `┃ 💠 *Delivery:* All Active Participants\n`;
            ghostMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            ghostMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n`;
            ghostMsg += `_VEX MINI BOT: Stealth Mode Active_`;

            // 4. DEPLOYING THE INVISIBLE PING
            await sock.sendMessage(m.chat, { 
                text: ghostMsg, 
                mentions: mentions 
            }, { quoted: m });

        } catch (e) {
            console.error("Hidetag Error:", e);
            m.reply("❌ *CRITICAL ERROR:* Stealth transmission failed.");
        }
    }
};