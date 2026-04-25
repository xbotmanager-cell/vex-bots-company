// VEX MINI BOT - VEX: delpp
// Nova: Removes the bot’s profile picture for the host only.
// Dev: Lupin Starnley

module.exports = {
    vex: 'delpp',
    cyro: 'profile',
    nova: 'Deletes the bot’s profile picture and restores the default avatar.',

    async execute(m, sock) {
        // 1. SECURITY CHECK: Host Only (Multi-Device Logic)
        if (!m.fromMe) {
            let redirectMsg = `⚠️ *ACCESS DENIED*\n\n`;
            redirectMsg += `Only the Host can execute identity deletion on this VEX instance.\n\n`;
            redirectMsg += `🚀 *Deploy your own:* https://render.com/ \n\n`;
            redirectMsg += `_VEX MINI BOT: Vision Beyond Limits_`;
            
            return m.reply(redirectMsg);
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🗑️", key: m.key } });

        try {
            // 2. DELETE PROFILE PICTURE
            await sock.removeProfilePicture(sock.user.id);

            // 3. SUCCESS REPORT
            let delMsg = `╭━━━〔 🗑️ *VEX: IDENTITY-DEL* 〕━━━╮\n`;
            delMsg += `┃ 🌟 *Status:* Identity Erased\n`;
            delMsg += `┃ 👤 *Owner:* Verified Host\n`;
            delMsg += `┃ 🧬 *Engine:* Profile-Sync V2\n`;
            delMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            delMsg += `*📂 SYSTEM UPDATE*\n`;
            delMsg += `| ◈ *Action:* DP Removal |\n`;
            delMsg += `| ◈ *Status:* Default Avatar Restored |\n\n`;

            delMsg += `*🛡️ ANALYTICS*\n`;
            delMsg += `┃ 💠 System visual cleared.\n`;
            delMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            delMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            delMsg += `_VEX MINI BOT: Back to the Shadows_`;

            await sock.sendMessage(m.key.remoteJid, { text: delMsg }, { quoted: m });

        } catch (e) {
            console.error("DelPP Error:", e);
            m.reply("❌ *DELETE FAIL:* The matrix refused to erase the identity. Try again later.");
        }
    }
};