// VEX MINI BOT - VEX: tagadmins
// Nova: Specifically targets and summons group administrators.
// Dev: Lupin Starnley

module.exports = {
    vex: 'tagadmins',
    cyro: 'group',
    nova: 'Summons only the group administrators for urgent matters.',

    async execute(m, sock) {
        if (!m.isGroup) return m.reply("❌ *SYSTEM ERROR:* This command is restricted to Groups only.");

        // 1. FETCH GROUP DATA
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const groupAdmins = participants.filter(p => p.admin !== null).map(p => p.id);
        const groupName = groupMetadata.subject;

        const args = m.text.trim().split(/ +/).slice(1);
        const adminMsg = args.join(' ') || "High priority alert! Admins required at the station.";

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🛡️", key: m.key } });

        try {
            // 2. FETCH GROUP IDENTITY (PP)
            let groupPP;
            try {
                groupPP = await sock.profilePictureUrl(m.chat, 'image');
            } catch {
                groupPP = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
            }

            // 3. CONSTRUCTING THE ADMIN DASHBOARD
            let tagMsg = `╭━━━〔 🛡️ *VEX: ADMIN-SUMMON* 〕━━━╮\n`;
            tagMsg += `┃ 🌐 *Group:* ${groupName}\n`;
            tagMsg += `┃ 👤 *Issued By:* @${m.sender.split('@')[0]}\n`;
            tagMsg += `┃ 🛡️ *Admin Node:* Verified Access\n`;
            tagMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            tagMsg += `*🚨 URGENT MESSAGE FOR ADMINS:*\n`;
            tagMsg += `> "${adminMsg}"\n\n`;

            tagMsg += `*⚡ ADMINISTRATOR LIST:*\n`;

            // 4. MAPPING ADMINS ONLY
            groupAdmins.forEach((admin, i) => {
                tagMsg += `${i + 1}. 🛡️ @${admin.split('@')[0]}\n`;
            });

            tagMsg += `\n*📊 SECURITY SUMMARY*\n`;
            tagMsg += `┃ 💠 *Total Admins:* ${groupAdmins.length}\n`;
            tagMsg += `┃ 💠 *Action:* Pinged all moderators.\n`;
            tagMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            tagMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            tagMsg += `_VEX MINI BOT: Security First_`;

            // 5. DEPLOYING THE SUMMON
            await sock.sendMessage(m.chat, { 
                image: { url: groupPP },
                caption: tagMsg,
                mentions: groupAdmins 
            }, { quoted: m });

        } catch (e) {
            console.error("TagAdmin Error:", e);
            m.reply("❌ *CRITICAL ERROR:* Could not establish link with admin nodes.");
        }
    }
};