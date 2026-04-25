// VEX MINI BOT - VEX: country
// Nova: Global Intelligence & Mapping Engine
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'country',
    cyro: 'tools',
    nova: 'Retrieves detailed geographical and political data of a country',

    async execute(m, sock) {
        // 1. KUPATA JINA LA NCHI (Reply au Text)
        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || "";
        const argsText = m.message?.conversation?.split(' ').slice(1).join(' ') || 
                         m.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ');
        
        const countryName = argsText || quotedText;

        if (!countryName) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Please provide a country name or reply to one!" 
            }, { quoted: m });
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🌍", key: m.key } });

        try {
            const response = await axios.get(`https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}`);
            const data = response.data[0];

            // 2. DATA EXTRACTION (Zile ulizozitaka zote)
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

            // 3. CONSTRUCTING THE REPORT (Premium English Design)
            const sender = m.sender || m.key.participant || m.key.remoteJid;
            let countryMsg = `╭━━━〔 🌍 *VEX: INTEL-MAP* 〕━━━╮\n`;
            countryMsg += `┃ 🌟 *Status:* Data Retrieved\n`;
            countryMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            countryMsg += `┃ 🧬 *Engine:* Geo-Neural V1\n`;
            countryMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            countryMsg += `*📍 GENERAL INFO*\n`;
            countryMsg += `| ◈ *Name:* ${name}\n`;
            countryMsg += `| ◈ *Official:* ${officialName}\n`;
            countryMsg += `| ◈ *Capital:* ${capital}\n`;
            countryMsg += `| ◈ *Region:* ${region} (${subregion})\n\n`;

            countryMsg += `*📊 STATISTICS*\n`;
            countryMsg += `| ◈ *Population:* ${population}\n`;
            countryMsg += `| ◈ *Area:* ${area} km²\n`;
            countryMsg += `| ◈ *Drive Side:* ${driveSide.toUpperCase()}\n`;
            countryMsg += `| ◈ *Calling Code:* ${callingCode}\n\n`;

            countryMsg += `*🗣️ CULTURE & ECONOMY*\n`;
            countryMsg += `| ◈ *Languages:* ${languages}\n`;
            countryMsg += `| ◈ *Currencies:* ${currencies}\n`;
            countryMsg += `| ◈ *Borders:* ${borders}\n\n`;

            countryMsg += `*🕒 OTHERS*\n`;
            countryMsg += `| ◈ *Timezone:* ${timezones}\n`;
            countryMsg += `| ◈ *Maps:* ${googleMaps}\n\n`;

            countryMsg += `*📢 SYSTEM NOTE*\n`;
            countryMsg += `┃ 💠 Geographical data successfully decoded.\n`;
            countryMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            countryMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            countryMsg += `_VEX MINI BOT: Global Insight_`;

            // 4. KUTUMA PICHA (FLAG) NA DATA
            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: flag }, 
                caption: countryMsg,
                mentions: [sender]
            }, { quoted: m });

        } catch (error) {
            console.error("Country Data Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Intelligence failure. Country not found in database." 
            }, { quoted: m });
        }
    }
};