const axios = require('axios');

module.exports = {
    command: "igstalker",
    alias: ["igs", "instastalk", "ig"],
    category: "stalker",
    description: "Extract deep intelligence from Instagram profiles",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'harsh';
        const user = args[0]?.replace('@', '');

        // 1. FRESH ARCHITECTURE (New Symbols - No Repetition)
        const modes = {
            harsh: {
                title: "⚓ ɪɴsᴛᴀɢʀᴀᴍ sᴜʀᴠᴇɪʟʟᴀɴᴄᴇ ⚓",
                bullet: "⚡",
                react: "⚔",
                footer: "`> identity compromised`"
            },
            normal: {
                title: "⚖ *Instagram Profile Audit* ⚖",
                bullet: "❂",
                react: "📸",
                footer: "`> audit complete`"
            },
            girl: {
                title: "✨ 𝒻ℴ𝓊𝓃𝒹 𝓎ℴ𝓊 ℴ𝓃 𝒾𝓃𝓈𝓉𝒶! 🎀",
                bullet: "💎",
                react: "🍭",
                footer: "`> profile peeked`"
            }
        };

        const current = modes[style] || modes.normal;
        if (!user) return m.reply("☡ *Entry Denied:* Provide a username.");

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 2. INTEL HARVESTING (Rapid API / Scraper alternative)
            const { data } = await axios.get(`https://api.screenshotlayer.com/php_helper_scripts/instagram.php?username=${user}`); 
            // Kumbuka: Hii ni njia mbadala ya haraka, unaweza kutumia API yoyote ya IG unayopenda.
            
            const stats = data; 

            // 3. DATA STRUCTURE
            const igData = {
                fullname: stats.full_name || "Unknown Entity",
                bio: stats.biography || "No Bio Data",
                followers: stats.edge_followed_by?.count || 0,
                following: stats.edge_follow?.count || 0,
                posts: stats.edge_owner_to_timeline_media?.count || 0,
                isPrivate: stats.is_private ? "🔐 Private Account" : "🔓 Public Account",
                isVerified: stats.is_verified ? "🛡 Verified" : "✖ Standard",
                profilePic: stats.profile_pic_url_hd || stats.profile_pic_url
            };

            // 4. THE INTEL REPORT (New Layout)
            let report = `${current.title}\n\n`;
            report += `${current.bullet} **Name:** ${igData.fullname}\n`;
            report += `${current.bullet} **Rank:** ${igData.isVerified}\n`;
            report += `${current.bullet} **Access:** ${igData.isPrivate}\n`;
            report += `${current.bullet} **Bio:** ${igData.bio}\n`;
            report += `${current.bullet} **Followers:** ${igData.followers.toLocaleString()}\n`;
            report += `${current.bullet} **Following:** ${igData.following.toLocaleString()}\n`;
            report += `${current.bullet} **Assets:** ${igData.posts} Posts\n`;
            report += `${current.bullet} **Link:** instagram.com/${user}\n\n`;
            report += `${current.footer}`;

            // 5. DELIVERY
            if (igData.profilePic) {
                await sock.sendMessage(m.chat, { 
                    image: { url: igData.profilePic }, 
                    caption: report 
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.chat, { text: report }, { quoted: m });
            }

        } catch (error) {
            console.error("IG Stalk Error:", error);
            await sock.sendMessage(m.chat, { 
                text: `⚖ *SYSTEM BREACH:* Could not fetch data for this user.\n\n${current.footer}` 
            });
        }
    }
};
