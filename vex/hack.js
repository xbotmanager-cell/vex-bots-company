// VEX MINI BOT - VEX: hack
// Nova: Game Protocol Neutralization & Mod Distribution
// Dev: Lupin Starnley (VEX Creator)

module.exports = {
    vex: 'hack',
    cyro: 'exploit',
    nova: 'Provides advanced game modification protocols and MOD links for DLS and eFootball.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        const game = args[0]?.toLowerCase();

        if (!game) {
            return m.reply("⚠️ *VEX EXPLOIT:* Target game required.\nUsage: `.hack dls` or `.hack efootball` ");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "⚡", key: m.key } });

        let hackMsg = "";
        let targetImg = "";

        switch (game) {
            case 'dls':
            case 'dls24':
                targetImg = "https://telegra.ph/file/af55d8f3ec608d4888be6.jpg"; // Weka link ya picha ya DLS hapa
                hackMsg = `╭━━━〔 ⚡ *VEX: DLS-EXPLOIT* 〕━━━╮\n` +
                          `┃ 🌟 *Status:* Payload Ready\n` +
                          `┃ 👤 *Master:* Lupin Starnley\n` +
                          `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                          `*🎮 GAME:* Dream League Soccer\n` +
                          `*🔓 FEATURES UNLOCKED:* \n` +
                          `| ◈ *Unlimited Coins/Diamonds*\n` +
                          `| ◈ *Stupid AI (Easy Win)*\n` +
                          `| ◈ *Unlocked All Players*\n\n` +
                          `*🛠️ INSTALLATION STEPS:*\n` +
                          `*1.* 🗑️ Uninstall the original DLS app from PlayStore.\n` +
                          `*2.* 📥 Download the VEX-MOD APK from the link below.\n` +
                          `*3.* ⚙️ Enable 'Unknown Sources' in your Android settings.\n` +
                          `*4.* 🚀 Install the APK and enjoy infinite resources.\n\n` +
                          `*🔗 DOWNLOAD LINK:* \n` +
                          `┃ 🛰️ https://an1.com/6446-dream-league-soccer-2024-mod.html\n` +
                          `╰━━━━━━━━━━━━━━━━━━━━╯\n` +
                          `_VEX: Beyond Limits_`;
                break;

            case 'efootball':
            case 'pes':
                targetImg = "https://telegra.ph/file/af55d8f3ec608d4888be6.jpg"; // Weka link ya picha ya eFootball hapa
                hackMsg = `╭━━━〔 ⚡ *VEX: EF-EXPLOIT* 〕━━━╮\n` +
                          `┃ 🌟 *Status:* Injection Successful\n` +
                          `┃ 👤 *Master:* Lupin Starnley\n` +
                          `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                          `*🎮 GAME:* eFootball 2024\n` +
                          `*🔓 FEATURES UNLOCKED:* \n` +
                          `| ◈ *Unlimited MyClub Coins*\n` +
                          `| ◈ *Legendary Players Unlocked*\n` +
                          `| ◈ *No-Lag / High Damage*\n\n` +
                          `*🛠️ INSTALLATION STEPS:*\n` +
                          `*1.* 📦 Extract the OBB data to 'Android/obb/com.konami.pes'.\n` +
                          `*2.* 📥 Install the VEX-Engine MOD APK.\n` +
                          `*3.* 🛠️ Use a VPN to bypass regional server checks.\n` +
                          `*4.* ⚽ Log in and synchronize your tactical data.\n\n` +
                          `*🔗 DOWNLOAD LINK:* \n` +
                          `┃ 🛰️ https://modyolo.com/efootball-pes-2021.html\n` +
                          `╰━━━━━━━━━━━━━━━━━━━━╯\n` +
                          `_VEX: The Digital Ghost_`;
                break;

            default:
                return m.reply("❌ *VEX-ERROR:* Game not found in exploit database. Try `dls` or `efootball`.");
        }

        // SEND THE EXPLOIT REPORT
        await sock.sendMessage(m.key.remoteJid, { 
            image: { url: targetImg }, 
            caption: hackMsg 
        }, { quoted: m });
    }
};
