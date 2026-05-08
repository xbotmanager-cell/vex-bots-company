const { create, all } = require('mathjs');
const axios = require('axios');

const math = create(all);

// =========================
// FREE APIs - NO KEY NEEDED
// =========================
const APIS = {
    WEATHER: 'https://api.open-meteo.com/v1/forecast',
    AIR_QUALITY: 'https://air-quality-api.open-meteo.com/v1/air-quality',
    GEOCODING: 'https://geocoding-api.open-meteo.com/v1/search',
    UV_INDEX: 'https://api.open-meteo.com/v1/forecast',
    EARTHQUAKE: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
    CO2: 'https://global-warming.org/api/co2-api'
};

module.exports = {
    command: "env",
    alias: ["environment","air", "quake"],
    category: "environment",
    description: "VEX AI Environment - Weather, Air Quality, Climate, Earthquakes using free APIs",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style?.value || userSettings?.style || 'normal';
        const lang = userSettings?.lang || detectLang(m);
        const query = args.join(" ").trim();

        const ui = {
            harsh: { react: "☣️", prefix: "☣️ 𝙑𝙀𝙓 𝙀𝙉𝙑:", error: "☣️ 𝙎𝙋𝙀𝘾𝙄𝙁𝙔 𝘾𝙄𝙏𝙔 ☣️\n\n➤.env weather Dar es Salaam\n➤.env air Nairobi\n➤.env quake\n➤.env co2\n➤.env uv Tokyo" },
            normal: { react: "🌍", prefix: "🌍 VEX ENV:", error: "❌ Specify location\n\n➤.env weather London\n➤.env air Beijing\n➤.env earthquake\n➤.env climate\n➤.env uv Miami" },
            girl: { react: "💖", prefix: "💖 𝑽𝑬𝑿 𝑬𝑵𝑽:", error: "💔 𝑾𝒉𝒊𝒄𝒉 𝒄𝒊𝒕𝒚 𝒃𝒂𝒃𝒆? 🍭\n\n➤.env weather Paris\n➤.env air Seoul" }
        };

        const current = ui[style] || ui.normal;

        if (!query) {
            await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
            return m.reply(current.error);
        }

        await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

        try {
            const lowerQuery = query.toLowerCase();

            // =========================
            // FEATURE ROUTER
            // =========================
            if (lowerQuery.includes('weather') || lowerQuery.includes('hali')) {
                await handleWeather(m, sock, query, current, lang);
            } else if (lowerQuery.includes('air') || lowerQuery.includes('hewa') || lowerQuery.includes('aqi')) {
                await handleAirQuality(m, sock, query, current, lang);
            } else if (lowerQuery.includes('quake') || lowerQuery.includes('tetemeko')) {
                await handleEarthquake(m, sock, current, lang);
            } else if (lowerQuery.includes('co2') || lowerQuery.includes('climate') || lowerQuery.includes('warming')) {
                await handleCO2(m, sock, current, lang);
            } else if (lowerQuery.includes('uv') || lowerQuery.includes('jua')) {
                await handleUV(m, sock, query, current, lang);
            } else if (lowerQuery.includes('carbon') || lowerQuery.includes('footprint')) {
                await handleCarbonFootprint(m, sock, query, current, lang);
            } else {
                // Default to weather
                await handleWeather(m, sock, query, current, lang);
            }

        } catch (err) {
            console.log("ENV ERROR:", err.message);
            await sock.sendMessage(m.chat, {
                text: `${current.prefix} Failed: ${err.message.slice(0, 100)}`
            }, { quoted: m });
        }
    }
};

// =========================
// WEATHER - FREE API
// =========================
async function handleWeather(m, sock, query, ui, lang) {
    try {
        const city = query.replace(/weather|hali ya hewa|hali/gi, '').trim() || 'Dar es Salaam';

        // Get coordinates
        const geo = await axios.get(APIS.GEOCODING, {
            params: { name: city, count: 1 }
        });

        if (!geo.data.results?.[0]) throw 'City not found';

        const { latitude, longitude, name, country } = geo.data.results[0];

        // Get weather
        const weather = await axios.get(APIS.WEATHER, {
            params: {
                latitude,
                longitude,
                current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
                timezone: 'auto'
            }
        });

        const w = weather.data.current;
        const temp = w.temperature_2m;
        const humidity = w.relative_humidity_2m;
        const wind = w.wind_speed_10m;
        const code = w.weather_code;

        // Weather description
        const weatherDesc = getWeatherDesc(code);
        const emoji = getWeatherEmoji(code);

        // NEW FEATURE: Heat Index using mathjs
        let heatIndex = temp;
        if (temp > 27 && humidity > 40) {
            const T = temp;
            const R = humidity;
            heatIndex = math.evaluate(`-8.78469475556 + 1.61139411*T + 2.33854883889*R - 0.14611605*T*R - 0.012308094*T^2 - 0.0164248277778*R^2 + 0.002211732*T^2*R + 0.00072546*T*R^2 - 0.000003582*T^2*R^2`, { T, R });
        }

        let response = `${ui.prefix} *WEATHER*\n\n`;
        response += `📍 ${name}, ${country}\n`;
        response += `${emoji} ${weatherDesc}\n\n`;
        response += `🌡️ Temperature: ${temp}°C\n`;
        response += `💧 Humidity: ${humidity}%\n`;
        response += `💨 Wind: ${wind} km/h\n`;
        response += `🥵 Feels Like: ${math.format(heatIndex, { precision: 1 })}°C\n\n`;
        response += getWeatherAdvice(temp, humidity, code);

        const translated = await translateIfNeeded(response, lang);
        await sock.sendMessage(m.chat, { text: translated }, { quoted: m });

    } catch (e) {
        throw new Error(`Weather failed: ${e.message}`);
    }
}

// =========================
// AIR QUALITY - FREE API
// =========================
async function handleAirQuality(m, sock, query, ui, lang) {
    try {
        const city = query.replace(/air|hewa|aqi/gi, '').trim() || 'Dar es Salaam';

        const geo = await axios.get(APIS.GEOCODING, {
            params: { name: city, count: 1 }
        });

        if (!geo.data.results?.[0]) throw 'City not found';
        const { latitude, longitude, name, country } = geo.data.results[0];

        const air = await axios.get(APIS.AIR_QUALITY, {
            params: {
                latitude,
                longitude,
                current: 'pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,sulphur_dioxide,us_aqi'
            }
        });

        const a = air.data.current;
        const aqi = a.us_aqi;

        // NEW FEATURE: AQI Health Risk using mathjs
        const healthRisk = calculateAQIRisk(aqi);

        let response = `${ui.prefix} *AIR QUALITY*\n\n`;
        response += `📍 ${name}, ${country}\n\n`;
        response += `🏭 US AQI: ${aqi} - ${healthRisk.level}\n`;
        response += `${healthRisk.emoji} ${healthRisk.advice}\n\n`;
        response += `*Pollutants (μg/m³):*\n`;
        response += `PM2.5: ${a.pm2_5} ${getPM25Level(a.pm2_5)}\n`;
        response += `PM10: ${a.pm10} ${getPM10Level(a.pm10)}\n`;
        response += `CO: ${a.carbon_monoxide}\n`;
        response += `NO₂: ${a.nitrogen_dioxide}\n`;
        response += `O₃: ${a.ozone}\n`;
        response += `SO₂: ${a.sulphur_dioxide}`;

        const translated = await translateIfNeeded(response, lang);
        await sock.sendMessage(m.chat, { text: translated }, { quoted: m });

    } catch (e) {
        throw new Error(`Air quality failed: ${e.message}`);
    }
}

// =========================
// EARTHQUAKE - USGS FREE API
// =========================
async function handleEarthquake(m, sock, ui, lang) {
    try {
        const quake = await axios.get(APIS.EARTHQUAKE);
        const features = quake.data.features.slice(0, 5); // Last 5 quakes

        if (features.length === 0) {
            return sock.sendMessage(m.chat, {
                text: `${ui.prefix} No significant earthquakes in last 24h (M2.5+)`
            }, { quoted: m });
        }

        let response = `${ui.prefix} *EARTHQUAKES (M2.5+)*\n\n`;

        features.forEach((f, i) => {
            const mag = f.properties.mag;
            const place = f.properties.place;
            const time = new Date(f.properties.time).toLocaleString();
            const depth = f.geometry.coordinates[2];

            response += `${i + 1}. M${mag} - ${place}\n`;
            response += ` 📅 ${time}\n`;
            response += ` 📏 Depth: ${depth}km ${getQuakeSeverity(mag, depth)}\n\n`;
        });

        // NEW FEATURE: Energy calculation E = 10^(1.5*M + 4.8) Joules
        const maxMag = Math.max(...features.map(f => f.properties.mag));
        const energy = math.evaluate(`10^(1.5*${maxMag} + 4.8)`);
        const tnt = math.evaluate(`${energy} / 4.184e9`); // tons of TNT

        response += `*Strongest*: M${maxMag}\n`;
        response += `⚡ Energy: ${math.format(energy, { notation: 'engineering', precision: 2 })} J\n`;
        response += `💥 TNT Equivalent: ${math.format(tnt, { notation: 'engineering', precision: 2 })} tons`;

        const translated = await translateIfNeeded(response, lang);
        await sock.sendMessage(m.chat, { text: translated }, { quoted: m });

    } catch (e) {
        throw new Error(`Earthquake data failed: ${e.message}`);
    }
}

// =========================
// CO2 LEVELS - FREE API
// =========================
async function handleCO2(m, sock, ui, lang) {
    try {
        const co2 = await axios.get(APIS.CO2);
        const latest = co2.data.co2[co2.data.co2.length - 1];
        const year = latest.year;
        const month = latest.month;
        const day = latest.day;
        const ppm = parseFloat(latest.cycle);

        // NEW FEATURE: CO2 trend calculation
        const lastYear = co2.data.co2.filter(d => d.year === (year - 1).toString());
        const lastYearAvg = math.mean(lastYear.map(d => parseFloat(d.cycle)));
        const increase = ppm - lastYearAvg;
        const ratePercent = (increase / lastYearAvg) * 100;

        let response = `${ui.prefix} *GLOBAL CO₂*\n\n`;
        response += `📅 ${year}-${month}-${day}\n`;
        response += `🌡️ ${ppm} ppm\n\n`;
        response += `📈 Annual Change: +${increase.toFixed(2)} ppm (${ratePercent.toFixed(2)}%)\n`;
        response += `🎯 Pre-industrial: 280 ppm\n`;
        response += `⚠️ Current vs Pre-industrial: +${(ppm - 280).toFixed(1)} ppm\n\n`;
        response += getCO2Advice(ppm);

        const translated = await translateIfNeeded(response, lang);
        await sock.sendMessage(m.chat, { text: translated }, { quoted: m });

    } catch (e) {
        throw new Error(`CO2 data failed: ${e.message}`);
    }
}

// =========================
// UV INDEX - FREE API
// =========================
async function handleUV(m, sock, query, ui, lang) {
    try {
        const city = query.replace(/uv|jua/gi, '').trim() || 'Dar es Salaam';

        const geo = await axios.get(APIS.GEOCODING, {
            params: { name: city, count: 1 }
        });

        if (!geo.data.results?.[0]) throw 'City not found';
        const { latitude, longitude, name, country } = geo.data.results[0];

        const uv = await axios.get(APIS.UV_INDEX, {
            params: {
                latitude,
                longitude,
                current: 'uv_index',
                timezone: 'auto'
            }
        });

        const uvIndex = uv.data.current.uv_index;
        const { level, advice, time } = getUVAdvice(uvIndex);

        let response = `${ui.prefix} *UV INDEX*\n\n`;
        response += `📍 ${name}, ${country}\n`;
        response += `☀️ UV Index: ${uvIndex} - ${level}\n\n`;
        response += `⏰ Safe exposure: ${time}\n`;
        response += `🛡️ ${advice}`;

        const translated = await translateIfNeeded(response, lang);
        await sock.sendMessage(m.chat, { text: translated }, { quoted: m });

    } catch (e) {
        throw new Error(`UV data failed: ${e.message}`);
    }
}

// =========================
// BRAND NEW: CARBON FOOTPRINT CALCULATOR
// =========================
async function handleCarbonFootprint(m, sock, query, ui, lang) {
    try {
        // Parse:.env carbon electricity 300kwh, car 50km, flight 500km
        const electricity = parseFloat(query.match(/electricity\s+(\d+)/i)?.[1] || 0);
        const carKm = parseFloat(query.match(/car\s+(\d+)/i)?.[1] || 0);
        const flightKm = parseFloat(query.match(/flight\s+(\d+)/i)?.[1] || 0);

        // Calculations using mathjs - kg CO2
        const elecCO2 = math.evaluate(`${electricity} * 0.5`); // 0.5 kg CO2/kWh avg
        const carCO2 = math.evaluate(`${carKm} * 0.2`); // 0.2 kg CO2/km avg car
        const flightCO2 = math.evaluate(`${flightKm} * 0.25`); // 0.25 kg CO2/km avg flight
        const total = math.evaluate(`${elecCO2} + ${carCO2} + ${flightCO2}`);

        // Annual projection
        const annual = math.evaluate(`${total} * 12`);
        const trees = math.ceil(math.evaluate(`${annual} / 22`)); // 1 tree absorbs 22kg CO2/year

        let response = `${ui.prefix} *CARBON FOOTPRINT*\n\n`;
        response += `⚡ Electricity: ${electricity} kWh = ${math.format(elecCO2, { precision: 2 })} kg CO₂\n`;
        response += `🚗 Car: ${carKm} km = ${math.format(carCO2, { precision: 2 })} kg CO₂\n`;
        response += `✈️ Flight: ${flightKm} km = ${math.format(flightCO2, { precision: 2 })} kg CO₂\n\n`;
        response += `📊 Monthly Total: ${math.format(total, { precision: 2 })} kg CO₂\n`;
        response += `📅 Annual: ${math.format(annual, { precision: 1 })} kg CO₂\n\n`;
        response += `🌳 Trees needed to offset: ${trees} trees/year\n`;
        response += `${getCarbonAdvice(total)}`;

        const translated = await translateIfNeeded(response, lang);
        await sock.sendMessage(m.chat, { text: translated }, { quoted: m });

    } catch (e) {
        await sock.sendMessage(m.chat, {
            text: `${ui.prefix} Format:.env carbon electricity 300kwh, car 50km, flight 500km`
        }, { quoted: m });
    }
}

// =========================
// HELPER FUNCTIONS
// =========================
function getWeatherDesc(code) {
    const codes = { 0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Foggy', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Severe thunderstorm' };
    return codes[code] || 'Unknown';
}

function getWeatherEmoji(code) {
    if (code === 0) return '☀️';
    if (code <= 2) return '🌤️';
    if (code === 3) return '☁️';
    if (code >= 45 && code <= 48) return '🌫️';
    if (code >= 51 && code <= 67) return '🌧️';
    if (code >= 71 && code <= 77) return '❄️';
    if (code >= 80 && code <= 82) return '🌦️';
    if (code >= 95) return '⛈️';
    return '🌡️';
}

function getWeatherAdvice(temp, humidity, code) {
    if (temp > 35) return '🔥 Extreme heat! Stay hydrated, avoid sun 11AM-3PM.';
    if (temp < 5) return '🥶 Freezing! Dress warmly, risk of frostbite.';
    if (code >= 95) return '⚡ Thunderstorm! Stay indoors, unplug electronics.';
    if (humidity > 80) return '💧 High humidity. Feels hotter than actual temp.';
    return '✅ Normal conditions. Enjoy your day!';
}

function calculateAQIRisk(aqi) {
    if (aqi <= 50) return { level: 'Good', emoji: '🟢', advice: 'Air quality is satisfactory. Enjoy outdoor activities!' };
    if (aqi <= 100) return { level: 'Moderate', emoji: '🟡', advice: 'Acceptable. Sensitive people limit prolonged outdoor exertion.' };
    if (aqi <= 150) return { level: 'Unhealthy for Sensitive', emoji: '🟠', advice: 'Children, elderly, sick should reduce outdoor activity.' };
    if (aqi <= 200) return { level: 'Unhealthy', emoji: '🔴', advice: 'Everyone may experience health effects. Limit outdoor activity.' };
    if (aqi <= 300) return { level: 'Very Unhealthy', emoji: '🟣', advice: 'Health alert! Everyone avoid outdoor activity.' };
    return { level: 'Hazardous', emoji: '🟤', advice: 'Emergency conditions! Stay indoors, close windows.' };
}

function getPM25Level(pm25) {
    if (pm25 <= 12) return '🟢';
    if (pm25 <= 35.4) return '🟡';
    if (pm25 <= 55.4) return '🟠';
    if (pm25 <= 150.4) return '🔴';
    return '🟣';
}

function getPM10Level(pm10) {
    if (pm10 <= 54) return '🟢';
    if (pm10 <= 154) return '🟡';
    if (pm10 <= 254) return '🟠';
    if (pm10 <= 354) return '🔴';
    return '🟣';
}

function getQuakeSeverity(mag, depth) {
    if (mag >= 7) return '🔴 Major';
    if (mag >= 6) return '🟠 Strong';
    if (mag >= 5) return '🟡 Moderate';
    if (mag >= 4) return '🟢 Light';
    return '⚪ Minor';
}

function getCO2Advice(ppm) {
    if (ppm > 450) return '🔴 CRITICAL: Exceeds 450ppm. Climate tipping points risk.';
    if (ppm > 420) return '🟠 HIGH: Exceeds 420ppm. 1.5°C warming likely exceeded.';
    if (ppm > 400) return '🟡 ELEVATED: Exceeds 400ppm. Urgent action needed.';
    return '🟢 Pre-2015 levels. Still rising dangerously.';
}

function getUVAdvice(uv) {
    if (uv <= 2) return { level: 'Low', advice: 'Safe. Sunglasses optional.', time: '60+ min' };
    if (uv <= 5) return { level: 'Moderate', advice: 'Wear sunscreen SPF 30+, hat.', time: '30-60 min' };
    if (uv <= 7) return { level: 'High', advice: 'SPF 30+, hat, seek shade 10AM-4PM.', time: '15-30 min' };
    if (uv <= 10) return { level: 'Very High', advice: 'SPF 50+, avoid sun 10AM-4PM.', time: '10-15 min' };
    return { level: 'Extreme', advice: 'DANGER! Avoid sun. SPF 50+, full cover.', time: '<10 min' };
}

function getCarbonAdvice(kg) {
    if (kg < 100) return '🟢 Excellent! Below global average.';
    if (kg < 300) return '🟡 Good. Try reduce by 20%.';
    if (kg < 500) return '🟠 High. Consider solar, public transport.';
    return '🔴 Very High! Urgent reduction needed. Offset required.';
}

function detectLang(m, text = '') {
    const content = text || m.body || m.message?.conversation || '';
    if (/[\u0B80-\u0BFF]/.test(content)) return 'ta';
    if (/[\u0C00-\u0C7F]/.test(content)) return 'te';
    if (/[\u0900-\u097F]/.test(content)) return 'hi';
    if (/[ء-ي]/.test(content)) return 'ar';
    if (/\b(ya|na|wa|za|ni|kwa|hii|hiyo|vipi|gani|nini|hali|hewa)\b/i.test(content)) return 'sw';
    if (/[àáâãäåæçèéêëìíîïñòóôõöùúûüý]/.test(content)) return 'es';
    if (/[àâçéèêëîïôûùüÿ]/.test(content)) return 'fr';
    if (/[äöüß]/.test(content)) return 'de';
    return 'en';
}

async function translateIfNeeded(text, lang) {
    if (lang === 'en') return text;
    try {
        const res = await axios.post('https://libretranslate.com/translate', {
            q: text,
            source: 'en',
            target: lang,
            format: 'text'
        }, { timeout: 3000 });
        return res.data.translatedText;
    } catch {
        return text;
    }
}
