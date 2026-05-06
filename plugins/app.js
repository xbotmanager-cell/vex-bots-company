const axios = require("axios");
const cheerio = require("cheerio");
const gplay = require('google-play-scraper');
const store = require('app-store-scraper');
const translate = require('google-translate-api-x');

module.exports = {
    command: "app",
    alias: ["playstore", "appstore", "software"],
    category: "tools",
    description: "Fetch app details from PlayStore or AppStore",

    async execute(m, sock, { args, userSettings }) {

        const lang = userSettings?.lang || 'en';
        const style = userSettings?.style || 'harsh';

        let query = args.join(" ");

        if (!query && m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            query =
                m.message.extendedTextMessage.contextInfo.quotedMessage.conversation ||
                m.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text;
        }

        const modes = {
            harsh: {
                title: "💀 𝕬𝕻𝕻 𝕴𝕹𝕿𝕰𝕷𝕷𝕴𝕲𝕰𝕹𝕮𝕰 💀",
                searching: "🔍 𝕴'𝖒 𝖉𝖎𝖌𝖌𝖎𝖓𝖌 𝖙𝖍𝖗𝖔𝖚𝖌𝖍 𝖉𝖆𝖙𝖆...",
                react: "🛡️",
                err: "💢 𝖕𝖑𝖊𝖆𝖘𝖊 𝖕𝖗𝖔𝖛𝖎𝖉𝖊 𝖆𝖕𝖕 𝖓𝖆𝖒𝖊!"
            },
            normal: {
                title: "📱 App Inspector 📱",
                searching: "🔍 Searching app...",
                react: "🛰️",
                err: "❌ Please provide app name."
            },
            girl: {
                title: "🎀 𝒜𝓅𝓅 𝒮𝓌𝑒𝑒𝓉𝒾𝑒 🎀",
                searching: "✨ finding app for you...",
                react: "💎",
                err: "🌸 tell me app name please~"
            }
        };

        const current = modes[style] || modes.normal;

        if (!query) return m.reply(current.err);

        await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

        try {

            let data = null;
            const isApple = /appstore/i.test(query);
            const cleanQuery = query.replace(/appstore|playstore/gi, "").trim();

            // ================= PLAYSTORE =================
            if (!isApple) {
                try {
                    const search = await gplay.search({
                        term: cleanQuery,
                        num: 1,
                        fullDetail: true
                    });

                    data = search?.[0] || null;
                } catch (e) {
                    console.log("PlayStore error:", e.message);
                }
            }

            // ================= APPSTORE =================
            if (isApple) {
                try {
                    const search = await store.search({
                        term: cleanQuery,
                        num: 1
                    });

                    data = search?.[0] || null;
                } catch (e) {
                    console.log("AppStore error:", e.message);
                }
            }

            // ================= CHEERIO FALLBACK (SAFE SCRAPING) =================
            if (!data) {
                try {
                    const url = `https://www.google.com/search?q=${encodeURIComponent(cleanQuery + " app")}`;
                    const res = await axios.get(url, {
                        headers: { "User-Agent": "Mozilla/5.0" }
                    });

                    const $ = cheerio.load(res.data);

                    data = {
                        title: $("h3").first().text() || cleanQuery,
                        summary: "No official store data found (scraped fallback)",
                        url
                    };

                } catch (e) {
                    console.log("Cheerio fallback failed:", e.message);
                }
            }

            if (!data) return m.reply(current.err);

            // ================= FORMAT OUTPUT =================
            let info = `*${current.title}*\n\n`;
            info += `📦 Name: ${data.title || "Unknown"}\n`;
            info += `🏢 Developer: ${data.developer || data.artistName || "N/A"}\n`;
            info += `⭐ Rating: ${data.scoreText || data.score || "N/A"}\n`;
            info += `💬 Reviews: ${data.reviews || "N/A"}\n`;
            info += `📥 Downloads: ${data.installs || "N/A"}\n`;
            info += `📏 Size: ${data.size || "Varies"}\n`;
            info += `🛠 Version: ${data.version || "Latest"}\n`;
            info += `🔗 Link: ${data.url || "N/A"}\n\n`;
            info += `📝 Description: ${(data.summary || data.description || "No description").slice(0, 200)}...\n`;

            // ================= TRANSLATE SAFE =================
            if (lang !== 'en') {
                try {
                    const translated = await translate(info, { to: lang });
                    info = translated.text;
                } catch (e) {
                    console.log("Translate failed:", e.message);
                }
            }

            // ================= SEND =================
            await sock.sendMessage(m.chat, {
                image: { url: data.icon || data.artworkUrl100 || "" },
                caption: info
            }, { quoted: m });

        } catch (error) {
            console.error("APP COMMAND ERROR:", error);
            await sock.sendMessage(m.chat, {
                react: { text: "🚫", key: m.key }
            });
        }
    }
};
