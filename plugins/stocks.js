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
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for VEX Stocks');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

// =========================
// CONFIG
// =========================
const STOCKS_IMAGE = 'https://i.ibb.co/Myk40VZF/Chat-GPT-Image-May-10-2026-12-07-48-PM.png';
const TMP_DIR = path.join(__dirname, '../tmp');

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

// =========================
// 5 STOCK API FALLBACK
// =========================
const STOCK_APIS = [
    {
        name: 'twelvedata',
        url: (symbol) => `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${process.env.TWELVEDATA_KEY || 'demo'}`,
        parser: (data) => ({
            price: parseFloat(data.close),
            change: parseFloat(data.change),
            changePercent: parseFloat(data.percent_change),
            volume: parseInt(data.volume),
            high: parseFloat(data.fifty_two_week?.high),
            low: parseFloat(data.fifty_two_week?.low)
        })
    },
    {
        name: 'alpha_vantage',
        url: (symbol) => `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.ALPHA_VANTAGE_KEY || 'demo'}`,
        parser: (data) => {
            const q = data['Global Quote'];
            return {
                price: parseFloat(q['05. price']),
                change: parseFloat(q['09. change']),
                changePercent: parseFloat(q['10. change percent'].replace('%', '')),
                volume: parseInt(q['06. volume'])
            };
        }
    },
    {
        name: 'finnhub',
        url: (symbol) => `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_KEY || 'demo'}`,
        parser: (data) => ({
            price: data.c,
            change: data.d,
            changePercent: data.dp,
            volume: 0
        })
    },
    {
        name: 'polygon',
        url: (symbol) => `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?apiKey=${process.env.POLYGON_KEY || 'demo'}`,
        parser: (data) => {
            const r = data.results[0];
            return {
                price: r.c,
                change: r.c - r.o,
                changePercent: ((r.c - r.o) / r.o) * 100,
                volume: r.v,
                high: r.h,
                low: r.l
            };
        }
    },
    {
        name: 'yahoo_finance',
        url: (symbol) => `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
        parser: (data) => {
            const r = data.chart.result[0].meta;
            return {
                price: r.regularMarketPrice,
                change: r.regularMarketPrice - r.previousClose,
                changePercent: ((r.regularMarketPrice - r.previousClose) / r.previousClose) * 100,
                volume: r.regularMarketVolume
            };
        }
    }
];

// =========================
// DSE STOCKS TZ
// =========================
const DSE_STOCKS = {
    'CRDB': { name: 'CRDB Bank Plc', symbol: 'CRDB' },
    'NMB': { name: 'NMB Bank Plc', symbol: 'NMB' },
    'TBL': { name: 'Tanzania Breweries Ltd', symbol: 'TBL' },
    'TCC': { name: 'Tanzania Cigarette Co', symbol: 'TCC' },
    'TPCC': { name: 'Tanzania Portland Cement', symbol: 'TPCC' },
    'TOL': { name: 'TOL Gases Ltd', symbol: 'TOL' },
    'SWIS': { name: 'Swissport Tanzania', symbol: 'SWIS' },
    'DSE': { name: 'Dar es Salaam Stock Exchange', symbol: 'DSE' },
    'NICOL': { name: 'National Investments', symbol: 'NICOL' },
    'VODA': { name: 'Vodacom Tanzania', symbol: 'VODA' }
};

// =========================
// US STOCKS
// =========================
const US_STOCKS = {
    'AAPL': 'Apple Inc.',
    'TSLA': 'Tesla Inc.',
    'MSFT': 'Microsoft Corp.',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'META': 'Meta Platforms Inc.',
    'NVDA': 'NVIDIA Corp.',
    'NFLX': 'Netflix Inc.',
    'AMD': 'Advanced Micro Devices',
    'INTC': 'Intel Corp.'
};

// =========================
// HELPERS
// =========================
async function fetchStockPrice(symbol, isDSE = false) {
    // 1. Check Supabase cache - 3 min for US, 1 hour for DSE
    const cacheTime = isDSE? 3600000 : 180000;
    const table = isDSE? 'e_dse_stocks' : 'e_stocks';

    try {
        const { data: cached } = await supabase
         .from(table)
         .select('*')
         .eq('symbol', symbol.toUpperCase())
         .gte('last_updated', new Date(Date.now() - cacheTime).toISOString())
         .single();

        if (cached) return {...cached, cached: true, source: cached.source + ' ⭑' };
    } catch {}

    // 2. For DSE, scrape site
    if (isDSE) {
        try {
            const { data } = await axios.get('https://www.dse.co.tz/', { timeout: 10000 });
            const regex = new RegExp(`${symbol}.*?<td>([\\d,]+\\.\\d+)</td>`, 'i');
            const match = data.match(regex);
            if (match) {
                const price = parseFloat(match[1].replace(/,/g, ''));
                await saveStockPrice(symbol, DSE_STOCKS[symbol].name, price, 'dse.co.tz', true);
                return { symbol, name: DSE_STOCKS[symbol].name, price, source: 'dse.co.tz', cached: false };
            }
        } catch (err) {
            console.error('DSE Scrape failed:', err.message);
        }
    }

    // 3. Try US APIs
    if (!isDSE) {
        for (const api of STOCK_APIS) {
            try {
                const { data } = await axios.get(api.url(symbol), { timeout: 5000 });
                const parsed = api.parser(data);

                if (parsed.price &&!isNaN(parsed.price)) {
                    await saveStockPrice(symbol, US_STOCKS[symbol] || symbol, parsed.price, api.name, false, parsed);
                    return {
                        symbol,
                        name: US_STOCKS[symbol] || symbol,
                        price: parsed.price,
                        change: parsed.change,
                        change_percent: parsed.changePercent,
                        volume: parsed.volume,
                        high_52w: parsed.high,
                        low_52w: parsed.low,
                        source: api.name,
                        cached: false
                    };
                }
            } catch (err) {
                console.error(`API ${api.name} failed:`, err.message);
                continue;
            }
        }
    }

    // 4. Fallback to last known
    try {
        const { data: last } = await supabase
         .from(table)
         .select('*')
         .eq('symbol', symbol.toUpperCase())
         .order('last_updated', { ascending: false })
         .limit(1)
         .single();

        if (last) return {...last, cached: true, stale: true, source: last.source + ' ✧' };
    } catch {}

    throw new Error('All stock APIs failed and no cache available');
}

async function saveStockPrice(symbol, name, price, source, isDSE, extra = {}) {
    try {
        const table = isDSE? 'e_dse_stocks' : 'e_stocks';
        const data = isDSE? {
            symbol,
            name,
            price,
            source
        } : {
            symbol,
            name,
            price,
            change: extra.change || 0,
            change_percent: extra.changePercent || 0,
            volume: extra.volume || 0,
            high_52w: extra.high,
            low_52w: extra.low,
            exchange: 'NYSE',
            source
        };

        await supabase.from(table).upsert(data, { onConflict: 'symbol' });
    } catch (err) {
        console.error('Save stock error:', err.message);
    }
}

async function downloadImage(url) {
    const imgPath = path.join(TMP_DIR, `stocks_${Date.now()}.png`);
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
    if (!num) return 'N/A';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getTrendSymbol(change) {
    if (change > 5) return '🚀';
    if (change > 0) return '📈';
    if (change < -5) return '💥';
    if (change < 0) return '📉';
    return '➖';
}

module.exports = {
    command: "stocks",
    alias: ["stock", "shares", "dse", "equity"],
    category: "economy",
    description: "VEX Stocks Pro - Live US & DSE Stock Prices, Trends & Portfolio",

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
                title: "☣️ 𝖁𝕰𝖃 𝕾𝕿𝕺𝕮𝕶𝕾 ☣️",
                line: "━",
                price: "☣️ 𝕷𝕴𝖁𝕰 𝕻𝕽𝕴𝕮𝕰",
                dse: "☣️ 𝕯𝕾𝕰 𝕸𝕬𝕽𝕶𝕰𝕿",
                top: "☣️ 𝕿𝕺𝕻 𝕲𝕬𝕴𝕹𝕰𝕽𝕾",
                error: "☣️ 𝕸𝕬𝕽𝕶𝕰𝕿 𝕮𝕽𝕬𝕾𝕳",
                star: "⭑",
                sparkle: "✧",
                cross: "❋",
                diamond: "✦"
            },
            normal: {
                react: "📈",
                title: "📈 VEX STOCKS 📈",
                line: "─",
                price: "💰 Live Price",
                dse: "🇹🇿 DSE Market",
                top: "🏆 Top Gainers",
                error: "❌ Market Error",
                star: "⭐",
                sparkle: "✨",
                cross: "❄️",
                diamond: "💎"
            },
            girl: {
                react: "💖",
                title: "🫧 𝒱𝑒𝓍 𝒮𝓉𝑜𝒸𝓀𝓈 🫧",
                line: "┄",
                price: "💖 𝐿𝒾𝓋𝑒 𝒫𝓇𝒾𝒸𝑒~",
                dse: "💖 𝒟𝒮𝐸 𝑀𝒶𝓇𝓀𝑒𝓉~",
                top: "💖 𝒯𝑜𝓅 𝒢𝒶𝒾𝓃𝑒𝓇𝓈~",
                error: "💔 𝑀𝒶𝓇𝓀𝑒𝓉 𝐸𝓇𝑜𝓇~",
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
                const imgPath = await downloadImage(STOCKS_IMAGE);

                let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
                response += `${ui.star}┌─ ${ui.sparkle} STOCK MARKET ${ui.sparkle} ${ui.line.repeat(9)}${ui.star}\n`;
                response += `${ui.star}│\n`;
                response += `${ui.star}│ ${ui.diamond} 🇺🇸 US Stocks: AAPL, TSLA, MSFT\n`;
                response += `${ui.star}│ ${ui.diamond} 🇹🇿 DSE Stocks: CRDB, NMB, TBL\n`;
                response += `${ui.star}│ ${ui.diamond} 📊 Real-time Prices\n`;
                response += `${ui.star}│ ${ui.diamond} 📈 Trends & Charts\n`;
                response += `${ui.star}│\n`;
                response += `${ui.star}└${ui.line.repeat(25)}${ui.star}\n\n`;
                response += `${ui.cross} *COMMANDS* ${ui.cross}\n`;
                response += `${ui.diamond} ${prefix}stocks price AAPL - US stock\n`;
                response += `${ui.diamond} ${prefix}stocks dse CRDB - DSE stock\n`;
                response += `${ui.diamond} ${prefix}stocks top - Top gainers\n`;
                response += `${ui.diamond} ${prefix}stocks list - All stocks\n`;
                response += `${ui.diamond} ${prefix}stocks compare AAPL TSLA\n\n`;
                response += `${ui.star}_VEX Stocks - Created by Lupin Starnley_${ui.star}`;

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
            // 2. PRICE CHECK - US STOCKS
            // =========================
            if (action === 'price' || action === 'us') {
                const symbol = args[1]?.toUpperCase() || 'AAPL';
                const data = await fetchStockPrice(symbol, false);

                const trend = getTrendSymbol(data.change_percent);
                const changeColor = data.change_percent >= 0? '🟢' : '🔴';

                let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
                response += `${ui.price}\n\n`;
                response += `${ui.star}┌─ ${ui.sparkle} ${data.name} ${ui.sparkle} ${ui.line.repeat(8)}${ui.star}\n`;
                response += `${ui.star}│\n`;
                response += `${ui.star}│ ${ui.diamond} *Symbol:* ${data.symbol}\n`;
                response += `${ui.star}│ ${ui.diamond} *Price:* $${formatPrice(data.price)}\n`;
                response += `${ui.star}│ ${ui.diamond} *Change:* ${changeColor} ${data.change_percent?.toFixed(2) || 0}% ${trend}\n`;
                response += `${ui.star}│ ${ui.diamond} *Volume:* ${data.volume?.toLocaleString() || 'N/A'}\n`;
                response += `${ui.star}│ ${ui.diamond} *52W High:* $${formatPrice(data.high_52w)}\n`;
                response += `${ui.star}│ ${ui.diamond} *52W Low:* $${formatPrice(data.low_52w)}\n`;
                response += `${ui.star}│ ${ui.diamond} *Source:* ${data.source}\n`;
                response += `${ui.star}│ ${data.cached? data.stale? `${ui.cross} *Stale Data*` : `${ui.sparkle} *Cached*` : `${ui.star} *Live*`}\n`;
                response += `${ui.star}│\n`;
                response += `${ui.star}└${ui.line.repeat(25)}${ui.star}\n\n`;
                response += `${ui.cross} _NYSE: ${data.symbol}_`;

                return m.reply(response);
            }

            // =========================
            // 3. DSE STOCKS
            // =========================
            if (action === 'dse' || action === 'tz') {
                const symbol = args[1]?.toUpperCase() || 'CRDB';

                if (!DSE_STOCKS[symbol]) {
                    const list = Object.keys(DSE_STOCKS).join(', ');
                    return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n${ui.cross} Invalid DSE symbol!\n\n*Valid:* ${list}\n\n_VEX Stocks v2.0_`);
                }

                const data = await fetchStockPrice(symbol, true);

                let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
                response += `${ui.dse}\n\n`;
                response += `${ui.star}┌─ ${ui.sparkle} ${DSE_STOCKS[symbol].name} ${ui.sparkle} ${ui.line.repeat(5)}${ui.star}\n`;
                response += `${ui.star}│\n`;
                response += `${ui.star}│ ${ui.diamond} *Symbol:* ${symbol}\n`;
                response += `${ui.star}│ ${ui.diamond} *Price:* TZS ${formatPrice(data.price)}\n`;
                response += `${ui.star}│ ${ui.diamond} *Source:* DSE\n`;
                response += `${ui.star}│ ${data.cached? `${ui.sparkle} *Cached*` : `${ui.star} *Live*`}\n`;
                response += `${ui.star}│\n`;
                response += `${ui.star}└${ui.line.repeat(25)}${ui.star}\n\n`;
                response += `${ui.cross} _Dar es Salaam Stock Exchange_`;

                return m.reply(response);
            }

            // =========================
            // 4. TOP GAINERS
            // =========================
            if (action === 'top' || action === 'gainers') {
                const topStocks = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA'];
                const results = [];

                for (const stock of topStocks) {
                    try {
                        const data = await fetchStockPrice(stock, false);
                        results.push(data);
                    } catch {}
                }

                results.sort((a, b) => (b.change_percent || 0) - (a.change_percent || 0));

                let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
                response += `${ui.top}\n\n`;
                response += `${ui.star}┌─ ${ui.sparkle} TOP GAINERS ${ui.sparkle} ${ui.line.repeat(9)}${ui.star}\n`;
                response += `${ui.star}│\n`;

                results.slice(0, 7).forEach((stock, i) => {
                    const trend = getTrendSymbol(stock.change_percent);
                    const change = stock.change_percent >= 0? '🟢' : '🔴';
                    response += `${ui.star}│ ${ui.diamond} ${i + 1}. ${stock.symbol} $${formatPrice(stock.price)} ${change}${stock.change_percent?.toFixed(1)}% ${trend}\n`;
                });

                response += `${ui.star}│\n`;
                response += `${ui.star}└${ui.line.repeat(25)}${ui.star}\n\n`;
                response += `${ui.cross} _Updated: ${new Date().toLocaleTimeString()}_`;

                return m.reply(response);
            }

            // =========================
            // 5. LIST ALL STOCKS
            // =========================
            if (action === 'list') {
                let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
                response += `${ui.star}┌─ ${ui.sparkle} STOCK LIST ${ui.sparkle} ${ui.line.repeat(10)}${ui.star}\n`;
                response += `${ui.star}│\n`;
                response += `${ui.star}│ ${ui.diamond} *US STOCKS:*\n`;
                response += `${ui.star}│ ${Object.keys(US_STOCKS).join(', ')}\n`;
                response += `${ui.star}│\n`;
                response += `${ui.star}│ ${ui.diamond} *DSE STOCKS:*\n`;
                response += `${ui.star}│ ${Object.keys(DSE_STOCKS).join(', ')}\n`;
                response += `${ui.star}│\n`;
                response += `${ui.star}└${ui.line.repeat(25)}${ui.star}\n\n`;
                response += `${ui.cross} _Use ${prefix}stocks price AAPL_\n`;
                response += `${ui.cross} _Use ${prefix}stocks dse CRDB_`;

                return m.reply(response);
            }

            return m.reply(`${ui.error}\n\nUse ${prefix}stocks help`);

        } catch (error) {
            console.error('STOCKS ERROR:', error);
            return m.reply(`${ui.error}\n\n${error.message}\n\n${ui.cross} _All 5 APIs failed. Try again later._`);
        }
    }
};
