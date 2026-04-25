// VEX MINI BOT - VEX: tagall
// Nova: Advanced group summoning with metadata analytics.
// Dev: Lupin Starnley

module.exports = {
    vex: 'tagall',
    cyro: 'group',
    nova: 'Summons all group members using a high-tech dashboard layout.',

    async execute(m, sock) {
        // 1. DATA EXTRACTION (Group Metadata)
        const groupMetadata = m.isGroup ? await sock.groupMetadata(m.chat) : {};
        const participants = m.isGroup ? groupMetadata.participants : [];
        const groupAdmins = participants.filter(p => p.admin !== null).map(p => p.id);
        const groupName = groupMetadata.subject || "Unknown Group";
        
        if (!m.isGroup) return m.reply("❌ *SYSTEM ERROR:* This command can only be deployed within a Group.");

        // 2. SMART MESSAGE LOGIC
        const args = m.text.trim().split(/ +/).slice(1);
        const customMessage = args.join(' ') || "Attention! The Master is summoning you.";
        
        await sock.sendMessage(m.key.remoteJid, { react: { text: "📢", key: m.key } });

        try {
            // 3. FETCH GROUP PP (For the high-tech look)
            let groupPP;
            try {
                groupPP = await sock.profilePictureUrl(m.chat, 'image');
            } catch {
                groupPP = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
            }

            // 4. CONSTRUCTING THE MATRIX DASHBOARD
            let tagMsg = `╭━━━〔 📢 *VEX: MASTER-SUMMON* 〕━━━╮\n`;
            tagMsg += `┃ 🌐 *Group:* ${groupName}\n`;
            tagMsg += `┃ 👤 *Summoner:* @${m.sender.split('@')[0]}\n`;
            tagMsg += `┃ 🧬 *Total Nodes:* ${participants.length} Members\n`;
            tagMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            tagMsg += `*🛰️ BROADCAST MESSAGE:*\n`;
            tagMsg += `> "${customMessage}"\n\n`;

            tagMsg += `*⚡ ACTIVE NODES LISTING:*\n`;

            // 5. MAPPING MEMBERS WITH ROLES
            let mentions = [];
            participants.forEach((mem, i) => {
                const isAdmin = groupAdmins.includes(mem.id);
                const roleIcon = isAdmin ? "🛡️ [ADMIN]" : "👤";
                tagMsg += `${i + 1}. ${roleIcon} @${mem.id.split('@')[0]}\n`;
                mentions.push(mem.id);
            });

            tagMsg += `\n*📊 ANALYTICS SUMMARY*\n`;
            tagMsg += `┃ 💠 *Status:* All members tagged.\n`;
            tagMsg += `┃ 💠 *Admin Count:* ${groupAdmins.length}\n`;
            tagMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            tagMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            tagMsg += `_VEX MINI BOT: Nothing Stays Hidden_`;

            // 6. DEPLOYING THE SUMMON (With Image & Mentions)
            await sock.sendMessage(m.chat, { 
                image: { url: groupPP },
                caption: tagMsg,
                mentions: mentions
            }, { quoted: m });

        } catch (e) {
            console.error("TagAll Error:", e);
            m.reply("❌ *CRITICAL ERROR:* Failed to sync with group nodes.");
        }
    }
};