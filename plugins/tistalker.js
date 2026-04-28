const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    command: "tistalker",
    alias: ["ts", "tiktokstalk", "ttstalk"],
    category: "stalker",
    description: "Extract intelligence from any TikTok profile",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'harsh';
        const username = args[0]?.replace('@', '');

        // 1. STYLE ENGINE (No Lines - Only Symbols)
        const modes = {
            harsh: {
                title: "☠ ᴛɪᴋᴛᴏᴋ ʙʀᴇᴀᴄʜ ɪɴᴛᴇʟ ☠",
                dot: "✙",
                react: "🦾",
                footer: "`> profile exposed`"
            },
            normal: {
                title: "⚚ *TikTok Profile Insight* ⚚",
                dot: "•",
                react: "🔍",
                footer: "`> statistics retrieved`"
            },
            girl: {
                title: "✧ 𝓈𝓉𝒶𝓁𝓀𝒾𝓃ℯ 𝓉𝒾𝓀𝓉ℴ𝓀 𝒷𝒶𝒷ℯ... ✨",
                dot: "🌸",
                react: "🎀",
                footer: "`> data found`"
            }
        };

        const current = modes[style] || modes.normal;
        if (!username) return m.reply(`${current.dot} ᴘʟᴇᴀsᴇ ᴘʀᴏᴠɪᴅᴇ ᴀ ᴜsᴇʀɴᴀᴍᴇ.`);

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 2. SCRAPING ENGINE (Axios + Cheerio)
            const { data } = await axios.get(`https://www.tiktok.com/@${username}`, {
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
            });
            const $ = cheerio.cload(data);
            
            // Extracting JSON Data from TikTok Script tags (Safe Method)
            const jsonStr = $('#__UNIVERSAL_DATA_FOR_REHYDRATION__').text();
            const res = JSON.parse(jsonStr || '{}');
            const user = res?.__DEFAULT_SCOPE__?.['webapp.user-detail']?.userInfo;

            // 3. DATA HARVESTING (Fail-Safe)
            const profileData = {
                nick: user?.user?.nickname || "Unknown",
                bio: user?.user?.signature || "No Bio",
                followers: user?.stats?.followerCount || 0,
                following: user?.stats?.followingCount || 0,
                likes: user?.stats?.heartCount || 0,
                videos: user?.stats?.videoCount || 0,
                verified: user?.user?.verified ? "✅ Verified" : "❌ Standard",
                avatar: user?.user?.avatarLarger || null
            };

            // 4. CONSTRUCTING REPORT
            let report = `${current.title}\n\n`;
            report += `${current.dot} **Nickname:** ${profileData.nick}\n`;
            report += `${current.dot} **Status:** ${profileData.verified}\n`;
            report += `${current.dot} **Bio:** ${profileData.bio}\n`;
            report += `${current.dot} **Followers:** ${profileData.followers.toLocaleString()}\n`;
            report += `${current.dot} **Following:** ${profileData.following.toLocaleString()}\n`;
            report += `${current.dot} **Hearts:** ${profileData.likes.toLocaleString()}\n`;
            report += `${current.dot} **Total Videos:** ${profileData.videos}\n`;
            report += `${current.dot} **Link:** tiktok.com/@${username}\n\n`;
            report += `${current.footer}`;

            // 5. DELIVERY
            if (profileData.avatar) {
                await sock.sendMessage(m.chat, { 
                    image: { url: profileData.avatar }, 
                    caption: report 
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.chat, { text: report }, { quoted: m });
            }

        } catch (error) {
            console.error("TikTok Stalk Error:", error);
            // Minimalist Error Feedback
            await sock.sendMessage(m.chat, { 
                text: `☡ *INTEL ERROR:* Account may be private or deleted.\n\n${current.footer}` 
            });
        }
    }
};
