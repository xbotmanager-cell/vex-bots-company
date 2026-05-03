const axios = require("axios");

// simple retry helper
async function fetchWithRetry(url, retries = 3, timeout = 8000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await axios.get(url, { timeout });
        } catch (err) {
            if (i === retries - 1) throw err;
        }
    }
}

// safe username checker
function cleanUser(input) {
    if (!input) return null;
    const u = input.replace("@", "").trim();
    return /^[a-zA-Z0-9._]{1,30}$/.test(u) ? u : null;
}

module.exports = {
    command: "igstalker",
    alias: ["igs", "instastalk", "ig"],
    category: "stalker",
    description: "Extract Instagram profile intelligence (safe mode enhanced)",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || "normal";
        const user = cleanUser(args[0]);

        const modes = {
            harsh: {
                title: "⚓ ɪɴsᴛᴀɢʀᴀᴍ sᴜʀᴠᴇɪʟʟᴀɴᴄᴇ ⚓",
                bullet: "⚡",
                react: "⚔",
                footer: "`> identity compromised`"
            },
            normal: {
                title: "⚖ Instagram Profile Audit ⚖",
                bullet: "❂",
                react: "📸",
                footer: "`> audit complete`"
            },
            girl: {
                title: "✨ found you on insta 🎀",
                bullet: "💎",
                react: "🍭",
                footer: "`> profile peeked`"
            }
        };

        const current = modes[style] || modes.normal;

        if (!user) {
            return m.reply("⚠ Invalid username. Provide a valid Instagram handle.");
        }

        try {
            await sock.sendMessage(m.chat, {
                react: { text: current.react, key: m.key }
            });

            let stats;

            try {
                const url = `https://api.screenshotlayer.com/php_helper_scripts/instagram.php?username=${user}`;
                const res = await fetchWithRetry(url);
                stats = res?.data;
            } catch (apiErr) {
                console.error("Primary API failed:", apiErr.message);

                // fallback safe structure (no crash)
                stats = null;
            }

            // safe mapping (NO crash zone)
            const igData = {
                fullname: stats?.full_name || "Unknown",
                bio: stats?.biography || "No bio available",
                followers: stats?.edge_followed_by?.count ?? 0,
                following: stats?.edge_follow?.count ?? 0,
                posts: stats?.edge_owner_to_timeline_media?.count ?? 0,
                isPrivate: stats?.is_private ? "🔐 Private" : "🔓 Public",
                isVerified: stats?.is_verified ? "🛡 Verified" : "✖ Standard",
                profilePic: stats?.profile_pic_url_hd || stats?.profile_pic_url || null
            };

            let report =
`${current.title}

${current.bullet} Name: ${igData.fullname}
${current.bullet} Rank: ${igData.isVerified}
${current.bullet} Access: ${igData.isPrivate}
${current.bullet} Bio: ${igData.bio}
${current.bullet} Followers: ${igData.followers.toLocaleString()}
${current.bullet} Following: ${igData.following.toLocaleString()}
${current.bullet} Posts: ${igData.posts}
${current.bullet} Profile: instagram.com/${user}

${current.footer}`;

            // always respond (no fail forever)
            if (igData.profilePic) {
                await sock.sendMessage(m.chat, {
                    image: { url: igData.profilePic },
                    caption: report
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.chat, {
                    text: report + "\n\n⚠ Media unavailable, text-only mode."
                }, { quoted: m });
            }

        } catch (err) {
            console.error("IG module crash:", err);

            await sock.sendMessage(m.chat, {
                text:
`⚠ SYSTEM SAFE MODE ACTIVATED
• Unable to fetch Instagram data right now
• Try again in a few seconds
• Username: @${user || "unknown"}

> request completed with fallback mode`
            }, { quoted: m });
        }
    }
};
