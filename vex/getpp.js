// VEX MINI BOT - VEX: getpp (Smart Version)
// Nova: Auto-detects target in DM or Groups via quotes.
// Dev: Lupin Starnley

module.exports = {
    vex: 'getpp',
    cyro: 'profile',
    nova: 'Smartly snatches profile picture from DM partner or quoted user.',

    async execute(m, sock) {
        let targetJid;

        // 1. SMART TARGETING LOGIC (The Brain)
        if (m.quoted) {
            // A: Ikiwa amem-quote mtu (Group au DM)
            targetJid = m.quoted.sender;
        } else if (!m.isGroup) {
            // B: Ikiwa ni Private Chat na haja-quote, anachukua ya mtu wa pili
            targetJid = m.key.remoteJid;
        } else {
            // C: Ikiwa yupo kwenye Group na haja-quote, anachukua ya aliyetuma amri
            targetJid = m.sender;
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "👁️", key: m.key } });

        try {
            // 2. FETCHING THE DATA
            let ppUrl;
            try {
                ppUrl = await sock.profilePictureUrl(targetJid, 'image');
            } catch {
                // Ikiwa ameficha picha (Privacy Settings)
                ppUrl = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
            }

            // 3. DIGITAL REPORT LAYOUT
            let ppMsg = `╭━━━〔 👁️ *VEX: PP-SNATCHER* 〕━━━╮\n`;
            ppMsg += `┃ 🌟 *Status:* Target Visualized\n`;
            ppMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            ppMsg += `┃ 🧬 *Engine:* Profile-Scan V2\n`;
            ppMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            ppMsg += `*📊 EXTRACTION DATA*\n`;
            ppMsg += `| ◈ *ID:* @${targetJid.split('@')[0]} |\n`;
            ppMsg += `| ◈ *Source:* ${m.isGroup ? "Group Signal" : "Private Node"} |\n`;
            ppMsg += `| ◈ *Mode:* Auto-Detection |\n\n`;

            ppMsg += `*🛡️ SCAN RESULT*\n`;
            ppMsg += `┃ 💠 Image decrypted successfully.\n`;
            ppMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            ppMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            ppMsg += `_VEX MINI BOT: Vision Without Limits_`;

            // 4. SEND THE IMAGE WITH MENTIONS
            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: ppUrl }, 
                caption: ppMsg,
                mentions: [targetJid]
            }, { quoted: m });

        } catch (err) {
            console.error(err);
            m.reply("❌ *SCAN FAIL:* Critical error in profile decryption.");
        }
    }
};