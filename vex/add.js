// VEX MINI BOT - VEX: add
//
// Dev: Lupin Starnley

module.exports = {
    vex: 'add',
    cyro: 'group',
    nova: 'Adds a user to the group and deploys a global welcome dashboard.',

    async execute(m, sock) {
        if (!m.isGroup) return m.reply("❌ *SYSTEM ERROR:* This module requires Group Access.");

        const args = m.text.trim().split(/ +/).slice(1);
        let userToAdd;

        // 1. SMART TARGETING: Check for quoted message or provided number
        if (m.quoted) {
            userToAdd = m.quoted.sender;
        } else if (args[0]) {
            // Cleans any country code format (e.g., +255, 07..., 1...) into WhatsApp JID
            let rawNumber = args[0].replace(/[^0-9]/g, '');
            userToAdd = rawNumber + "@s.whatsapp.net";
        }

        if (!userToAdd) return m.reply("❌ *USAGE:* `.add [international_number]` or reply to a message with `.add` ");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "➕", key: m.key } });

        try {
            // 2. EXECUTION: Attempting to add participant
            await sock.groupParticipantsUpdate(m.chat, [userToAdd], 'add');

            // --- WELCOME PROTOCOL DEPLOYMENT ---

            // A: FETCH METADATA
            const groupMetadata = await sock.groupMetadata(m.chat);
            const groupName = groupMetadata.subject;
            
            // B: IMAGE ACQUISITION (Checks for Target PP or Defaults to VEX image)
            let userPP;
            try {
                userPP = await sock.profilePictureUrl(userToAdd, 'image');
            } catch {
                // Pointing to the specific path you requested
                userPP = "./assets/images/vex.png"; 
            }

            // C: IDENTITY EXTRACTION
            const contact = await sock.onWhatsApp(userToAdd);
            const userName = (contact && contact[0] && contact[0].notify) || userToAdd.split('@')[0];

            // D: CONSTRUCTING THE GLOBAL DASHBOARD (English Standard)
            let welcomeMsg = `╭━━━〔 📢 *VEX: MASTER-WELCOME* 〕━━━╮\n`;
            welcomeMsg += `┃ 🌐 *Group:* ${groupName}\n`;
            welcomeMsg += `┃ 👤 *Enforcer:* @${m.sender.split('@')[0]}\n`;
            welcomeMsg += `┃ 🧬 *Node ID:* @${userToAdd.split('@')[0]}\n`;
            welcomeMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            welcomeMsg += `*✨ INCOMING ASSET DETECTED:*\n`;
            welcomeMsg += `> Identity: ${userName}\n`;
            welcomeMsg += `> Network: ${groupName}\n`;
            welcomeMsg += `> Status: Security Clearance Granted\n\n`;

            welcomeMsg += `*🚨 OFFICIAL PROCLAMATION:*\n`;
            welcomeMsg += `┃ Welcome, ${userName}. You have been officially activated into the core of **${groupName}**.\n\n`;
            welcomeMsg += `┃ You are now part of an elite network. Protocol and discretion are mandatory.\n\n`;
            welcomeMsg += `┃ Operational security must be maintained at all times within this node.\n\n`;
            welcomeMsg += `┃ Adapt. Execute. Evolve.\n\n`;

            welcomeMsg += `*📊 SYSTEM ANALYTICS*\n`;
            welcomeMsg += `┃ 💠 *Action:* Group Entry Synchronized\n`;
            welcomeMsg += `┃ 💠 *Clearance:* Global Level\n`;
            welcomeMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            welcomeMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n`;
            welcomeMsg += `_VEX MINI BOT: Vision Beyond Limits_`;

            // E: FINAL DEPLOYMENT
            await sock.sendMessage(m.chat, { 
                image: { url: userPP },
                caption: welcomeMsg,
                mentions: [m.sender, userToAdd] 
            }, { quoted: m });

        } catch (e) {
            // ERROR HANDLING: Restricted by group settings or admin privileges
            m.reply("⚠️ *RESTRICTED:* Group security protocol prevents non-admins from adding members. Elevate Bot to Admin to bypass.");
        }
    }
};
