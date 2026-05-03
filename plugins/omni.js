/**
 * VEX PLUGIN: GOOGLE NEXUS SEARCH ENGINE
 * Feature: Multi-Engine Search Aggregation + Ranked Intelligence Feed
 */

const axios = require("axios");
const translate = require("google-translate-api-x");

module.exports = {
    command: "google",
    alias: ["gsearch", "nexus", "intel", "search"],
    category: "search",
    description: "Global AI search intelligence engine",

    async execute(m, sock, { args, userSettings }) {

        // ================= INPUT =================
        const query = args.join(" ");
        const lang = userSettings?.lang || "en";
        const style = userSettings?.style || "normal";

        if (!query) {
            return m.reply("❌ Please provide a search query.");
        }

        // ================= STYLES =================
        const modes = {
            harsh: {
                title: "📡 『 GOOGLE NEXUS BREACH 』",
                dot: "🧨",
                react: "🪐",
                footer: "`> classified network results`",
                fail: "☠ No intel found in global grid."
            },
            normal: {
                title: "🌐 GOOGLE NEXUS SEARCH ENGINE",
                dot: "🔎",
                react: "📡",
                footer: "`> powered by global clusters`",
                fail: "⚠ No results found."
            },
            girl: {
                title: "✨ 𝒢𝑜𝑜𝑔𝓁𝑒 𝒩𝑒𝓍𝓊𝓈 𝒟𝑒𝓁𝒾𝑔𝒽𝓉 ✨",
                dot: "🎀",
                react: "💖",
                footer: "`> found something cute for you`",
                fail: "💔 nothing found sweetheart..."
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, {
                react: { text: current.react, key: m.key }
            });

            // ================= MULTI ENGINE SEARCH =================
            const engines = [
                `https://api.vyturex.com/search?query=${encodeURIComponent(query)}`,
                `https://widipe.com/search?q=${encodeURIComponent(query)}`,
                `https://bk9.fun/search/duckduckgo?q=${encodeURIComponent(query)}`,
                `https://api.maher-zubair.tech/search/google?q=${encodeURIComponent(query)}`
            ];

            let results = [];

            for (const url of engines) {
                try {
                    const { data } = await axios.get(url, { timeout: 15000 });

                    if (data?.results?.length) {
                        results = data.results;
                        break;
                    }

                    if (Array.isArray(data) && data.length) {
                        results = data;
                        break;
                    }

                } catch {}
            }

            if (!results.length) {
                return m.reply(current.fail);
            }

            // ================= BUILD RANKED RESULTS =================
            let output = `${current.title}\n`;
            output += `━━━━━━━━━━━━━━━━━━\n`;
            output += `🔍 Query: ${query}\n`;
            output += `📊 Results Ranked: ${results.length}\n\n`;

            results.slice(0, 7).forEach((r, i) => {

                const title = r.title || r.name || "Unknown Source";
                const desc = r.description || r.snippet || "No description available";
                const link = r.link || r.url || "#";

                output += `${current.dot} *#${i + 1} ${title}*\n`;
                output += `📄 ${desc.substring(0, 140)}...\n`;
                output += `🔗 ${link}\n`;
                output += `━━━━━━━━━━━━━━━━━━\n`;
            });

            output += `\n${current.footer}`;

            // ================= TRANSLATION =================
            let finalText = output;

            try {
                if (lang !== "en") {
                    const { text } = await translate(output, { to: lang });
                    finalText = text;
                }
            } catch {
                finalText = output;
            }

            await sock.sendMessage(m.chat, {
                text: finalText
            }, { quoted: m });

        } catch (error) {
            console.error("GOOGLE NEXUS ERROR:", error);
            m.reply("⚠ Search engine failed. Try again.");
        }
    }
};
