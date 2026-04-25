// VEX MINI BOT - VEX: tt
// Nova: Extracts TikTok videos without watermark via link or reply.
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'tt',
    cyro: 'download',
    nova: 'Downloads TikTok videos without watermark.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        // SMART DETECTION: Priority 1: Quoted Link | Priority 2: Text Link
        let url = m.quoted ? (m.quoted.text.match(/https?:\/\/[^\s]+/gi)?.[0]) : (args[0]);

        if (!url || !url.includes('tiktok.com')) {
            return m.reply("❌ *USAGE:* Reply to a TikTok link with `.tt` or type `.tt [link]`");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "📥", key: m.key } });

        try {
            // VEX API NODE: Tunatumia API ya kijasusi kuvuta video bila watermark
            const res = await axios.get(`https://api.tiklydown.eu.org/api/download?url=${url}`);
            const data = res.data;

            if (!data || !data.video) {
                return m.reply("🚫 *ERROR:* Media node not found. Ensure the link is valid.");
            }

            let ttMsg = `╭━━━〔 📥 *VEX: TIKTOK-DL* 〕━━━╮\n`;
            ttMsg += `┃ 👤 *Author:* ${data.author.unique_id || 'Unknown'}\n`;
            ttMsg += `┃ 📝 *Desc:* ${data.title || 'No Caption'}\n`;
            ttMsg += `┃ 🧬 *Status:* HD No-Watermark\n`;
            ttMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            ttMsg += `_VEX MINI BOT: Media Synchronized_`;

            // 1. Tuma kwanza taarifa za video (Metadata)
            await m.reply(ttMsg);

            // 2. Tuma Video yenyewe ambayo haina Watermark
            await sock.sendMessage(m.chat, { 
                video: { url: data.video.noWatermark }, 
                caption: `✅ *VEX:* TikTok media successfully extracted for Node @${m.sender.split('@')[0]}`,
                mentions: [m.sender]
            }, { quoted: m });

        } catch (e) {
            m.reply("❌ *EXTRACTION FAIL:* TikTok security updated or link expired. Try again.");
        }
    }
};