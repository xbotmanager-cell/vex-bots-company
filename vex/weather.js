// VEX MINI BOT - VEX: weather
// Nova: Provides deep meteorological analytics for any city globally.
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'weather',
    cyro: 'utility',
    nova: 'Provides deep-dive weather reports and atmospheric data.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        let city = args.join(' ');

        if (!city) return m.reply("❌ *USAGE:* Provide a city name. Example: `.weather Dar es Salaam` ");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🌤️", key: m.key } });

        try {
            // Unatakiwa upate API KEY ya bure kutoka openweathermap.org
            const API_KEY = "YOUR_OPENWEATHER_API_KEY";
            const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`;

            const res = await axios.get(apiUrl);
            const d = res.data;

            // Deep Data Extraction
            const temp = d.main.temp;
            const feelsLike = d.main.feels_like;
            const humidity = d.main.humidity;
            const windSpeed = d.wind.speed;
            const pressure = d.main.pressure;
            const visibility = d.visibility / 1000; // Convert to km
            const sunrise = new Date(d.sys.sunrise * 1000).toLocaleTimeString();
            const sunset = new Date(d.sys.sunset * 1000).toLocaleTimeString();

            let weatherMsg = `╭━━━〔 🌤️ *VEX: WEATHER-CORE* 〕━━━╮\n`;
            weatherMsg += `┃ 🌍 *Location:* ${d.name}, ${d.sys.country}\n`;
            weatherMsg += `┃ 🧬 *Condition:* ${d.weather[0].description.toUpperCase()}\n`;
            weatherMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            weatherMsg += `*🌡️ TEMPERATURE ANALYTICS:*\n`;
            weatherMsg += `> Current Temp: **${temp}°C**\n`;
            weatherMsg += `> RealFeel: **${feelsLike}°C**\n`;
            weatherMsg += `> Pressure: ${pressure} hPa\n\n`;

            weatherMsg += `*🌬️ ATMOSPHERIC DATA:*\n`;
            weatherMsg += `> Humidity: ${humidity}%\n`;
            weatherMsg += `> Wind Speed: ${windSpeed} m/s\n`;
            weatherMsg += `> Visibility: ${visibility} km\n\n`;

            weatherMsg += `*☀️ SOLAR CYCLE:*\n`;
            weatherMsg += `> Sunrise: ${sunrise}\n`;
            weatherMsg += `> Sunset: ${sunset}\n\n`;

            weatherMsg += `*📢 VEX ADVISORY:*\n`;
            weatherMsg += temp > 30 ? `> "High thermal levels detected. Stay hydrated."` : `> "Atmospheric conditions are stable for operations."`;
            
            weatherMsg += `\n\n_VEX MINI BOT: Vision Beyond Limits_`;

            await m.reply(weatherMsg);

        } catch (e) {
            m.reply("❌ *SATELLITE ERROR:* Could not find the specified location node. Ensure the city name is correct.");
        }
    }
};