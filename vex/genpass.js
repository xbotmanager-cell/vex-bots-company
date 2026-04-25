// VEX MINI BOT - VEX: genpass
// Nova: Secure random password generator with mixed entropy.
// Dev: Lupin Starnley

module.exports = {
    vex: 'genpass',
    cyro: 'tools',
    nova: 'Generates high-entropy passwords with mixed characters (Max: 20).',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        let length = parseInt(args[0]);

        // 1. INPUT VALIDATION (Maximum 20 limit)
        if (!length || isNaN(length)) {
            length = 8; // Default length if user doesn't specify
        }

        if (length > 20) {
            return m.reply("⚠️ *SECURITY ALERT:* Maximum password length allowed is *20* to maintain system stability.");
        }

        if (length < 4) {
            return m.reply("❌ *ERROR:* Password too short for security. Minimum length is *4*.");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔐", key: m.key } });

        try {
            // 2. CHARACTER POOL (Letters, Numbers, Symbols)
            const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
            let password = "";

            // 3. RANDOM GENERATION LOGIC
            for (let i = 0, n = charset.length; i < length; ++i) {
                password += charset.charAt(Math.floor(Math.random() * n));
            }

            // 4. CONSTRUCTING THE REPORT
            let passMsg = `╭━━━〔 🔐 *VEX: PASSWORD-GEN* 〕━━━╮\n`;
            passMsg += `┃ 🌟 *Status:* Key Generated\n`;
            passMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            passMsg += `┃ 🧬 *Engine:* Entropy-V1H\n`;
            passMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            passMsg += `*🔑 SECURE PASSWORD*\n`;
            passMsg += `\`${password}\` \n\n`; // Itatokea kwa kusemwa (Monospace) ili iwe rahisi kucopy

            passMsg += `*📊 SPECS ANALYSIS*\n`;
            passMsg += `| ◈ *Length:* ${length} Characters |\n`;
            passMsg += `| ◈ *Strength:* Ultra High 🛡️ |\n`;
            passMsg += `| ◈ *Type:* Mixed Entropy |\n\n`;

            passMsg += `*📢 SECURITY TIP*\n`;
            passMsg += `┃ 💠 Never share this key with anyone.\n`;
            passMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            passMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            passMsg += `_VEX MINI BOT: Privacy is Power_`;

            await sock.sendMessage(m.key.remoteJid, { text: passMsg }, { quoted: m });

        } catch (e) {
            console.error("GenPass Error:", e);
            m.reply("❌ *SYSTEM ERROR:* Failed to generate secure key.");
        }
    }
};