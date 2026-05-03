// ================= LUPER-MD COUNTRY INTELLIGENCE =================
const axios = require('axios');
const translate = require('google-translate-api-x');

module.exports = {
    command: "country",
    alias: ["nchi", "nation", "geo"],
    category: "world",
    description: "Get detailed intelligence about any country",

    async execute(m, sock, { args, userSettings, lang, prefix }) {
        // 1. CONFIG & STYLE SYNC
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';
        const countryName = args.join(' ');

        // 2. STYLES DEFINITION
        const modes = {
            harsh: {
                title: "☣️ 𝕲𝕰𝕺𝕻𝕺𝕷𝕴𝕿𝕴𝕮𝕬𝕷 𝕾𝖀𝕽𝖁𝕰𝕴𝕷𝕷𝕬𝕹𝕮𝕰 ☣️",
                line: "━",
                wait: "⏳ 𝕰𝖝𝖙𝖗𝖆𝖈𝖙𝖎𝖓𝖌 𝖓𝖆𝖙𝖎𝖔𝖓𝖆𝖑 𝖉𝖆𝖙𝖆𝖇𝖆𝖘𝖊...",
                invalid: `❌ 𝕴𝖓𝖛𝖆𝖑𝖎𝖉 𝖙𝖆𝖗𝖌𝖊𝖙. 𝖀𝖘𝖊: ${prefix}𝖈𝖔𝖚𝖓𝖙𝖗𝖞 [𝖓𝖆𝖒𝖊]`,
                react: "🌍"
            },
            normal: {
                title: "🌍 VEX COUNTRY INTEL 🌍",
                line: "─",
                wait: "⏳ Fetching country profile...",
                invalid: `❓ Please provide a country name! Example: ${prefix}country Tanzania`,
                react: "🌍"
            },
            girl: {
                title: "🫧 𝒲𝑜𝓇𝓁𝒹 𝒯𝓇𝒶𝓋𝑒𝓁 𝒫𝓇𝒾𝓃𝒸𝑒𝓈𝓈 🫧",
                line: "┄",
                wait: "🫧 𝓁𝑒𝓉 𝓂𝑒 𝒻𝒾𝓃𝒹 𝑜𝓊𝓉 𝒶𝒷𝑜𝓊𝓉 𝓉𝒽𝒾𝓈 𝓅𝓁𝒶𝒸𝑒~ 🫧",
                invalid: `🫧 𝓌𝒽𝒾𝒸𝒽 𝒸𝑜𝓊𝓃𝓉𝓇𝓎 𝒶𝓇𝑒 𝓌𝑒 𝓁𝑜𝑜𝓀𝒾𝓃𝑔 𝒻𝑜𝓇, 𝒹𝑒𝒶𝓇? 🫧`,
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        if (!countryName) return m.reply(current.invalid);

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 3. FETCH DATA (RestCountries API)
            const response = await axios.get(`https://restcountries.com/v3.1/name/${countryName}`);
            const data = response.data[0];

            // 4. DATA EXTRACTION (As requested)
            const name = data.name.common;
            const officialName = data.name.official;
            const capital = data.capital ? data.capital[0] : 'N/A';
            const region = data.region;
            const subregion = data.subregion;
            const population = data.population.toLocaleString();
            const flag = data.flags.png;
            const languages = data.languages ? Object.values(data.languages).join(', ') : 'N/A';
            const currencies = data.currencies ? Object.values(data.currencies).map(c => `${c.name} (${c.symbol})`).join(', ') : 'N/A';
            const borders = data.borders ? data.borders.join(', ') : 'None (Island)';
            const area = data.area.toLocaleString();
            const timezones = data.timezones[0];
            const driveSide = data.car.side;
            const callingCode = data.idd.root + (data.idd.suffixes ? data.idd.suffixes[0] : '');
            const googleMaps = data.maps.googleMaps;

            // 5. BUILD THE INTELLIGENCE REPORT
            let report = `*${current.title}*\n${current.line.repeat(15)}\n\n`;
            report += `📊 *Official Name:* ${officialName}\n`;
            report += `🏛️ *Capital:* ${capital}\n`;
            report += `👥 *Population:* ${population}\n`;
            report += `🗺️ *Region:* ${region} (${subregion})\n`;
            report += `📐 *Area:* ${area} km²\n`;
            report += `🗣️ *Languages:* ${languages}\n`;
            report += `💰 *Currency:* ${currencies}\n`;
            report += `🚧 *Borders:* ${borders}\n`;
            report += `🕒 *Timezone:* ${timezones}\n`;
            report += `🚗 *Driving Side:* ${driveSide.toUpperCase()}\n`;
            report += `📞 *Calling Code:* ${callingCode}\n\n`;
            report += `📍 *Google Maps:* ${googleMaps}\n\n`;
            report += `${current.line.repeat(15)}\n_VEX Intelligence - Lupin Edition_`;

            // 6. TRANSLATE & SEND WITH FLAG
            const { text: translatedReport } = await translate(report, { to: targetLang });
            
            await sock.sendMessage(m.chat, { 
                image: { url: flag }, 
                caption: translatedReport 
            }, { quoted: m });

        } catch (error) {
            console.error("COUNTRY ERROR:", error);
            await m.reply("☣️ Data extraction failed. Target country not found in the global grid.");
        }
    }
};
