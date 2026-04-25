// VEX MINI BOT - VEX: apk
// Nova: Repository for ethical hacking tools and modified APKs.
// Dev: Lupin Starnley

const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'apk',
    cyro: 'exploit',
    nova: 'Provides direct access to ethical hacking tools and modified applications',

    async execute(m, sock) {
        // 1. 🛠️ REACT WITH TOOLBOX
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🛠️", key: m.key } });

        const sender = m.sender;

        // 2. CONFIGURATION (Edit your link here when ready)
        const masterApkUrl = ""; // Leave empty for 'Coming Soon'
        const displayLink = masterApkUrl === "" ? "⚠️ *COMING SOON*" : masterApkUrl;

        // 3. CONSTRUCTING THE MODS MESSAGE
        let apkMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
        apkMsg += `┃ 🌟 *Status:* Repository Open\n`;
        apkMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
        apkMsg += `┃ 🧬 *Engine:* Arsenal MODS\n`;
        apkMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        apkMsg += `*🛠️ ETHICAL HACKING TOOLS*\n`;
        apkMsg += `| ◈ *Termux:* https://termux.dev/ |\n`;
        apkMsg += `| ◈ *MT Manager:* https://mt2.cn/ |\n`;
        apkMsg += `| ◈ *Lucky Patcher:* https://www.luckypatchers.com/ |\n`;
        apkMsg += `| ◈ *HTTP Canary:* https://httpcanary.com/ |\n\n`;

        apkMsg += `*🔥 MASTER APK (VEX-APK)*\n`;
        apkMsg += `| ◈ *Link:* ${displayLink} |\n\n`;

        apkMsg += `*📊 SYSTEM INFO*\n`;
        apkMsg += `┃ 💠 *Platform:* Android / Linux\n`;
        apkMsg += `┃ 🛰️ *Version:* Latest Stable\n`;
        apkMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        apkMsg += `_VEX MINI BOT: Gear Up For Success_`;

        // 4. SEND WITH VEX IMAGE
        const botImageUrl = path.join(__dirname, '../assets/images/vex.png');
        if (fs.existsSync(botImageUrl)) {
            await sock.sendMessage(m.key.remoteJid, { image: { url: botImageUrl }, caption: apkMsg, mentions: [sender] }, { quoted: m });
        } else {
            await sock.sendMessage(m.key.remoteJid, { text: apkMsg, mentions: [sender] }, { quoted: m });
        }
    }
};