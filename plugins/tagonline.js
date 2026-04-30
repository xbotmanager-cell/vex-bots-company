/**
 * VEX PLUGIN: TAGAONLINE (STYLISH FONTS EDITION)
 * Feature: Stylish Fonts + Clean Sentences + Admin Isolation + Translation
 * Version: 7.0 (VEX CORE)
 * Dev: Lupin Starnley
 */

const translate = require('google-translate-api-x');

module.exports = {
    command: "tagaonline",
    category: "group",
    description: "Tags all members with stylish fonts and clean layout",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style?.value || 'harsh';
        const targetLang = args.find(a => a.startsWith('--'))?.replace('--', '') || 'en';
        const customMsg = args.filter(a => !a.startsWith('--')).join(" ");

        // 1. Context-Aware Error Messages
        const errorMsgs = {
            harsh: "☣️ SYSTEM_REJECTION: GROUP_SCOPE_REQUIRED",
            normal: "❌ Error: This command is restricted to groups.",
            girl: "🎀 Sowwy! I can only tag everyone in a group chat ✨"
        };

        if (!m.isGroup) return m.reply(errorMsgs[style] || errorMsgs.normal);

        // 2. Data Retrieval
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const admins = participants.filter(p => p.admin !== null).map(p => p.id);
        const allJids = participants.map(p => p.id);

        // 3. Stylish Fonts & Clean Layout Matrix
        const ui = {
            harsh: {
                h: "『 ⚡ 𝖁𝕰𝖃 𝖀𝕻𝕽𝕴𝕾𝕴𝕹𝕲 ⚡ 』\n\n",
                msg: customMsg || "𝖂𝖆𝖐𝖊 𝖚𝖕 𝖆𝖓𝖉 𝖆𝖙𝖙𝖊𝖓𝖉 𝖙𝖍𝖊 𝖘𝖞𝖘𝖙𝖊𝖒 𝖈𝖆𝖑𝖑!",
                adminHead: "\n\n💀 𝕮𝕺𝕸𝕸𝕬𝕹𝕯𝕰𝕽𝖲:\n",
                memberHead: "\n🔥 𝕿𝕬𝕽𝕲𝕰𝕿𝕾:\n",
                bullet: "⚡ ❯ ",
                f: "\n\n☣️ 𝕾𝖄𝕾𝕿𝕰𝕸_𝕳𝕬𝕽𝕯𝕰𝕹𝕰𝕯",
                react: "🛡️",
                fail: "☢️ TAG_CRITICAL_FAILURE"
            },
            normal: {
                h: "╭─〔 📢 𝗩𝗘𝗫 𝗡𝗘𝗧𝗪𝗢𝗥𝗞 〕─╮\n\n",
                msg: customMsg || "Attention members, important update below.",
                adminHead: "\n\n🛡️ 𝗟𝗘𝗔𝗗𝗘𝗥𝗦𝗛𝗜𝗣:\n",
                memberHead: "\n👥 𝗠𝗘𝗠𝗕𝗘𝗥𝗦𝗛𝗜𝗣:\n",
                bullet: "❯❯ ",
                f: "\n\n✅ BROADCAST_COMPLETE",
                react: "🔔",
                fail: "⚠️ SYSTEM_ERROR: TAG_FAILED"
            },
            girl: {
                h: "🌸✨ 𝓥𝓮𝔁 𝓢𝔀𝓮𝓮𝓽 𝓝𝓸𝓽𝓲𝓬𝓮 ✨🌸\n\n",
                msg: customMsg || "Hey babies, can you please look here? 🎀",
                adminHead: "\n\n👑 𝓜𝔂 𝓛𝓸𝓿𝓮𝓵𝔂 𝓐𝓭𝓶𝓲𝓷𝓼:\n",
                memberHead: "\n🍭 𝓜𝔂 𝓢𝔀𝓮𝓮𝓽 𝓕𝓪𝓶𝓲𝓵𝔂:\n",
                bullet: "✨ ❯ ",
                f: "\n\n💖 𝓦𝓲𝓽𝓱 𝓛𝓸𝓿𝓮 𝓥𝓮𝔁 𝓥8",
                react: "🦄",
                fail: "💕 SOWWY: TAG_WENT_WRONG"
            }
        };

        const current = ui[style] || ui.normal;

        try {
            // Send Stylish Reaction
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 4. Content Construction
            let tagContent = `${current.h}*${current.msg}*\n`;

            // Admin Isolation
            tagContent += current.adminHead;
            admins.forEach((adm) => {
                tagContent += `${current.bullet}@${adm.split('@')[0]}\n`;
            });

            // Member Listing
            tagContent += current.memberHead;
            participants.forEach((mem) => {
                tagContent += `${current.bullet}@${mem.id.split('@')[0]}\n`;
            });

            tagContent += current.f;

            // 5. Translation Engine (--langCode)
            if (targetLang !== 'en') {
                const translation = await translate(tagContent, { to: targetLang });
                tagContent = translation.text;
            }

            // 6. Global Dispatch
            await sock.sendMessage(m.chat, {
                text: tagContent,
                mentions: allJids
            }, { quoted: m });

        } catch (error) {
            console.error("VEX CORE ERROR:", error);
            m.reply(current.fail);
        }
    }
};
