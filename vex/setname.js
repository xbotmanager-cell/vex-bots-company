// VEX MINI BOT - VEX: setname
// Nova: Updates the WhatsApp Push Name (Username) of the host.
// Dev: Lupin Starnley

module.exports = {
    vex: 'setname',
    cyro: 'profile',
    nova: 'Updates your WhatsApp profile name (username) directly via bot.',

    async execute(m, sock) {
        // 1. SECURITY CHECK: Host Only
        if (!m.fromMe) {
            return m.reply("⚠️ *ACCESS DENIED:* Only the Host can change their system username.");
        }

        const args = m.text.trim().split(/ +/).slice(1);
        const newName = args.join(' ');

        // 2. INPUT VALIDATION
        if (!newName) {
            return m.reply("❌ *ERROR:* Please provide a new name.\nExample: `.setname Lupin Vex` ");
        }

        if (newName.length > 25) {
            return m.reply("⚠️ *LIMIT REACHED:* WhatsApp names cannot exceed 25 characters.");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "✍️", key: m.key } });

        try {
            // 3. UPDATING THE USERNAME
            // Kwa Baileys, tunatumia updateProfileName
            await sock.updateProfileName(newName);

            // 4. CONSTRUCTING THE SUCCESS REPORT
            let nameMsg = `╭━━━〔 ✍️ *VEX: NAME-UPDATER* 〕━━━╮\n`;
            nameMsg += `┃ 🌟 *Status:* Username Updated\n`;
            nameMsg += `┃ 👤 *Owner:* Verified Host\n`;
            nameMsg += `┃ 🧬 *Engine:* Identity-Sync V1\n`;
            nameMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            nameMsg += `*📂 SYSTEM UPDATE*\n`;
            nameMsg += `| ◈ *New Name:* ${newName} |\n`;
            nameMsg += `| ◈ *Result:* Applied Successfully |\n\n`;

            nameMsg += `*🛡️ ANALYTICS*\n`;
            nameMsg += `┃ 💠 Your profile identity has changed.\n`;
            nameMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            nameMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            nameMsg += `_VEX MINI BOT: Redefining Presence_`;

            await sock.sendMessage(m.key.remoteJid, { text: nameMsg }, { quoted: m });

        } catch (e) {
            console.error("SetName Error:", e);
            m.reply("❌ *UPDATE FAIL:* The server rejected the name change. Try again later.");
        }
    }
};