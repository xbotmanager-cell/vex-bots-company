// ================= LUPER-MD WEATHER SURVEILLANCE =================
const axios = require('axios');
const translate = require('google-translate-api-x');

module.exports = {
    command: "weather",
    alias: ["halihewa", "temp", "sky"],
    category: "environment",
    description: "Get real-time weather intelligence for any city",

    async execute(m, sock, { args, userSettings, lang, prefix }) {
        // 1. CONFIG & STYLE SYNC
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';
        const city = args.join(' ');

        // 2. STYLES DEFINITION
        const modes = {
            harsh: {
                title: "☣️ 𝕬𝕿𝕸𝕺𝕾𝕻𝕳𝕰𝕽𝕴𝕮 𝕾𝖀𝕽𝖁𝕰𝕴𝕷𝕷𝕬𝕹𝕮𝕰 ☣️",
                line: "━",
                wait: "⏳ 𝕾𝖈𝖆𝖓𝖓𝖎𝖓𝖌 𝖘𝖐𝖞 𝖕𝖆𝖗𝖆𝖒𝖊𝖙𝖊𝖗𝖘...",
                invalid: `❌ 𝕾𝖕𝖊𝖈𝖎𝖋𝖞 𝖆 𝖑𝖔𝖈𝖆𝖙𝖎𝖔𝖓! 𝕰𝖝: ${prefix}𝖜𝖊𝖆𝖙𝖍𝖊𝖗 𝕶𝖎𝖇𝖆𝖍𝖆`,
                react: "🌡️"
            },
            normal: {
                title: "🌤️ VEX WEATHER INTEL 🌤️",
                line: "─",
                wait: "⏳ Fetching environmental data...",
                invalid: `❓ Please provide a city! Example: ${prefix}weather Dar es Salaam`,
                react: "🌤️"
            },
            girl: {
                title: "🫧 𝒮𝓀𝓎 𝒲𝒶𝓉𝒸𝒽 𝒫𝓇𝒾𝓃𝒸𝑒𝓈𝓈 🫧",
                line: "┄",
                wait: "🫧 𝓁𝑒𝓉 𝓂𝑒 𝓈𝑒𝑒 𝓉𝒽𝑒 𝒸𝓁𝑜𝓊𝒹𝓈 𝒻𝑜𝓇 𝓎𝑜𝓊~ 🫧",
                invalid: `🫧 𝓌𝒽𝒾𝒸𝒽 𝒸𝒾𝓉𝓎 𝓈𝒽𝑜𝓊𝓁𝒹 𝐼 𝒸𝒽𝑒𝒸𝓀, 𝒹𝑒𝒶𝓇? 🫧`,
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        if (!city) return m.reply(current.invalid);

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 3. FETCH DATA (OpenWeatherMap - Using a public-access endpoint for demo)
            const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=06c423fb623f95c5bfaca66453b9c568`);
            const data = response.data;

            // 4. DATA EXTRACTION
            const name = data.name;
            const country = data.sys.country;
            const temp = data.main.temp;
            const feelsLike = data.main.feels_like;
            const humidity = data.main.humidity;
            const condition = data.weather[0].main;
            const desc = data.weather[0].description;
            const wind = data.wind.speed;
            const pressure = data.main.pressure;

            // 5. BUILD THE INTELLIGENCE REPORT
            let report = `*${current.title}*\n${current.line.repeat(15)}\n\n`;
            report += `📍 *Location:* ${name}, ${country}\n`;
            report += `🌡️ *Temperature:* ${temp}°C\n`;
            report += `🤔 *Feels Like:* ${feelsLike}°C\n`;
            report += `☁️ *Condition:* ${condition} (${desc})\n`;
            report += `💧 *Humidity:* ${humidity}%\n`;
            report += `🌬️ *Wind Speed:* ${wind} m/s\n`;
            report += `⏲️ *Pressure:* ${pressure} hPa\n\n`;
            report += `${current.line.repeat(15)}\n_VEX Intelligence - Lupin Edition_`;

            // 6. TRANSLATE & SEND
            const { text: translatedReport } = await translate(report, { to: targetLang });
            await m.reply(translatedReport);

        } catch (error) {
            console.error("WEATHER ERROR:", error);
            await m.reply("☣️ Weather satellite link lost. Check the city name.");
        }
    }
};
