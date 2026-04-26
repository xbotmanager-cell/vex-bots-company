// VEX MINI BOT - VEX: setpp (Multi-Device Logic)
// Nova: Identity updater for public/private bot instances.
// Dev: Lupin Starnley

module.exports = {
    vex: 'setpp',
    cyro: 'profile',
    nova: 'Updates the bot’s profile picture for the bot owner only.',

    async execute(m, sock) {
        // 1. OWNER SECURITY CHECK
        // Tunakagua kama ni namba ya mmiliki (Owner) ndio imetuma amri
        if (!m.fromMe) {
            let redirectMsg = `⚠️ *ACCESS DENIED*\n\n`;
            redirectMsg += `You are not the owner of this VEX instance. You cannot change my identity.\n\n`;
            redirectMsg += `🚀 *Want your own bot?* Deploy it here:\n`;
            redirectMsg += `👉 https://vex-mini-bot-epxc.onrender.com\n\n`; 
            redirectMsg += `_VEX MINI BOT: Vision Beyond Limits_`;
            
            return m.reply(redirectMsg);
        }

        // 2. IMAGE DETECTION
        const quoted = m.quoted ? m.quoted : m;
        const mime = (quoted.msg || quoted).mimetype || '';

        if (!/image/.test(mime)) {
            return m.reply("❌ *ERROR:* Please quote an image with `.setpp` to update the profile picture.");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🎭", key: m.key } });

        try {
            // 3. DOWNLOAD & DEPLOY IDENTITY
            const buffer = await quoted.download();
            
            // Tunahakikisha tunatumia jid ya bot yenyewe (sock.user.id)
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            await sock.updateProfilePicture(botId, buffer);

            // 4. SUCCESS REPORT
            let setMsg = `╭━━━〔 🎭 *VEX: IDENTITY-SET* 〕━━━╮\n`;
            setMsg += `┃ 🌟 *Status:* Identity Updated\n`;
            setMsg += `┃ 👤 *Owner:* Verified Host\n`;
            setMsg += `┃ 🧬 *Engine:* Profile-Sync V2\n`;
            setMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            setMsg += `_VEX MINI BOT: Identity successfully deployed._`;

            await sock.sendMessage(m.key.remoteJid, { text: setMsg }, { quoted: m });

        } catch (e) {
            console.error("SetPP Error:", e);
            m.reply("❌ *UPDATE FAIL:* The server rejected the new identity. Ensure the image is not too large.");
        }
    }
};
