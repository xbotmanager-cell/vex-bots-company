const { getContentType } = require('@whiskeysockets/baileys');

module.exports = {
    command: "wastalker",
    alias: ["ws"],
    category: "stalker",
    description: "Gather intelligence on a WhatsApp user",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'harsh';
        
        // 1. TARGET IDENTIFICATION
        let user = m.quoted ? m.quoted.sender : 
                   (m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : 
                   (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : m.chat));

        // 2. STYLES & SYMBOLS
        const modes = {
            harsh: {
                title: "✙ ᴡᴀ-sᴛᴀʟᴋᴇʀ ɪɴᴛᴇʟ ✙",
                dot: "✙",
                react: "👁‍🗨",
                footer: "`> target exposed`"
            },
            normal: {
                title: "⚚ *WhatsApp Profile Intel* ⚚",
                dot: "•",
                react: "🔍",
                footer: "`> data retrieved`"
            },
            girl: {
                title: "🎀 𝓈𝓉𝒶𝓁𝓀𝒾𝓃ℊ 𝓎ℴ𝓊𝓇 𝓅𝓇ℴ𝒻𝒾𝓁ℯ... ✨",
                dot: "🌸",
                react: "💎",
                footer: "`> secrets found`"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 3. DATA HARVESTING (Independent Blocks)
            let ppUrl, bio, privacy, isBusiness, commonGroups;

            // Profile Picture
            try { ppUrl = await sock.profilePictureUrl(user, 'image'); } catch { ppUrl = null; }

            // Bio / Status
            try { 
                const statusData = await sock.fetchStatus(user);
                bio = statusData.status || "Hidden/None";
            } catch { bio = "Hidden/Private"; }

            // Common Groups
            try {
                const groups = await sock.groupFetchAllParticipating();
                commonGroups = Object.values(groups).filter(g => 
                    g.participants.some(p => p.id === user)
                ).length;
            } catch { commonGroups = "0"; }

            // Business Check
            try {
                const biz = await sock.getBusinessProfile(user);
                isBusiness = biz ? "WhatsApp Business" : "Messenger WhatsApp";
            } catch { isBusiness = "Messenger WhatsApp"; }

            // Privacy/Verification (Simulated Intelligence)
            const isVerified = user.includes('verified') ? "✅ Verified Account" : "❌ Standard Account";
            const rawNumber = user.split('@')[0];

            // 4. CONSTRUCTING THE INTEL REPORT
            let report = `${current.title}\n\n`;
            report += `${current.dot} **Number:** ${rawNumber}\n`;
            report += `${current.dot} **Type:** ${isBusiness}\n`;
            report += `${current.dot} **Status:** ${isVerified}\n`;
            report += `${current.dot} **Bio:** ${bio}\n`;
            report += `${current.dot} **Mutual Groups:** ${commonGroups}\n`;
            report += `${current.dot} **JID:** ${user}\n`;
            report += `${current.dot} **Link:** wa.me/${rawNumber}\n\n`;
            report += `${current.footer}`;

            // 5. DELIVERY
            if (ppUrl) {
                await sock.sendMessage(m.chat, { 
                    image: { url: ppUrl }, 
                    caption: report 
                }, { quoted: m });
            } else {
                await sock.sendMessage(m.chat, { text: report }, { quoted: m });
            }

        } catch (error) {
            console.error("Stalker Error:", error);
            await sock.sendMessage(m.chat, { text: `☡ *INTEL FAIL:* ${error.message}` });
        }
    }
};
