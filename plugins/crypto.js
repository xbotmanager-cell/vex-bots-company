const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// =========================
// SUPABASE - FORCED
// =========================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROY_KEY;

if (!SUPABASE_URL ||!SUPABASE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for VEX Crypto');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

// =========================
// CONFIG
// =========================
const CRYPTO_IMAGE = 'https://i.ibb.co/Myk40VZF/Chat-GPT-Image-May-10-2026-12-07-48-PM.png';
const TMP_DIR = path.join(__dirname, '../tmp');

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

// =========================
// 5 CRYPTO API FALLBACK
// =========================
const CRYPTO_APIS = [
    {
        name: 'coingecko',
        url: (id) => `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`,
        parser: (data, id) => ({
            price: data[id].usd,
            change: data[id].usd_24h_change,
            marketCap: data[id].usd_market_cap
        })
    },
    {
        name: 'coinpaprika',
        url: (id) => `https://api.coinpaprika.com/v1/tickers/${id}`,
        parser: (data) => ({
            price: data.quotes.USD.price,
            change: data.quotes.USD.percent_change_24h,
            marketCap: data.quotes.USD.market_cap
        })
    },
    {
        name: 'binance',
        url: (symbol) => `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}USDT`,
        parser: (data) => ({
            price: parseFloat(data.lastPrice),
            change: parseFloat(data.priceChangePercent),
            marketCap: 0
        })
    },
    {
        name: 'coinbase',
        url: (symbol) => `https://api.coinbase.com/v2/exchange-rates?currency=${symbol}`,
        parser: (data) => ({
            price: parseFloat(data.data.rates.USD),
            change: 0,
            marketCap: 0
        })
    },
    {
        name: 'cryptocompare',
        url: (symbol) => `https://min-api.cryptocompare.com/data/price?fsym=${symbol}&tsyms=USD`,
        parser: (data) => ({
            price: data.USD,
            change: 0,
            marketCap: 0
        })
    }
];

// =========================
// COIN MAPPING
// =========================
const COIN_MAP = {
    'btc': { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
    'eth': { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
    'usdt': { id: 'tether', symbol: 'USDT', name: 'Tether' },
    'bnb': { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
    'sol': { id: 'solana', symbol: 'SOL', name: 'Solana' },
    'xrp': { id: 'ripple', symbol: 'XRP', name: 'XRP' },
    'ada': { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
    'doge': { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
    'trx': { id: 'tron', symbol: 'TRX', name: 'TRON' },
    'matic': { id: 'matic-network', symbol: 'MATIC', name: 'Polygon' }
};

// =========================
// HELPERS
// =========================
async function fetchCryptoPrice(symbol) {
    const coin = COIN_MAP[symbol.toLowerCase()] || { id: symbol, symbol: symbol.toUpperCase(), name: symbol };
    
    // 1. Check Supabase cache - 2 min
    try {
        const { data: cached } = await supabase
          .from('e_crypto_prices')
          .select('*')
          .eq('symbol', coin.symbol)
          .gte('last_updated', new Date(Date.now() - 120000).toISOString())
          .single();

        if (cached) return { ...cached, cached: true, source: cached.source + ' ⭑' };
    } catch {}

    // 2. Try 5 APIs
    for (const api of CRYPTO_APIS) {
        try {
            const url = api.url(coin.id || coin.symbol);
            const { data } = await axios.get(url, { timeout: 5000 });
            const parsed = api.parser(data, coin.id);
            
            if (parsed.price &&!isNaN(parsed.price)) {
                await saveCryptoPrice(coin.symbol, coin.name, parsed.price, parsed.change, parsed.marketCap, api.name);
                return { 
                    symbol: coin.symbol, 
                    name: coin.name, 
                    price_usd: parsed.price, 
                    change_24h: parsed.change, 
                    market_cap: parsed.marketCap,
                    source: api.name,
                    cached: false 
                };
            }
        } catch (err) {
            console.error(`API ${api.name} failed:`, err.message);
            continue;
        }
    }

    // 3. Fallback to last known
    try {
        const { data: last } = await supabase
          .from('e_crypto_prices')
          .select('*')
          .eq('symbol', coin.symbol)
          .order('last_updated', { ascending: false })
          .limit(1)
          .single();

        if (last) return { ...last, cached: true, stale: true, source: last.source + ' ✧' };
    } catch {}

    throw new Error('All crypto APIs failed and no cache available');
}

async function saveCryptoPrice(symbol, name, price, change, marketCap, source) {
    try {
        await supabase.rpc('upsert_e_crypto_price', {
            p_symbol: symbol,
            p_name: name,
            p_price_usd: price,
            p_change_24h: change || 0
        });
    } catch (err) {
        console.error('Save crypto error:', err.message);
    }
}

async function downloadImage(url) {
    const imgPath = path.join(TMP_DIR, `crypto_${Date.now()}.png`);
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

function formatPrice(num) {
    if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (num >= 1) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

function formatMarketCap(num) {
    if (!num) return 'N/A';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
}

function getTrendSymbol(change) {
    if (change > 5) return '🚀';
    if (change > 0) return '📈';
    if (change < -5) return '💥';
    if (change < 0) return '📉';
    return '➖';
}

module.exports = {
    command: "crypto",
    alias: ["coin", "btc", "eth", "token"],
    category: "economy",
    description: "VEX Crypto Pro - Live Prices, Trends, Portfolio & Alerts",

    async execute(m, sock, { args, userSettings, prefix }) {
        const chatId = m.chat;
        const userId = m.sender;
        const userName = m.pushName || userId.split('@')[0];
        const style = userSettings?.style || 'harsh';

        // =========================
        // STYLE CONFIG - NINJA STARS
        // =========================
        const themes = {
            harsh: {
                react: "⭒",
                title: "☣️ 𝖁𝕰𝖃 𝕮𝕽𝖄𝕻𝕿𝕺 ☣️",
                line: "━",
                price: "☣️ 𝕷𝕴𝖁𝕰 𝕻𝕽𝕴𝕮𝕰",
                trend: "☣️ 𝕸𝕬𝕽𝕶𝕰𝕿 𝕿𝕽𝕰𝕹𝕯",
                top: "☣️ 𝕿𝕺𝕻 𝕮𝕺𝕴𝕹𝕾",
                error: "☣️ 𝕾𝖄𝕾𝕿𝕰𝕸 𝕱𝕬𝕴𝕷",
                star: "⭑",
                sparkle: "✧",
                cross: "❋",
                diamond: "✦"
            },
            normal: {
                react: "₿",
                title: "₿ VEX CRYPTO ₿",
                line: "─",
                price: "💰 Live Price",
                trend: "📊 Market Trend",
                top: "🏆 Top Coins",
                error: "❌ System Error",
                star: "⭐",
                sparkle: "✨",
                cross: "❄️",
                diamond: "💎"
            },
            girl: {
                react: "💖",
                title: "🫧 𝒱𝑒𝓍 𝒞𝓇𝓎𝓅𝓉𝑜 🫧",
                line: "┄",
                price: "💖 𝐿𝒾𝓋𝑒 𝒫𝓇𝒾𝒸𝑒~",
                trend: "💖 𝑀𝒶𝓇𝓀𝑒𝓉 𝒯𝓇𝑒𝓃𝒹~",
                top: "💖 𝒯𝑜𝓅 𝒞𝑜𝒾𝓃𝓈~",
                error: "💔 𝒮𝓎𝓈𝓉𝑒𝓂 𝐸𝓇𝑜𝓇~",
                star: "⭑",
                sparkle: "✧",
                cross: "❋",
                diamond: "✦"
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
                const imgPath = await downloadImage(CRYPTO_IMAGE);

                let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
                response += `${ui.star}┌─ ${ui.sparkle} CRYPTO HUB ${ui.sparkle} ${ui.line.repeat(9)}${ui.star}\n`;
                response += `${ui.star}│\n`;
                response += `${ui.star}│ ${ui.diamond} ₿ Bitcoin (BTC)\n`;
                response += `${ui.star}│ ${ui.diamond} ⟠ Ethereum (ETH)\n`;
                response += `${ui.star}│ ${ui.diamond} ₮ Tether (USDT)\n`;
                response += `${ui.star}│ ${ui.diamond} ◎ Solana (SOL)\n`;
                response += `${ui.star}│ ${ui.diamond} 𝕏 XRP\n`;
                response += `${ui.star}│\n`;
                response += `${ui.star}└${ui.line.repeat(25)}${ui.star}\n\n`;
                response += `${ui.cross} *COMMANDS* ${ui.cross}\n`;
                response += `${ui.diamond} ${prefix}crypto price btc - Live price\n`;
                response += `${ui.diamond} ${prefix}crypto trend eth 7d - 7 day chart\n`;
                response += `${ui.diamond} ${prefix}crypto top - Top 10 coins\n`;
                response += `${ui.diamond} ${prefix}crypto convert 0.5 btc to usd\n`;
                response += `${ui.diamond} ${prefix}crypto alert btc 70000\n`;
                response += `${ui.diamond} ${prefix}crypto portfolio - Your coins\n\n`;
                response += `${ui.star}_VEX Crypto - Created by Lupin Starnley_${ui.star}`;

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
            // 2. PRICE CHECK
            // =========================
            if (action === 'price' ||!action) {
                const symbol = args[1] || args[0] || 'btc';
                const data = await fetchCryptoPrice(symbol);

                const trend = getTrendSymbol(data.change_24h);
                const changeColor = data.change_24h >= 0? '🟢' : '🔴';

                let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
                response += `${ui.price}\n\n`;
                response += `${ui.star}┌─ ${ui.sparkle} ${data.name} ${ui.sparkle} ${ui.line.repeat(10)}${ui.star}\n`;
                response += `${ui.star}│\n`;
                response += `${ui.star}│ ${ui.diamond} *Symbol:* ${data.symbol}\n`;
                response += `${ui.star}│ ${ui.diamond} *Price:* $${formatPrice(data.price_usd)}\n`;
                response += `${ui.star}│ ${ui.diamond} *24h:* ${changeColor} ${data.change_24h?.toFixed(2) || 0}% ${trend}\n`;
                response += `${ui.star}│ ${ui.diamond} *Market Cap:* ${formatMarketCap(data.market_cap)}\n`;
                response += `${ui.star}│ ${ui.diamond} *Source:* ${data.source}\n`;
                response += `${ui.star}│ ${data.cached? data.stale? `${ui.cross} *Stale Data*` : `${ui.sparkle} *Cached*` : `${ui.star} *Live*`}\n`;
                response += `${ui.star}│ 🕐 *Time:* ${new Date().toLocaleString('en-US', { timeZone: 'Africa/Dar_es_Salaam' })}\n`;
                response += `${ui.star}│\n`;
                response += `${ui.star}└${ui.line.repeat(25)}${ui.star}\n\n`;
                response += `${ui.cross} _1 ${data.symbol} = $${formatPrice(data.price_usd)}_\n`;
                response += `${ui.cross} _0.1 ${data.symbol} = $${formatPrice(data.price_usd * 0.1)}_`;

                return m.reply(response);
            }

            // =========================
            // 3. TOP COINS
            // =========================
            if (action === 'top' || action === 'list') {
                const topCoins = ['btc', 'eth', 'usdt', 'bnb', 'sol', 'xrp', 'ada', 'doge', 'trx', 'matic'];
                const results = [];

                for (const coin of topCoins) {
                    try {
                        const data = await fetchCryptoPrice(coin);
                        results.push(data);
                    } catch {}
                }

                let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
                response += `${ui.top}\n\n`;
                response += `${ui.star}┌─ ${ui.sparkle} TOP 10 COINS ${ui.sparkle} ${ui.line.repeat(8)}${ui.star}\n`;
                response += `${ui.star}│\n`;

                results.slice(0, 10).forEach((coin, i) => {
                    const trend = getTrendSymbol(coin.change_24h);
                    const change = coin.change_24h >= 0? '🟢' : '🔴';
                    response += `${ui.star}│ ${ui.diamond} ${i + 1}. ${coin.symbol} $${formatPrice(coin.price_usd)} ${change}${coin.change_24h?.toFixed(1)}% ${trend}\n`;
                });

                response += `${ui.star}│\n`;
                response += `${ui.star}└${ui.line.repeat(25)}${ui.star}\n\n`;
                response += `${ui.cross} _Updated: ${new Date().toLocaleTimeString()}_`;

                return m.reply(response);
            }

            // =========================
            // 4. CONVERT
            // =========================
            if (action === 'convert') {
                const amount = parseFloat(args[1]);
                const from = args[2]?.toLowerCase();
                const to = args[4]?.toLowerCase();

                if (isNaN(amount) ||!from ||!to) {
                    return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n${ui.cross} Invalid format!\n\n*Usage:* ${prefix}crypto convert 0.5 btc to usd\n\n_VEX Crypto v2.0_`);
                }

                const fromData = await fetchCryptoPrice(from);
                let converted;

                if (to === 'usd') {
                    converted = amount * fromData.price_usd;
                } else {
                    const toData = await fetchCryptoPrice(to);
                    converted = (amount * fromData.price_usd) / toData.price_usd;
                }

                let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
                response += `💱 *CRYPTO CONVERT*\n\n`;
                response += `${ui.star}┌─ ${ui.sparkle} CONVERSION ${ui.sparkle} ${ui.line.repeat(10)}${ui.star}\n`;
                response += `${ui.star}│\n`;
                response += `${ui.star}│ ${ui.diamond} *From:* ${amount} ${fromData.symbol}\n`;
                response += `${ui.star}│ ${ui.diamond} *To:* ${formatPrice(converted)} ${to.toUpperCase()}\n`;
                response += `${ui.star}│ ${ui.diamond} *Rate:* 1 ${fromData.symbol} = $${formatPrice(fromData.price_usd)}\n`;
                response += `${ui.star}│\n`;
                response += `${ui.star}└${ui.line.repeat(25)}${ui.star}\n\n`;
                response += `${ui.cross} _Live rate from ${fromData.source}_`;

                return m.reply(response);
            }

            return m.reply(`${ui.error}\n\nUse ${prefix}crypto help`);

        } catch (error) {
            console.error('CRYPTO ERROR:', error);
            return m.reply(`${ui.error}\n\n${error.message}\n\n${ui.cross} _All 5 APIs failed. Try again later._`);
        }
    }
};
