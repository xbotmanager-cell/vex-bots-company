// VEX MINI BOT - VEX: creategc
// Nova: Group Architect & Automation Engine
// Dev: Lupin Starnley

module.exports = {
    vex: 'creategc',
    cyro: 'group',
    nova: 'Automates the creation of a new group with custom metadata and auto-cleanup',

    async execute(m, sock) {
        const args = m.message?.conversation?.split(' ').slice(1) || 
                     m.message?.extendedTextMessage?.text?.split(' ').slice(1);
        
        const groupName = args.join(' ');
        const sender = m.sender; // Namba ya aliyetuma command
        const partnerNumber = "255780470905@s.whatsapp.net"; // Namba ya lazima kuongezwa

        if (!groupName) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Please provide a group name.\nExample: `.creategc VEX TECH`" 
            }, { quoted: m });
        }

        // 1. REACTION
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🏗️", key: m.key } });

        try {
            // 2. CREATE GROUP (Lazima uwe na member mmoja mwingine)
            const group = await sock.groupCreate(groupName, [sender, partnerNumber]);
            const groupId = group.id;

            // 3. SET PROFILE PICTURE (Kama amereply picha)
            const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quotedMsg?.imageMessage) {
                const stream = await sock.downloadContentFromMessage(quotedMsg.imageMessage, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
                await sock.updateProfilePicture(groupId, buffer);
            }

            // 4. GIVE ADMIN TO HOST (Aliyetuma command)
            await sock.groupParticipantsUpdate(groupId, [sender], "promote");

            // 5. SUCCESS REPORT (Kishua Design)
            let successMsg = `╭━━━〔 🏗️ *VEX: ARCHITECT* 〕━━━╮\n`;
            successMsg += `┃ 🌟 *Status:* Group Created\n`;
            successMsg += `┃ 👤 *Host:* @${sender.split('@')[0]}\n`;
            successMsg += `┃ 🧬 *Engine:* Group-Gen V1\n`;
            successMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            successMsg += `*🏛️ GROUP SPECS*\n`;
            successMsg += `| ◈ *Name:* ${groupName}\n`;
            successMsg += `| ◈ *ID:* ${groupId.split('@')[0]}\n`;
            successMsg += `| ◈ *Timer:* 3 Minute Clean-up ⏳\n\n`;
            successMsg += `_VEX has finalized the structure._`;

            await sock.sendMessage(m.key.remoteJid, { text: successMsg, mentions: [sender] }, { quoted: m });
            await sock.sendMessage(groupId, { text: "*Welcome to the new structure. Admin rights granted to host.*" });

            // 6. AUTO-CLEANUP (Ondoa namba yako baada ya dakika 3)
            setTimeout(async () => {
                await sock.groupParticipantsUpdate(groupId, [partnerNumber], "remove");
                await sock.sendMessage(groupId, { text: "*💠 Protocol Complete:* Partner number removed. Archive finalized." });
            }, 3 * 60 * 1000); // 3 Minutes

        } catch (error) {
            console.error("CreateGC Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Failed to architect the group. Check bot permissions." 
            }, { quoted: m });
        }
    }
};