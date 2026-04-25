// VEX MINI BOT - VEX: phish (LIVE NODE)
// Nova: Generates LIVE phishing links synced to your data panel.
// Dev: Lupin Starnley

module.exports = {
    vex: 'phish',
    cyro: 'hacks',
    nova: 'Generates real-time phishing links synced to your host node.',

    async execute(m, sock) {
        // SECURITY: Ni Host tu (Namba yako) ndio anaweza kutoa link hizi za hatari
        if (!m.fromMe) return m.reply("⚠️ *RESTRICTED:* Only the Master Host can generate live phishing nodes.");

        const args = m.text.trim().split(/ +/).slice(1);
        const platform = args[0]?.toLowerCase();

        if (!platform) return m.reply("❌ *USAGE:* `.phish [fb/ig/netflix]`");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "💀", key: m.key } });

        // LINK ZAKO ZA UKWELI (Zitengeneze na uziweke hapa)
        // Mfano: https://lupin-fb-panel.glitch.me
        const liveLinks = {
            fb: "https://your-fb-phish-live.com",
            ig: "https://your-ig-phish-live.com",
            netflix: "https://your-netflix-phish-live.com"
        };

        const link = liveLinks[platform] || "https://secure-login-v.net";

        let phishMsg = `╭━━━〔 💀 *VEX: LIVE-PHISH* 〕━━━╮\n`;
        phishMsg += `┃ 🌟 *Target:* ${platform.toUpperCase()}\n`;
        phishMsg += `┃ 📡 *Node:* Live Extraction Active\n`;
        phishMsg += `┃ 🔒 *Sync:* WhatsApp Channel V1\n`;
        phishMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        phishMsg += `*🛰️ TARGET DEPLOYMENT LINK:*\n`;
        phishMsg += `> ${link}\n\n`;

        phishMsg += `*🛠️ OPERATIONAL PROTOCOL:*\n`;
        phishMsg += `┃ 1. Deliver link to target via Social Engineering.\n`;
        phishMsg += `┃ 2. Captured credentials will be transmitted to your Channel.\n`;
        phishMsg += `┃ 3. Use VPN for all command operations.\n\n`;

        phishMsg += `_VEX MINI BOT: No System is Safe_`;

        await sock.sendMessage(m.chat, { text: phishMsg }, { quoted: m });
    }
};