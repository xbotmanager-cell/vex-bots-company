// ================= LUPER-MD IP SURVEILLANCE =================
const axios = require('axios');
const translate = require('google-translate-api-x');

module.exports = {
    command: "ipcheck",
    alias: ["ipinfo", "lookup", "trackip"],
    category: "tools",
    description: "Gather technical intelligence about an IP or Domain",

    async execute(m, sock, { args, userSettings, lang, prefix }) {
        // 1. CONFIG & STYLE SYNC
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';
        
        // 2. TARGET DETECTION (Direct IP or Domain)
        let target = args[0] || (m.quoted ? m.quoted.text : null);
        if (!target) return m.reply(`☣️ Provide an IP or Domain!\nExample: ${prefix}ipcheck 8.8.8.8`);

        // Safisha input (Ondoa http/https kama ameweka domain)
        target = target.replace(/^(https?:\/\/)/, "").split('/')[0];

        // 3. STYLES DEFINITION
        const modes = {
            harsh: {
                title: "☣️ 𝕹𝕰𝕿𝖂𝕺𝕽𝕶 𝕴𝕹𝕿𝕰𝕷𝕷𝕴𝕲𝕰𝕽𝕮𝕰 ☣️",
                line: "━",
                wait: "⏳ 𝕰𝖝𝖙𝖗𝖆𝖈𝖙𝖎𝖓𝖌 𝖉𝖆𝖙𝖆 𝖕𝖆𝖈𝖐𝖊𝖙𝖘...",
                done: "📡 𝕿𝖆𝖗𝖌𝖊𝖙 𝖑𝖔𝖈𝖆𝖙𝖊𝖉 𝖎𝖓 𝖙𝖍𝖊 𝖌𝖗𝖎𝖉.",
                react: "📡"
            },
            normal: {
                title: "🌐 VEX IP LOOKUP 🌐",
                line: "─",
                wait: "⏳ Fetching network information...",
                done: "✅ Trace complete.",
                react: "🌐"
            },
            girl: {
                title: "🫧 𝐼𝒫 𝒯𝓇𝒶𝒸𝓀𝑒𝓇 𝒫𝓇𝒾𝓃𝒸𝑒𝓈𝓈 🫧",
                line: "┄",
                wait: "🫧 𝓁𝑜𝑜𝓀𝒾𝓃𝑔 𝓊𝓅 𝓉𝒽𝑒 𝒶𝒹𝒹𝓇𝑒𝓈𝓈 𝒻𝑜𝓇 𝓎𝑜𝓊~ 🫧",
                done: "🌸 𝒻𝑜𝓊𝓃𝒹 𝒾𝓉, 𝒹𝑒𝒶𝓇! 🌸",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 4. PREPARE INITIAL STATUS
            const { text: translatedWait } = await translate(`*${current.title}*\n${current.line.repeat(15)}\n\n${current.wait}`, { to: targetLang });
            await m.reply(translatedWait);

            // 5. FETCH DATA (Using IP-API)
            const { data } = await axios.get(`http://ip-api.com/json/${target}?fields=status,message,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,query`);

            if (data.status !== 'success') throw new Error(data.message);

            // 6. BUILD INTEL REPORT
            let report = `*${current.title}*\n${current.line.repeat(15)}\n`;
            report += `📍 *IP:* ${data.query}\n`;
            report += `🌍 *Country:* ${data.country} (${data.countryCode})\n`;
            report += `🏙️ *City:* ${data.city}\n`;
            report += `📡 *ISP:* ${data.isp}\n`;
            report += `🏢 *Org:* ${data.org || 'N/A'}\n`;
            report += `⏰ *Timezone:* ${data.timezone}\n`;
            report += `🗺️ *Coords:* ${data.lat}, ${data.lon}\n`;
            report += `${current.line.repeat(15)}\n_${current.done}_`;

            // 7. TRANSLATE & SEND
            const { text: translatedReport } = await translate(report, { to: targetLang });
            
            // Tuma pia link ya Google Maps kwa ajili ya location halisi
            const mapLink = `\n\n📍 *Maps:* https://www.google.com/maps?q=${data.lat},${data.lon}`;
            
            await m.reply(translatedReport + mapLink);

        } catch (error) {
            console.error("IPCHECK ERROR:", error);
            await m.reply("☣️ Trace Failed. The host is ghosting the network or using a high-level proxy.");
        }
    }
};
