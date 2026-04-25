// VEX MINI BOT - VEX: scan
// Nova: Performs information gathering on IP addresses or domains.
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'scan',
    cyro: 'hacks',
    nova: 'Gathers intelligence on a domain or IP address.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        const target = args[0];

        if (!target) return m.reply("❌ *USAGE:* `.scan [IP or Domain]`");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔍", key: m.key } });

        try {
            const res = await axios.get(`http://ip-api.com/json/${target}?fields=status,message,country,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);
            const data = res.data;

            if (data.status === 'fail') return m.reply(`❌ *SCAN FAIL:* ${data.message}`);

            let scanMsg = `╭━━━〔 🔍 *VEX: INTEL-SCAN* 〕━━━╮\n`;
            scanMsg += `┃ 🌟 *Target:* ${data.query}\n`;
            scanMsg += `┃ 🌍 *Location:* ${data.city}, ${data.country}\n`;
            scanMsg += `┃ 🛰️ *ISP:* ${data.isp}\n`;
            scanMsg += `┃ 🧬 *ASN:* ${data.as}\n`;
            scanMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            scanMsg += `*📊 GEOGRAPHIC DATA:*\n`;
            scanMsg += `> Lat/Lon: ${data.lat}, ${data.lon}\n`;
            scanMsg += `> Timezone: ${data.timezone}\n`;
            scanMsg += `> Org: ${data.org || 'N/A'}\n\n`;

            scanMsg += `_VEX MINI BOT: Intelligence Acquired._`;

            await sock.sendMessage(m.chat, { text: scanMsg }, { quoted: m });
        } catch (e) {
            m.reply("❌ *SCAN ERROR:* Could not reach intelligence servers.");
        }
    }
};