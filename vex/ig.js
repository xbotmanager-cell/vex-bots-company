// VEX MINI BOT - VEX: ig
// Nova: Extracts Instagram Reels, Videos, and Photos via link or reply.
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'ig',
    cyro: 'download',
    nova: 'Downloads Instagram media (Reels/Photos) in HD.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        let url = m.quoted ? (m.quoted.text.match(/https?:\/\/(www\.)?instagram\.com\/[^\s]+/gi)?.[0]) : (args[0]);

        if (!url) return m.reply("❌ *USAGE:* Reply to an IG link with `.ig` or type `.ig [link]`");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "📸", key: m.key } });

        try {
            // VEX INTERFACE: Using a high-speed IG Scraper API
            const res = await axios.get(`https://api.v-node.cyou/api/igdl?url=${url}`);
            const data = res.data.result; // Hii inategemea muundo wa API unayotumia

            if (!data || data.length === 0) return m.reply("🚫 *ERROR:* Media node is private or link is invalid.");

            let igMsg = `╭━━━〔 📸 *VEX: INSTAGRAM-DL* 〕━━━╮\n`;
            igMsg += `┃ 🌟 *Status:* Media Found\n`;
            igMsg += `┃ 🧬 *Node:* Secure Extraction\n`;
            igMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            igMsg += `_VEX MINI BOT: Vision Beyond Limits_`;

            await m.reply(igMsg);

            // Kutuma media (Inaweza kuwa picha au video)
            for (let item of data) {
                if (item.url.includes('.mp4')) {
                    await sock.sendMessage(m.chat, { video: { url: item.url }, caption: "✅ *VEX:* IG Video Extracted" }, { quoted: m });
                } else {
                    await sock.sendMessage(m.chat, { image: { url: item.url }, caption: "✅ *VEX:* IG Photo Extracted" }, { quoted: m });
                }
            }

        } catch (e) {
            m.reply("❌ *EXTRACTION FAIL:* Instagram server-side block. Try another link.");
        }
    }
};