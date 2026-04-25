// VEX MINI BOT - VEX: gcpp (Smart Perms)
// Nova: Updates Group DP based on group permissions or admin status.
// Dev: Lupin Starnley

module.exports = {
    vex: 'gcpp',
    cyro: 'group',
    nova: 'Updates group DP if permitted by settings or if bot is admin.',

    async execute(m, sock) {
        if (!m.isGroup) return m.reply("❌ *SYSTEM ERROR:* Groups only.");
        
        const quoted = m.quoted ? m.quoted : m;
        const mime = (quoted.msg || quoted).mimetype || '';
        if (!/image/.test(mime)) return m.reply("❌ *ERROR:* Quote an image.");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🖼️", key: m.key } });

        try {
            // JARIBIO LA KWANZA: Badili bila kujali u-admin
            const buffer = await quoted.download();
            await sock.updateProfilePicture(m.chat, buffer);

            let gcppMsg = `╭━━━〔 🖼️ *VEX: GROUP-DP* 〕━━━╮\n`;
            gcppMsg += `┃ 🌟 *Status:* Identity Updated\n`;
            gcppMsg += `┃ 🧬 *Mode:* Permission Granted\n`;
            gcppMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n`;
            await sock.sendMessage(m.chat, { text: gcppMsg }, { quoted: m });

        } catch (e) {
            // JARIBIO LIMEGONGA UKUTA: Inahitaji U-Admin
            m.reply("⚠️ *RESTRICTED:* Group settings are set to 'Admins Only'. Please promote the bot to Admin to execute this command.");
        }
    }
};