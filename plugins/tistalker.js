const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    command: "tistalker",
    alias: ["ts", "tiktokstalk", "ttstalk"],
    category: "stalker",
    description: "Extract deep intelligence from TikTok profiles",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'harsh';
        const username = args[0]?.replace('@', '');

        // 1. DYNAMIC EMOTION ENGINE (Harsh, Girl, Normal)
        const modes = {
            harsh: {
                title: "☠ ᴛɪᴋᴛᴏᴋ ʙʀᴇᴀᴄʜ ɪɴᴛᴇʟ ☠",
                dot: "✙",
                react: "🖕",
                footer: "`> trash exposed`",
                err: "☡ ᴡʜᴇʀᴇ ɪs ᴛʜᴇ ᴜsᴇʀɴᴀᴍᴇ, ʏᴏᴜ ꜰᴜᴄᴋɪɴɢ ɪᴅɪᴏᴛ?",
                fail: "☡ ᴛᴀʀɢᴇᴛ ᴠᴀɴɪsʜᴇᴅ ᴏʀ ᴘʀɪᴠᴀᴛᴇ. ᴡᴀsᴛᴇ ᴏꜰ ᴛɪᴍᴇ. 🖕"
            },
            normal: {
                title: "⚚ *TikTok Profile Insight* ⚚",
                dot: "•",
                react: "🔍",
                footer: "`> statistics retrieved`",
                err: "⚠ Please provide a username.",
                fail: "⚠ Account not found or protected."
            },
            girl: {
                title: "✧ 𝓈𝓉𝒶𝓁𝓀𝒾𝓃ℊ 𝓉𝒾𝓀𝓉ℴ𝓀 𝒷𝒶𝒷ℯ... ✨",
                dot: "🌸",
                react: "🎀",
                footer: "`> data found`",
                err: "☙ 𝒷𝒶𝒷ℯ, 𝒾 𝓃ℯℯ𝒹 𝒶 𝓊𝓈ℯ𝓇𝓃𝒶𝓂ℯ 𝓅𝓁ℯ𝒶𝓈ℯ! 🌸",
                fail: "☙ ℴℴ𝓅𝓈𝒾ℯ! 𝒾 𝒸𝒶𝓃'𝓉 𝒻𝒾𝓃𝒹 𝓉𝒽ℯ𝓂 𝒹𝒶𝓇𝓁𝒾𝓃ℊ... ✨"
            }
        };

        const current = modes[style] || modes.normal;
        if (!username) return m.reply(current.err);

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 2. VEX CORE ENGINE (Scraping)
            const { data } = await axios.get(`https://www.tiktok.com/@${username}`, {
                headers: { 
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" 
                }
            });
            const $ = cheerio.load(data);
            
            // Pro-Level Data Extraction
            const scriptData = $('#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
            if (!scriptData) throw new Error("NoData");

            const jsonData = JSON.parse(scriptData).__DEFAULT_SCOPE__['webapp.user-detail'];
            const userInfo = jsonData.userInfo.user;
            const userStats = jsonData.userInfo.stats;

            // 3. CONSTRUCTING REPORT
            let report = `${current.title}\n\n`;
            report += `${current.dot} **Name:** ${userInfo.nickname}\n`;
            report += `${current.dot} **Status:** ${userInfo.verified ? "Verified ✅" : "Standard ✖"}\n`;
            report += `${current.dot} **Privacy:** ${userInfo.privateAccount ? "Locked 🔐" : "Open 🔓"}\n`;
            report += `${current.dot} **Bio:** ${userInfo.signature || "Empty"}\n`;
            report += `${current.dot} **Followers:** ${userStats.followerCount.toLocaleString()}\n`;
            report += `${current.dot} **Following:** ${userStats.followingCount.toLocaleString()}\n`;
            report += `${current.dot} **Hearts:** ${userStats.heartCount.toLocaleString()}\n`;
            report += `${current.dot} **Videos:** ${userStats.videoCount}\n`;
            report += `${current.dot} **Link:** tiktok.com/@${username}\n\n`;
            report += `${current.footer}`;

            // 4. DELIVERY
            await sock.sendMessage(m.chat, { 
                image: { url: userInfo.avatarLarger }, 
                caption: report 
            }, { quoted: m });

        } catch (error) {
            console.error("TikTok Stalk Error:", error);
            await sock.sendMessage(m.chat, { text: current.fail });
        }
    }
};
