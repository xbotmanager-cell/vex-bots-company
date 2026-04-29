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
        
        // Logic ya kupata jina (Kama amereply meseji au ameandika mbele)
        let query = args.join(" ");
        if (!query && m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            query = m.message.extendedTextMessage.contextInfo.quotedMessage.conversation || 
                    m.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text;
        }

        const modes = {
            harsh: {
                title: "💀 𝕬𝕻𝕻 𝕴𝕹𝕿𝕰𝕷𝕷𝕴𝕲𝕰𝕹𝕮𝕰 💀",
                searching: "🔍 𝕴'𝖒 𝖉𝖎𝖌𝖌𝖎𝖓𝖌 𝖙𝖍𝖗𝖔𝖚𝖌𝖍 𝖙𝖍𝖊 𝖉𝖆𝖙𝖆. 𝖂𝖆𝖎𝖙, 𝖞𝖔𝖚 𝖚𝖘𝖊𝖑𝖊𝖘𝖘 𝖍𝖚𝖒𝖆𝖓... ⚡",
                react: "🛡️",
                err: "💢 𝖂𝖍𝖆𝖙 𝖆𝖕𝖕? 𝖄𝖔𝖚𝖗 𝖇𝖗𝖆𝖎𝖓 𝖎𝖘 𝖊𝖒𝖕𝖙𝖞, 𝖕𝖑𝖊𝖆𝖘𝖊 𝖕𝖗𝖔𝖛𝖎𝖉𝖊 𝖆 𝖓𝖆𝖒𝖊! 🤬"
            },
            normal: {
                title: "📱 App Inspector 📱",
                searching: "🔍 Searching for app details...",
                react: "🛰️",
                err: "❌ Please provide an app name."
            },
            girl: {
                title: "🎀 𝒜𝓅𝓅 𝒮𝓌𝑒𝑒𝓉𝒾𝑒 🎀",
                searching: "🔍 𝓁𝑒𝓉 𝓂𝑒 𝒻𝒾𝓃𝒹 𝓉𝒽𝒶𝓉 𝒶𝓅𝓅 𝒻𝑜𝓇 𝓎𝑜𝓊, 𝓂𝓎 𝓁𝑜𝓋𝑒𝓁𝓎 𝐿𝓊𝓅𝒾𝓃... ✨",
                react: "💎",
                err: "🌸 𝑜𝑜𝓅𝓈𝒾𝑒! 𝓌𝒽𝒾𝒸𝒽 𝒶𝓅𝓅 𝓈𝒽𝑜𝓊𝓁𝒹 𝒾 𝓁𝑜𝑜𝓀 𝒻𝑜𝓇, 𝒹𝒶𝓇𝓁𝒾𝓃𝑔? 🍭"
            }
        };

        const current = modes[style] || modes.normal;
        if (!query) return m.reply(current.err);

        await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

        try {
            let data;
            const isApple = query.toLowerCase().includes('appstore');
            const cleanQuery = query.replace(/appstore|playstore/gi, "").trim();

            if (isApple) {
                // APPLE APP STORE LOGIC
                const search = await store.search({ term: cleanQuery, num: 1 });
                data = search[0];
            } else {
                // GOOGLE PLAY STORE LOGIC (Smart Match)
                const search = await gplay.search({ term: cleanQuery, num: 1, fullDetail: true });
                data = search[0];
            }

            if (!data) return m.reply(current.err);

            // --- DATA PREPARATION ---
            let info = `*${current.title}*\n\n`;
            info += `📦 **Name:** ${data.title}\n`;
            info += `🏢 **Developer:** ${data.developer || data.artistName}\n`;
            info += `⭐ **Rating:** ${data.scoreText || data.score.toFixed(1)} / 5\n`;
            info += `💬 **Reviews:** ${data.reviews || 'N/A'}\n`;
            info += `📥 **Downloads:** ${data.installs || 'N/A'}\n`;
            info += `📏 **Size:** ${data.size || 'Varies'}\n`;
            info += `🛠️ **Version:** ${data.version || 'Latest'}\n`;
            info += `🔄 **Last Update:** ${data.updated || data.released}\n`;
            info += `💰 **In-App Purchases:** ${data.free ? 'No' : 'Yes'} / ${data.offersIAP ? '✅' : '❌'}\n`;
            info += `🚫 **Ads:** ${data.adSupported ? '✅ Contains Ads' : '❌ No Ads'}\n`;
            info += `🔞 **Content Rating:** ${data.contentRating || 'Everyone'}\n`;
            info += `🔗 **Link:** ${data.url}\n\n`;
            info += `📝 **Description:** ${data.summary || data.description.slice(0, 150)}...\n`;

            // --- TRANSLATION ENGINE ---
            if (lang !== 'en') {
                try {
                    const translated = await translate(info, { to: lang });
                    info = translated.text;
                } catch { /* Silent fail */ }
            }

            // --- DELIVERY ---
            await sock.sendMessage(m.chat, { 
                image: { url: data.icon || data.artworkUrl100 }, 
                caption: info 
            }, { quoted: m });

        } catch (error) {
            console.error("App Store Error:", error);
            await sock.sendMessage(m.chat, { react: { text: "🚫", key: m.key } });
        }
    }
};
