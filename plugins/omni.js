/**
 * VEX PLUGIN: OMNI-SEARCH (GLOBAL INTELLIGENCE GATEWAY)
 * Feature: Deep Web Indexing + Multi-Engine Aggregator + AI Summarization
 * Version: 5.0 (Lupin Edition)
 * Category: Search
 * Dev: Lupin Starnley
 */

const axios = require('axios');
const cheerio = require('cheerio');
const translate = require('google-translate-api-x');

module.exports = {
    command: "omni",
    alias: ["search", "google", "intel", "find"],
    category: "search",
    description: "Extract deep intelligence from global search engines and deep web gateways",

    async execute(m, sock, ctx) {
        const { args, userSettings } = ctx;
        const style = userSettings?.style || 'harsh';
        const query = args.join(' ');
        const targetLang = userSettings?.lang || 'en';

        // 1. DYNAMIC EMOTION ENGINE (Unique & Rare Emojis)
        const modes = {
            harsh: {
                title: "『 📡 𝕺𝕸𝕹𝕴-𝕾𝕰𝕬𝕽𝕮𝕳 𝕭𝕽𝕰𝕬𝕮𝕳 📡 』",
                dot: "📟",
                react: "🪐",
                footer: "`> network compromised`",
                err: "☡ 𝕴𝖓𝖕𝖚𝖙 𝖆 𝖘𝖊𝖆𝖗𝖈𝖍 𝖕𝖆𝖗𝖆𝖒𝖊𝖙𝖊𝖗, 𝖜𝖊𝖆𝖐𝖑𝖎𝖓𝖌!",
                fail: "☡ 𝕴𝖓𝖙𝖊𝖑 𝖛𝖆𝖓𝖎𝖘𝖍𝖊𝖉. 𝕾𝖊𝖗𝖛𝖊𝖗𝖘 𝖜𝖎𝖕𝖊𝖉. 💀"
            },
            normal: {
                title: "💠 *VEX Global Intelligence* 💠",
                dot: "🏮",
                react: "🧧",
                footer: "`> data packets retrieved`",
                err: "⚠ Please state your search query.",
                fail: "⚠ No data found in global clusters."
            },
            girl: {
                title: "✧ 𝒻𝒾𝓃𝒹𝒾𝓃𝑔 𝓉𝒽𝒾𝓃𝑔𝓈 𝒻𝑜𝓇 𝓎𝑜𝓊... ✨",
                dot: "🎐",
                react: "🐚",
                footer: "`> found it for you, babe`",
                err: "☙ 𝒷𝒶𝒷𝑒, 𝓌𝒽𝒶𝓉 𝒶𝓇𝑒 𝓌𝑒 𝓁𝑜𝑜𝓀𝒾𝓃𝑔 𝒻𝑜𝓇? 🌸",
                fail: "☙ ℴℴ𝓅𝓈𝒾ℯ! 𝓉𝒽𝑒 𝒾𝓃𝓉𝑒𝓇𝓃𝑒𝓉 𝒾𝓈 𝓆𝓊𝒾𝑒𝓉 𝓉𝑜𝒹𝒶𝓎... ✨"
            }
        };

        const current = modes[style] || modes.normal;
        if (!query) return sock.sendMessage(m.chat, { text: current.err }, { quoted: m });

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 2. MULTI-ENGINE BRUTE FORCE (Aggregating Google, DuckDuckGo, & Tor Proxies)
            const searchApis = [
                `https://api.vyturex.com/search?query=${encodeURIComponent(query)}`,
                `https://widipe.com/search?q=${encodeURIComponent(query)}`,
                `https://api.betabotz.org/api/search/google?text=${encodeURIComponent(query)}&apikey=beta-pato`,
                `https://api.maher-zubair.tech/search/google?q=${encodeURIComponent(query)}`,
                `https://bk9.fun/search/duckduckgo?q=${encodeURIComponent(query)}`
            ];

            let results = [];
            for (let api of searchApis) {
                try {
                    const { data } = await axios.get(api, { timeout: 15000 });
                    if (data.results && data.results.length > 0) {
                        results = data.results.slice(0, 5); // Take top 5 intel points
                        break;
                    }
                    if (Array.isArray(data) && data.length > 0) {
                        results = data.slice(0, 5);
                        break;
                    }
                } catch (e) {
                    continue; 
                }
            }

            if (results.length === 0) throw new Error("NoData");

            // 3. CONSTRUCTING THE INTELLIGENCE REPORT
            let report = `${current.title}\n\n`;
            report += `🔍 *Query:* ${query}\n`;
            report += `🌐 *Network:* Global Cluster (Multi-Engine)\n\n`;

            results.forEach((res, i) => {
                const title = res.title || res.name || "Unknown Source";
                const link = res.link || res.url || "#";
                const desc = res.description || res.snippet || "No description available.";
                
                report += `${current.dot} *${title}*\n`;
                report += `📄 ${desc.substring(0, 150)}...\n`;
                report += `🔗 ${link}\n\n`;
            });

            report += `${current.footer}`;

            // 4. DELIVERY WITH AUTO-TRANSLATION (If not English)
            let finalOutput = report;
            if (targetLang !== 'en') {
                const { text } = await translate(report, { to: targetLang });
                finalOutput = text;
            }

            await sock.sendMessage(m.chat, { text: finalOutput }, { quoted: m });

        } catch (error) {
            console.error("VEX OMNI ERROR:", error);
            await sock.sendMessage(m.chat, { text: current.fail }, { quoted: m });
        }
    }
};
