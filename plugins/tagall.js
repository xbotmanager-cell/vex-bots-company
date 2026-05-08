const translate = require('google-translate-api-x');

/**
 * VEX TAGALL SYSTEM - UNLOCKED VERSION
 * No Admin Restriction | High-Speed Mention Logic | GROUP FIXED
 */

module.exports = {
    command: "tagall",
    alias: ["all"],
    category: "group",
    description: "Tag every member in the group with stylized UI",

    async execute(m, sock, ctx) {
        const { args, userSettings } = ctx;

        // FIXED: Ensure command is only used in groups - m.isGroup haipo
        const isGroup = m.chat.endsWith('@g.us');
        if (!isGroup) return m.reply("❌ This command can only be used within a group.");

        // Fetch Group Data with Fallback
        let groupMetadata;
        try {
            groupMetadata = await sock.groupMetadata(m.chat);
        } catch (e) {
            return m.reply("⚠️ *VEX_ERROR:* Could not retrieve group metadata. Bot may have been removed.");
        }

        const participants = groupMetadata.participants || [];

        if (participants.length === 0) {
            return m.reply("⚠️ *VEX_ERROR:* Could not retrieve group members. Please try again.");
        }

        // Configuration
        const lang = args.find(a => a.length === 2) || (userSettings?.lang || 'en');
        const style = userSettings?.style?.value || userSettings?.style || 'harsh';
        const customMsg = args.filter(a => a.length!== 2).join(" ");

        // UI FONT MATRIX
        const ui = {
            harsh: {
                h: "『 ⚡ 𝖁𝕰𝖃 𝕬𝕹𝕹𝕴𝕳𝕴𝕷𝕬𝕿𝕴𝕺𝕹 ⚡ 』\n",
                msg: customMsg || "𝖂𝖆𝖐𝖊 𝖚𝖕, 𝖞𝖔𝖚 𝖑𝖆𝖟𝖞 𝖕𝖎𝖊𝖈𝖊𝖘 𝖔𝖋 𝖘𝖍*𝖙!",
                adminHead: "\n\n💀 *𝕮𝕺𝕸𝕬𝕹𝕯𝕰𝕽𝖲 (𝕬𝕯𝕸𝕴𝕹𝖲):*\n",
                bullet: "🔥 ❯ ",
                f: "\n\n_Stop ignoring me or face the consequences._ 🖕",
                react: "🔥"
            },
            normal: {
                h: "╭───〔 📢 𝗩𝗘𝗫 𝗕𝗥𝗢𝗔𝗗𝗖𝗔𝗦𝗧 〕───╮\n",
                msg: customMsg || "Attention everyone, check this update!",
                adminHead: "\n\n🛡️ *𝗚𝗥𝗢𝗨𝗣 𝗔𝗗𝗠𝗜𝗡𝗦:*\n",
                bullet: "❯❯ ",
                f: "\n╰────────────────────────╯",
                react: "📢"
            },
            girl: {
                h: "🌸✨ 𝓥𝓮𝔁 𝓢𝔀𝓮𝓮𝓽 𝓝𝓸𝓽𝓲𝓬𝓮 ✨🌸\n",
                msg: customMsg || "Hey babies, look here for a second? 🎀",
                adminHead: "\n\n👑 *𝓜𝔂 𝓛𝓸𝓿𝓮𝓵𝔂 𝓐𝓭𝓶𝓲𝓷𝓼:*\n",
                bullet: "🍭 ❯ ",
                f: "\n\n_Stay sweet!_ 💖🌸",
                react: "💖"
            }
        };

        const current = ui[style] || ui.normal;

        try {
            // Send Reaction
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            const admins = participants.filter(p => p.admin!== null).map(p => p.id);
            const allMem = participants.map(p => p.id);

            let tagContent = `${current.h}\n📢 *Message:* ${current.msg}\n\n`;

            // Build Participant List
            participants.forEach((mem) => {
                tagContent += `${current.bullet}@${mem.id.split('@')[0]}\n`;
            });

            // Build Admin Section
            if (admins.length > 0) {
                tagContent += current.adminHead;
                admins.forEach((adm) => {
                    tagContent += ` ✨ @${adm.split('@')[0]}\n`;
                });
            }

            tagContent += current.f;

            // Translation Logic (Auto-Translate if language is not English)
            if (lang!== 'en') {
                try {
                    const res = await translate(tagContent, { to: lang });
                    tagContent = res.text;
                } catch (e) {
                    console.log("TRANSLATE FAIL:", e.message);
                }
            }

            // Execute Broadcast
            await sock.sendMessage(m.chat, {
                text: tagContent,
                mentions: allMem
            }, { quoted: m });

        } catch (error) {
            console.error("TAGALL SYSTEM FAILURE:", error);
            await m.reply("⚠️ *VEX_CRITICAL_FAILURE:* Tagging process interrupted. Server side error.");
        }
    }
};
