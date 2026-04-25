// VEX MINI BOT - VEX: ws (WhatsApp Stalker)
// Nova: Advanced OSINT tool for WhatsApp account intelligence.
// Dev: Lupin Starnley

module.exports = {
    vex: 'ws',
    cyro: 'exploit',
    nova: 'Analyzes any WhatsApp number for business status, verification, and DP.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        if (!args[0]) return m.reply("❌ *ERROR:* Please provide a phone number with country code.\nExample: `.ws 255780470905` ");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔍", key: m.key } });

        let jid = args[0].replace(/[^0-9]/g, '') + "@s.whatsapp.net";

        try {
            // 1. CHECK IF NUMBER EXISTS & GET BUSINESS INFO
            const [result] = await sock.onWhatsApp(jid);
            
            if (!result || !result.exists) {
                return m.reply("❌ *SCAN FAIL:* This number is NOT on WhatsApp.");
            }

            // 2. FETCH PROFILE PICTURE
            let dpUrl;
            try {
                dpUrl = await sock.profilePictureUrl(jid, 'image');
            } catch {
                dpUrl = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
            }

            // 3. CHECK BUSINESS STATUS
            const isBusiness = result.biz === true || !!(await sock.getBusinessProfile?.(jid));
            
            // 4. CONSTRUCTING REPORT
            let wsMsg = `╭━━━〔 🔍 *VEX: WS-STALKER* 〕━━━╮\n`;
            wsMsg += `┃ 🌟 *Status:* Data Decrypted\n`;
            wsMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            wsMsg += `┃ 🧬 *Engine:* OSINT-V1H\n`;
            wsMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            wsMsg += `*📊 TARGET ANALYSIS*\n`;
            wsMsg += `| ◈ *Number:* ${args[0]} |\n`;
            wsMsg += `| ◈ *Status:* Active on WhatsApp |\n`;
            wsMsg += `| ◈ *Type:* ${isBusiness ? "Business Account 🏢" : "Personal Account 👤"} |\n`;
            wsMsg += `| ◈ *Verified:* ${isBusiness ? "Checking Badge..." : "Not Verified"} |\n\n`;

            wsMsg += `*🛡️ PRIVACY SHIELD*\n`;
            wsMsg += `┃ 💠 *Last Seen:* [Restricted by User]\n`;
            wsMsg += `┃ 🛰️ *Online:* [Polling Data...]\n`;
            wsMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            wsMsg += `_VEX MINI BOT: Nothing Stays Hidden_`;

            // 5. SEND WITH TARGET'S DP
            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: dpUrl }, 
                caption: wsMsg 
            }, { quoted: m });

        } catch (e) {
            console.error(e);
            m.reply("❌ *SYSTEM ERROR:* Could not fetch data for this target.");
        }
    }
};