const axios = require("axios");
const cheerio = require("cheerio");
const translate = require("google-translate-api-x");

module.exports = {
    command: "top",
    alias: ["googleai", "aitop", "searchai"],
    category: "search",
    description: "Get top results from Google AI Overview",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'normal';
        const lang = userSettings?.lang || 'en';

        // =========================
        // CHUKUA QUERY: ARGS AU REPLY
        // =========================
        let query = args.join(" ").trim();

        // Kama hakuna args, check kama amereply message
        if (!query && m.quoted) {
            query = m.quoted.conversation ||
                    m.quoted.extendedTextMessage?.text || "";
        }

        // =========================
        // STYLES ZA REPORT
        // =========================
        const designs = {
            harsh: {
                react: "☣️",
                title: "☣️ 𝙑𝙀𝙓 𝘼𝙄 𝙎𝙀𝘼𝙍𝘾𝙃 ☣️",
                error: `☣️ 𝙀𝙍𝙊𝙍 ☣️\n\n➤ 𝙍𝙚𝙖𝙨𝙤𝙣: 𝙉𝙊 𝙌𝙐𝙀𝙍𝙔\n➤ 𝙐𝙨𝙖𝙜𝙚:.top richest people\n➤ 𝙊𝙍 𝙍𝙚𝙥𝙡𝙮 𝙩𝙤 𝙩𝙚𝙭𝙩\n\n⚠️ 𝘾𝙊𝙈𝘼𝙉𝘿 𝙁𝘼𝙄𝙇𝙀𝘿`,
                noResult: `☣️ 𝙉𝙊 𝙍𝙀𝙎𝙐𝙇𝙏 ☣️\n\n➤ 𝙂𝙤𝙤𝙜𝙡𝙚 𝙗𝙡𝙤𝙘𝙠𝙚𝙙 𝙧𝙚𝙦𝙪𝙚𝙨𝙩\n➤ 𝙏𝙧𝙮 𝙖𝙜𝙖𝙞𝙣 𝙡𝙖𝙩𝙚𝙧\n\n⚠️ 𝙎𝙔𝙎𝙏𝙀𝙈 𝙀𝙍𝙊𝙍`
            },
            normal: {
                react: "🔍",
                title: "🔍 VEX AI SEARCH",
                error: `❌ *ERROR*\n\n➤ Reason: No query provided\n➤ Usage:.top richest people\n➤ OR Reply to text\n\n⚠️ Command Failed`,
                noResult: `❌ *NO RESULT*\n\n➤ Google blocked request\n➤ Try again later\n\n⚠️ System Error`
            },
            girl: {
                react: "💖",
                title: "💖 𝑽𝑬𝑿 𝑨𝑰 𝑺𝑬𝑨𝑹𝑪𝑯 💖",
                error: `💔 𝑶𝑶𝑷𝑺 💔\n\n➤ 𝑹𝒆𝒂𝒔𝒐𝒏: 𝑵𝒐 𝒒𝒖𝒆𝒓𝒚\n➤ 𝑼𝒔𝒂𝒈𝒆:.top richest people\n➤ 𝑶𝑹 𝑹𝒆𝒑𝒍𝒚 𝒕𝒐 𝒕𝒆𝒙𝒕\n\n🌸 𝑻𝒓𝒚 𝑨𝒈𝒂𝒊𝒏`,
                noResult: `💔 𝑵𝑶 𝑹𝑬𝑺𝑼𝑳𝑻 💔\n\n➤ 𝑮𝒐𝒈𝒍𝒆 𝒃𝒍𝒐𝒄𝒌𝒆𝒅 𝒓𝒆𝒒𝒖𝒆𝒔𝒕\n➤ 𝑻𝒓𝒚 𝒂𝒈𝒂𝒊𝒏 𝒍𝒂𝒕𝒆𝒓\n\n🌸 𝑺𝒚𝒔𝒕𝒆𝒎 𝑬𝒓𝒐𝒓`
            }
        };

        const ui = designs[style] || designs.normal;

        if (!query) {
            await sock.sendMessage(m.chat, {
                react: { text: "❌", key: m.key }
            });
            return sock.sendMessage(m.chat, { text: ui.error }, { quoted: m });
        }

        // REACT PAPO HAPO
        await sock.sendMessage(m.chat, {
            react: { text: ui.react, key: m.key }
        });

        try {
            // =========================
            // SCRAPE GOOGLE
            // =========================
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=en`;

            const { data } = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: 15000
            });

            const $ = cheerio.load(data);
            let result = "";

            // 1. JARIBU KUCHUKUA AI OVERVIEW
            const aiOverview = $('div[data-attrid="SGEFeatures"] span').first().text() ||
                              $('div[jsname="V1ur5d"]').text() ||
                              $('.hgKElc').text();

            if (aiOverview && aiOverview.length > 50) {
                result = aiOverview.trim();
            } else {
                // 2. KAMA HAKUNA AI, CHUKUA TOP 3 RESULTS
                const results = [];
                $('div.g').slice(0, 3).each((i, el) => {
                    const title = $(el).find('h3').text();
                    const snippet = $(el).find('.VwiC3b').text() || $(el).find('.s3v9rd').text();
                    if (title && snippet) {
                        results.push(`${i + 1}. *${title}*\n${snippet}`);
                    }
                });

                if (results.length > 0) {
                    result = `*Top Google Results:*\n\n${results.join('\n\n')}`;
                }
            }

            if (!result) {
                return sock.sendMessage(m.chat, { text: ui.noResult }, { quoted: m });
            }

            // =========================
            // TRANSLATE KAMA SIO EN
            // =========================
            if (lang!== 'en') {
                try {
                    const translated = await translate(result, { to: lang });
                    result = translated.text;
                } catch {}
            }

            // =========================
            // TUMA RESULT
            // =========================
            let finalText = `
╭━━━〔 ${ui.title} 〕━━━╮

┃ 🔍 Query: ${query.slice(0, 50)}
┃ 🌐 Source: Google AI
┃ 🕒 Time: ${new Date().toLocaleTimeString()}

┣━━━━━━━━━━━━━━━━

${result}

╰━━━━━━━━━━━━━━━━━━╯

⚡ VEX AI SYSTEM
`;

            await sock.sendMessage(m.chat, {
                text: finalText,
                mentions: [m.sender]
            }, { quoted: m });

        } catch (err) {
            console.log("TOP ERROR:", err.message);

            await sock.sendMessage(m.chat, {
                react: { text: "❌", key: m.key }
            });

            await sock.sendMessage(m.chat, {
                text: ui.noResult.replace("Google blocked request", err.message.slice(0, 30))
            }, { quoted: m });
        }
    }
};
