// VEX MINI BOT - VEX: fb
// Nova: Extracts Facebook videos in HD/SD via link or reply.
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'fb',
    cyro: 'download',
    nova: 'Downloads Facebook videos in high quality.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        let url = m.quoted ? (m.quoted.text.match(/https?:\/\/(www\.)?(facebook\.com|fb\.watch)\/[^\s]+/gi)?.[0]) : (args[0]);

        if (!url) return m.reply("❌ *USAGE:* Reply to a FB link with `.fb` or type `.fb [link]`");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔵", key: m.key } });

        try {
            const res = await axios.get(`https://api.v-node.cyou/api/fbdl?url=${url}`);
            const data = res.data.result;

            if (!data) return m.reply("🚫 *ERROR:* Failed to parse Facebook media node.");

            // Kuchagua quality bora zaidi (HD)
            const videoUrl = data.hd || data.sd;

            let fbMsg = `╭━━━〔 🔵 *VEX: FACEBOOK-DL* 〕━━━╮\n`;
            fbMsg += `┃ 🌟 *Status:* Video Decrypted\n`;
            fbMsg += `┃ 🧬 *Quality:* ${data.hd ? 'High Definition (HD)' : 'Standard (SD)'}\n`;
            fbMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            fbMsg += `_VEX MINI BOT: Privacy is Power_`;

            await m.reply(fbMsg);

            await sock.sendMessage(m.chat, { 
                video: { url: videoUrl }, 
                caption: `✅ *VEX:* FB Media successfully synchronized.` 
            }, { quoted: m });

        } catch (e) {
            m.reply("❌ *EXTRACTION FAIL:* Video might be private or deleted.");
        }
    }
};