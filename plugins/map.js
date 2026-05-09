const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Style reactions
const STYLE_REACTS = {
    harsh: "🗺️",
    normal: "🌍",
    girl: "🎀"
};

module.exports = {
    command: "map",
    alias: ["city"],
    category: "education",
    description: "VEX AI Geo Pro - Complete country/city data with flag & neighbors",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'harsh';
        const query = args.join(' ').trim();

        // 1. REACT IMMEDIATELY
        await sock.sendMessage(m.chat, { react: { text: STYLE_REACTS[style], key: m.key } });

        if (!query) {
            return m.reply(getHelpText(style));
        }

        if (!GROQ_API_KEY) {
            return m.reply(`❌ *VEX AI ERROR*\n\nGROQ_API_KEY required for geo database.\n\n_Powered by VEX AI - Lupin Starnley_`);
        }

        try {
            // 2. AI GEO LOOKUP
            const result = await getGeoDataWithAI(query, style);

            // 3. SEND RESULT
            const output = formatGeoData(style, result);
            await sock.sendMessage(m.chat, { text: output }, { quoted: m });

        } catch (error) {
            await m.reply(`❌ *VEX AI GEO ERROR*\n\n${error.message}\n\n*Try:*\n.map Tanzania\n.map Paris\n.map Tokyo\n.map Dar es Salaam\n\n_Powered by VEX AI - Lupin Starnley_`);
        }
    }
};

// =========================
// AI GEO ENGINE
// =========================

async function getGeoDataWithAI(location, style) {
    const stylePrompts = {
        harsh: "Be brutal, direct, factual. Focus on critical data for exams. No fluff.",
        normal: "Clear, educational, comprehensive. Suitable for geography homework.",
        girl: "Make it cute and easy to remember~ Use emojis and soft tone~"
    };

    const prompt = `You are VEX AI, a world geography expert created by Lupin Starnley.

User wants info about: "${location}"
Style: ${stylePrompts[style]}

Determine if this is a COUNTRY or CITY/TOWN. Provide complete data.

Return ONLY valid JSON:

{
  "type": "country" or "city",
  "name": "Official name",
  "localName": "Local language name if different",
  "capital": "Capital city (if country)",
  "country": "Country name (if city)",
  "continent": "Africa/Asia/Europe/North America/South America/Oceania/Antarctica",
  "population": "Number with commas + year (e.g., 61,498,437 (2024))",
  "area": "Total area with km² and mi²",
  "density": "Population density",
  "coordinates": "Latitude, Longitude",
  "timezone": "UTC offset and name (e.g., UTC+3 EAT)",
  "currency": "Currency name and code (e.g., Tanzanian Shilling TZS)",
  "languages": ["Official languages"],
  "neighbors": ["Bordering countries/cities"],
  "flagDescription": "Detailed description of flag colors and symbols",
  "gdp": "GDP total and per capita (if country)",
  "callingCode": "+255 (if country)",
  "internetTLD": ".tz (if country)",
  "government": "Government type (if country)",
  "famousLandmarks": ["3-5 famous places"],
  "climate": "Brief climate description",
  "economy": "Main industries (if country)",
  "funFacts": ["2-3 interesting facts"],
  "mapDescription": "Geographic location description"
}

If location not found, return closest match or error. Be accurate with 2024-2026 data.`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 2000
    }, {
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    const content = response.data.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI geo data generation failed');

    return JSON.parse(jsonMatch[0]);
}

// =========================
// FORMATTER
// =========================

function formatGeoData(style, data) {
    const modes = {
        harsh: {
            title: "☣️ 𝖁𝕰𝖃 𝕬𝕴 𝕲𝕰𝕺 𝕯𝕬𝕿𝕬𝕭𝕬𝕾𝕰 ☣️",
            line: "━"
        },
        normal: {
            title: "🌍 VEX AI GEO PRO 🌍",
            line: "─"
        },
        girl: {
            title: "🫧 𝒱𝑒𝓍 𝒜𝐼 𝒢𝑒𝑜 𝒟𝐵 🫧",
            line: "┄"
        }
    };

    const current = modes[style];
    const isCountry = data.type === 'country';

    let output = `*${current.title}*\n${current.line.repeat(32)}\n\n`;

    // Header
    output += `📍 *LOCATION:* ${data.name}\n`;
    if (data.localName && data.localName!== data.name) {
        output += `🏷️ *Local Name:* ${data.localName}\n`;
    }
    output += `🌍 *Type:* ${data.type.toUpperCase()}\n`;
    output += `🗺️ *Continent:* ${data.continent}\n\n`;

    // Key Stats
    output += `*KEY STATISTICS:*\n`;
    if (isCountry) {
        output += `🏛️ *Capital:* ${data.capital}\n`;
    } else {
        output += `🏙️ *Country:* ${data.country}\n`;
    }
    output += `👥 *Population:* ${data.population}\n`;
    output += `📏 *Area:* ${data.area}\n`;
    output += `📊 *Density:* ${data.density}\n`;
    output += `📍 *Coordinates:* ${data.coordinates}\n`;
    output += `🕐 *Timezone:* ${data.timezone}\n\n`;

    // Government & Economy
    if (isCountry) {
        output += `*GOVERNMENT & ECONOMY:*\n`;
        output += `🏛️ *Government:* ${data.government}\n`;
        output += `💰 *Currency:* ${data.currency}\n`;
        output += `💵 *GDP:* ${data.gdp}\n`;
        output += `📞 *Calling Code:* ${data.callingCode}\n`;
        output += `🌐 *Internet TLD:* ${data.internetTLD}\n\n`;
    } else {
        output += `*DETAILS:*\n`;
        output += `💰 *Currency:* ${data.currency}\n\n`;
    }

    // Languages
    output += `*LANGUAGES:* ${data.languages.join(', ')}\n\n`;

    // Neighbors
    if (data.neighbors && data.neighbors.length > 0) {
        output += `*NEIGHBORS:*\n${data.neighbors.join(', ')}\n\n`;
    }

    // Flag
    output += `*FLAG DESCRIPTION:*\n${data.flagDescription}\n\n`;

    // Climate
    output += `*CLIMATE:* ${data.climate}\n\n`;

    // Economy
    if (isCountry && data.economy) {
        output += `*ECONOMY:* ${data.economy}\n\n`;
    }

    // Landmarks
    if (data.famousLandmarks && data.famousLandmarks.length > 0) {
        output += `*FAMOUS LANDMARKS:*\n`;
        data.famousLandmarks.forEach((landmark, i) => {
            output += `${i + 1}. ${landmark}\n`;
        });
        output += `\n`;
    }

    // Map Description
    output += `*GEOGRAPHIC LOCATION:*\n${data.mapDescription}\n\n`;

    // Fun Facts
    if (data.funFacts && data.funFacts.length > 0) {
        output += `*💡 FUN FACTS:*\n`;
        data.funFacts.forEach(fact => output += `• ${fact}\n`);
        output += `\n`;
    }

    output += `${current.line.repeat(32)}\n_VEX AI by Lupin Starnley_`;

    return output;
}

function getHelpText(style) {
    return `🌍 *VEX AI GEO PRO*\n\n*Usage:*\n.map Tanzania\n.map Paris\n.map Tokyo\n.map Dar es Salaam\n.map New York\n.geo Kenya\n\n*Features:*\n✅ Countries & Cities worldwide\n✅ Capital, Population, Area\n✅ Currency, Language, Timezone\n✅ Neighbors & Flag Description\n✅ GDP, Government, Economy\n✅ Famous Landmarks\n✅ Coordinates & Climate\n✅ Fun Facts\n\n*Examples:*\n.map United States\n.map London\n.map Kilimanjaro\n.map Zanzibar\n\n_Powered by VEX AI - Created by Lupin Starnley_`;
}
