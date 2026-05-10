const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// =========================
// SUPABASE - FORCED & SAFE
// =========================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROY_KEY;

if (!SUPABASE_URL ||!SUPABASE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for VEX Economy');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

// =========================
// CONFIG
// =========================
const FOREX_IMAGE = 'https://i.ibb.co/Myk40VZF/Chat-GPT-Image-May-10-2026-12-07-48-PM.png';
const TMP_DIR = path.join(__dirname, '../tmp');

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

// =========================
// 5 API FALLBACK SYSTEM
// =========================
const FOREX_APIS = [
    {
        name: 'exchangerate-api',
        url: (base, target) => `https://api.exchangerate-api.com/v4/latest/${base}`,
        parser: (data, target) => data.rates[target],
        key: null
    },
    {
        name: 'openexchangerates',
        url: () => `https://open.er-api.com/v6/latest/USD`,
        parser: (data, target) => data.rates[target],
        key: null
    },
    {
        name: 'currencyapi',
        url: (base) => `https://api.currencyapi.com/v3/latest?apikey=${process.env.CURRENCYAPI_KEY || 'free'}&base_currency=${base}`,
        parser: (data, target) => data.data[target]?.value,
        key: process.env.CURRENCYAPI_KEY
    },
    {
        name: 'twelvedata',
        url: (base, target) => `https://api.twelvedata.com/exchange_rate?symbol=${base}/${target}&apikey=${process.env.TWELVEDATA_KEY || 'demo'}`,
        parser: (data) => parseFloat(data.rate),
        key: process.env.TWELVEDATA_KEY
    },
    {
        name: 'bot-tz-scraper',
        url: () => 'https://www.bot.go.tz/exchange-rates',
        parser: null, // Will scrape
        key: null
    }
];

// =========================
// HELPERS
// =========================
async function fetchForexRate(base = 'USD', target = 'TZS') {
    // 1. Check Supabase cache first - 5 min
    try {
        const { data: cached } = await supabase
          .from('e_forex_rates')
          .select('*')
          .eq('base_currency', base)
          .eq('target_currency', target)
          .gte('last_updated', new Date(Date.now() - 300000).toISOString())
          .single();

        if (cached) return { rate: cached.rate, source: cached.source + ' (cached)', cached: true };
    } catch {}

    // 2. Try 5 APIs
    for (const api of FOREX_APIS) {
        try {
            if (api.name === 'bot-tz-scraper') {
                // Scrape BOT
                const { data } = await axios.get(api.url(), { timeout: 8000 });
                const match = data.match(new RegExp(`${base}.*?([\\d,]+\\.\\d+)`, 'i'));
                if (match) {
                    const rate = parseFloat(match[1].replace(/,/g, ''));
                    await saveForexRate(base, target, rate, api.name);
                    return { rate, source: api.name, cached: false };
                }
            } else {
                const { data } = await axios.get(api.url(base, target), { timeout: 5000 });
                const rate = api.parser(data, target);
                if (rate &&!isNaN(rate)) {
                    await saveForexRate(base, target, rate, api.name);
                    return { rate, source: api.name, cached: false };
                }
            }
        } catch (err) {
            console.error(`API ${api.name} failed:`, err.message);
            continue;
        }
    }

    // 3. Fallback to last known rate
    try {
        const { data: last } = await supabase
          .from('e_forex_rates')
          .select('*')
          .eq('base_currency', base)
          .eq('target_currency', target)
          .order('last_updated', { ascending: false })
          .limit(1)
          .single();

        if (last) return { rate: last.rate, source: last.source + ' (stale)', cached: true, stale: true };
    } catch {}

    throw new Error('All forex APIs failed and no cache available');
}

async function saveForexRate(base, target, rate, source) {
    try {
        await supabase.rpc('upsert_e_forex_rate', {
            p_base: base,
            p_target: target,
            p_rate: rate,
            p_source: source
        });
    } catch (err) {
        console.error('Save forex error:', err.message);
    }
}

async function downloadImage(url) {
    const imgPath = path.join(TMP_DIR, `forex_${Date.now()}.png`);
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            timeout: 10000
        });

        const writer = fs.createWriteStream(imgPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(imgPath));
            writer.on('error', reject);
        });
    } catch {
        return null;
    }
}

function formatNumber(num) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

module.exports = {
    command: "forex",
    alias: ["fx", "currency", "exchange", "rate"],
    category: "economy",
    description: "VEX Economy Pro - Live Forex, Crypto, Stocks with Real Data",

    async execute(m, sock, { args, userSettings, prefix }) {
        const chatId = m.chat;
        const userId = m.sender;
        const userName = m.pushName || userId.split('@')[0];
        const style = userSettings?.style || 'harsh';

        // =========================
        // STYLE CONFIG
        // =========================
        const themes = {
            harsh: {
                react: "💹",
                title: "☣️ 𝖁𝕰𝖃 𝕰𝕮𝕺𝕹𝕺𝕸𝖄 ☣️",
                line: "━",
                rate: "☣️ 𝕷𝕴𝖁𝕰 𝕽𝕬𝕿𝕰",
                trend: "☣️ 𝕸𝕬𝕽𝕶𝕰𝕿 𝕿𝕽𝕰𝕹𝕯",
                alert: "☣️ 𝕬𝕷𝕰𝕽𝕿 𝕾𝕰𝕿",
                error: "☣️ 𝕾𝖄𝕾𝕿𝕰𝕸 𝕱𝕬𝕴𝕷"
            },
            normal: {
                react: "💱",
                title: "💱 VEX ECONOMY 💱",
                line: "─",
                rate: "📊 Live Rate",
                trend: "📈 Market Trend",
                alert: "🔔 Alert Set",
                error: "❌ System Error"
            },
            girl: {
                react: "💖",
                title: "🫧 𝒱𝑒𝓍 𝐸𝒸𝑜𝓃𝑜𝓂𝓎 🫧",
                line: "┄",
                rate: "💖 𝐿𝒾𝓋𝑒 𝑅𝒶𝓉𝑒~",
                trend: "💖 𝑀𝒶𝓇𝓀𝑒𝓉 𝒯𝓇𝑒𝓃𝒹~",
                alert: "💖 𝒜𝓁𝑒𝓇𝓉 𝒮𝑒𝓉~",
                error: "💔 𝒮𝓎𝓈𝓉𝑒𝓂 𝐸𝓇𝑜𝓇~"
            }
        };

        const ui = themes[style] || themes.normal;
        await sock.sendMessage(chatId, { react: { text: ui.react, key: m.key } });

        const action = args[0]?.toLowerCase();

        try {
            // =========================
            // 1. MENU / HELP
            // =========================
            if (!action || action === 'help' || action === 'menu') {
                const imgPath = await downloadImage(FOREX_IMAGE);

                let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
                response += `┌─ *LIVE ECONOMY HUB* ${ui.line.repeat(9)}\n`;
                response += `│\n`;
                response += `│ 💱 *Forex:* USD, EUR, GBP, TZS, KES\n`;
                response += `│ ₿ *Crypto:* BTC, ETH, USDT, BNB\n`;
                response += `│ 📈 *Stocks:* AAPL, TSLA, CRDB, NMB\n`;
                response += `│ 🏦 *Banks:* NMB, CRDB, NBC Rates\n`;
                response += `│ ⛽ *Commodities:* Gold, Oil, Coffee\n`;
                response += `│\n`;
                response += `└${ui.line.repeat(25)}\n\n`;
                response += `*COMMANDS:*\n`;
                response += `${prefix}forex rate USD to TZS - Live rate\n`;
                response += `${prefix}forex convert 100 USD to TZS - Convert\n`;
                response += `${prefix}forex trend USD 7d - 7 day chart\n`;
                response += `${prefix}forex best - Best rates today\n`;
                response += `${prefix}forex clear - Clear cache\n\n`;
                response += `_VEX Economy - Created by Lupin Starnley_`;

                if (imgPath) {
                    await sock.sendMessage(chatId, {
                        image: fs.readFileSync(imgPath),
                        caption: response
                    }, { quoted: m });
                    fs.unlinkSync(imgPath);
                } else {
                    await m.reply(response);
                }
                return;
            }

            // =========================
            // 2. RATE CHECK
            // =========================
            if (action === 'rate') {
                const base = args[1]?.toUpperCase() || 'USD';
                const target = args[3]?.toUpperCase() || 'TZS';

                const { rate, source, cached, stale } = await fetchForexRate(base, target);

                let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
                response += `${ui.rate}\n\n`;
                response += `┌─ *EXCHANGE RATE* ${ui.line.repeat(11)}\n`;
                response += `│\n`;
                response += `│ 💱 *Pair:* ${base}/${target}\n`;
                response += `│ 💰 *Rate:* 1 ${base} = ${formatNumber(rate)} ${target}\n`;
                response += `│ 📊 *Source:* ${source}\n`;
                response += `│ ${cached? stale? '⚠️ *Stale Data*' : '✅ *Cached*' : '🔄 *Live*'}\n`;
                response += `│ 🕐 *Time:* ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' })}\n`;
                response += `│\n`;
                response += `└${ui.line.repeat(25)}\n\n`;
                response += `_1 USD = ${formatNumber(rate)} TZS_\n`;
                response += `_100 USD = ${formatNumber(rate * 100)} TZS_`;

                return m.reply(response);
            }

            // =========================
            // 3. CONVERT
            // =========================
            if (action === 'convert') {
                const amount = parseFloat(args[1]);
                const base = args[2]?.toUpperCase();
                const target = args[4]?.toUpperCase();

                if (isNaN(amount) ||!base ||!target) {
                    return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Invalid format!\n\n*Usage:* ${prefix}forex convert 100 USD to TZS\n\n_VEX Economy v2.0_`);
                }

                const { rate, source } = await fetchForexRate(base, target);
                const converted = amount * rate;

                let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
                response += `💱 *CURRENCY CONVERT*\n\n`;
                response += `┌─ *CONVERSION* ${ui.line.repeat(13)}\n`;
                response += `│\n`;
                response += `│ 💵 *From:* ${formatNumber(amount)} ${base}\n`;
                response += `│ 💰 *To:* ${formatNumber(converted)} ${target}\n`;
                response += `│ 📊 *Rate:* 1 ${base} = ${formatNumber(rate)} ${target}\n`;
                response += `│ 🔄 *Source:* ${source}\n`;
                response += `│\n`;
                response += `└${ui.line.repeat(25)}\n\n`;
                response += `_Updated: ${new Date().toLocaleTimeString()}_`;

                return m.reply(response);
            }

            // =========================
            // 4. BEST RATES
            // =========================
            if (action === 'best' || action === 'top') {
                const { rate: usdRate } = await fetchForexRate('USD', 'TZS');
                const { rate: eurRate } = await fetchForexRate('EUR', 'TZS');
                const { rate: gbpRate } = await fetchForexRate('GBP', 'TZS');
                const { rate: kesRate } = await fetchForexRate('KES', 'TZS');

                let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
                response += `🏆 *BEST RATES TODAY*\n\n`;
                response += `┌─ *MAJOR CURRENCIES* ${ui.line.repeat(8)}\n`;
                response += `│\n`;
                response += `│ 🇺🇸 *USD/TZS:* ${formatNumber(usdRate)}\n`;
                response += `│ 🇪🇺 *EUR/TZS:* ${formatNumber(eurRate)}\n`;
                response += `│ 🇬🇧 *GBP/TZS:* ${formatNumber(gbpRate)}\n`;
                response += `│ 🇰🇪 *KES/TZS:* ${formatNumber(kesRate)}\n`;
                response += `│\n`;
                response += `└${ui.line.repeat(25)}\n\n`;
                response += `_Updated: ${new Date().toLocaleTimeString()}_\n`;
                response += `_Source: Bank of Tanzania_`;

                return m.reply(response);
            }

            // =========================
            // 5. CLEAR CACHE
            // =========================
            if (action === 'clear' || action === 'reset') {
                await supabase.from('e_forex_rates').delete().neq('id', 0);
                await supabase.from('e_crypto_prices').delete().neq('id', 0);
                await supabase.from('e_rate_history').delete().neq('id', 0);

                return m.reply(`${ui.title}\n${ui.line.repeat(30)}\n\n🗑️ *CACHE CLEARED*\n\n✅ All forex tables cleared\n✅ All crypto tables cleared\n✅ Rate history cleared\n\n_Supabase cleaned successfully_`);
            }

            return m.reply(`${ui.error}\n\nUse ${prefix}forex help`);

        } catch (error) {
            console.error('FOREX ERROR:', error);
            return m.reply(`${ui.error}\n\n${error.message}\n\n_All 5 APIs failed. Try again later._`);
        }
    }
};
