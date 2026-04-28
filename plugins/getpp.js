const translate = require('google-translate-api-x');

module.exports = {
    command: "getpp",
    alias: ["getprofile", "pp"],
    category: "tools",
    description: "Get user profile picture from group or DM",
    
    async execute(m, sock, { args, userSettings }) {
        const lang = args.find(a => a.length === 2) || (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        // 1. Identify Target (Tag, Reply, or DM/JID)
        let target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                     m.message?.extendedTextMessage?.contextInfo?.participant || 
                     (m.isGroup ? null : m.chat);

        // Kama bado target haipo (labda kaandika namba mbele)
        if (!target && args[0]) {
            target = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        }

        // Configuration za kila Mode
        const modes = {
            harsh: {
                msg: "𝙷𝚎𝚛𝚎 𝚒𝚜 𝚝𝚑𝚎 𝚙𝚒𝚌𝚝𝚞𝚛𝚎 𝚘𝚏 𝚝𝚑𝚒𝚜 𝚞𝚜𝚎𝚕𝚎𝚜𝚜 𝚙𝚎𝚛𝚜𝚘𝚗. 🖕",
                react: "📸",
                err: "⚠️ 𝚃𝚑𝚒𝚜 𝚒𝚍𝚒𝚘𝚝 𝚑𝚒𝚍 𝚝𝚑𝚎𝚒𝚛 𝚙𝚒𝚌𝚝𝚞𝚛𝖾 𝚘𝚛 𝚒𝚝 𝚍𝚘𝚎𝚜𝚗'𝚝 𝚎𝚡𝚒𝚜𝚝."
            },
            normal: {
                msg: "𝗣𝗿𝗼𝗳𝗶𝗹𝗲 𝗣𝗶𝗰𝘁𝘂𝗿𝗲 𝘀𝘂𝗰𝗰𝗲𝘀𝘀𝗳𝘂𝗹𝗹𝘆 𝗿𝗲𝘁𝗿𝗶𝗲𝘃𝗲𝗱. ✅",
                react: "👤",
                err: "❌ 𝗨𝗻𝗮𝗯𝗹𝗲 𝘁𝗼 𝗳𝗲𝘁𝗰𝗵 𝗣𝗣: 𝗨𝘀𝗲𝗿 𝗽𝗿𝗶𝘃𝗮𝗰𝘆 𝗼𝗿 𝗻𝗼 𝗽𝗶𝗰𝘁𝘂𝗿𝗲."
            },
            girl: {
                msg: "𝒾 𝒻ℴ𝓊𝓃𝒹 𝓉𝒽ℯ𝒾𝓇 𝓅𝒽ℴ𝓉ℴ 𝒻ℴ𝓇 𝓎ℴ𝓊, 𝒷𝒶𝒷ℯ! 𝓈ℴ 𝒸𝓊𝓉ℯ ✨🌷",
                react: "🎀",
                err: "📂 ℴℴ𝓅𝓈𝒾ℯ! 𝒾 𝒸𝒶𝓃'𝓉 𝓈ℯℯ 𝓉𝒽ℯ𝒾𝓇 𝓅𝒾𝒸𝓉𝓊𝓇ℯ. 𝓈ℴ𝓌𝓌𝓎! 🌸"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            if (!target) return m.reply(current.err);

            // Send Reaction
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // Fetch Profile Picture URL
            let ppUrl;
            try {
                ppUrl = await sock.profilePictureUrl(target, 'image');
            } catch (e) {
                // Kama hakuna picha au ameficha
                return m.reply(current.err);
            }

            let caption = current.msg;
            if (lang !== 'en') {
                const res = await translate(caption, { to: lang });
                caption = res.text;
            }

            // Send Image
            await sock.sendMessage(m.chat, { image: { url: ppUrl }, caption: caption }, { quoted: m });

        } catch (error) {
            console.error("GetPP Error:", error);
            await sock.sendMessage(m.chat, { text: current.err });
        }
    }
};
