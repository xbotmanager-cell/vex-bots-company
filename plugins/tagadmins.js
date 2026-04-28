const translate = require('google-translate-api-x');

module.exports = {
    command: "tagadmins",
    alias: ["admins", "adm"],
    category: "group",
    description: "Tag only group administrators with unique UI per mode",
    
    async execute(m, sock, { args, userSettings }) {
        if (!m.isGroup) return;

        const lang = args.find(a => a.length === 2) || (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';
        const customMsg = args.filter(a => a.length !== 2).join(" ");

        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const admins = participants.filter(p => p.admin !== null).map(p => p.id);

        // UI Design Matrix (Different from tagall)
        const ui = {
            harsh: {
                h: "𝕕𝕚𝕤𝕥𝕦𝕣𝕓𝕚𝕟𝕘 𝕥𝕙𝕖 𝕙𝕚𝕖𝕣𝕒𝕣𝕔𝕙𝕪... ⚡\n",
                msg: customMsg || "𝕎𝕙𝕖𝕣𝕖 𝕒𝕣𝕖 𝕥𝕙𝕖 𝕦𝕤𝕖𝕝𝕖𝕤𝕤 𝕝𝕖𝕒𝕕𝕖𝕣𝕤?!",
                adminHead: "\n\n⛓️ 𝔼𝕃𝕀𝕋𝔼 𝕋𝔸ℝ𝔾𝔼𝕋𝕊:\n",
                bullet: "🚷 ❯ ",
                f: "\n\n_Answer me or delete the group._ 🖕",
                react: "👿"
            },
            normal: {
                h: "▇◤ [ 𝗠𝗔𝗡𝗔𝗚𝗘𝗠𝗘𝗡𝗧 𝗣𝗜𝗡𝗚 ] ◥▇\n",
                msg: customMsg || "Administrative attention required.",
                adminHead: "\n\n💼 𝗗𝗘𝗦IG𝗡𝗔𝗧𝗘𝗗 𝗔𝗨𝗧𝗛𝗢𝗥𝗜𝗧𝗬:\n",
                bullet: "■ ",
                f: "\n\n_VEX Admin-Sync Protocol Active._ ✅",
                react: "🛡️"
            },
            girl: {
                h: "☁️✨ 𝓅𝓇ℯ𝓉𝓉𝓎 𝓁𝒾𝓉𝓉𝓁ℯ 𝒷ℴ𝓈𝓈ℯ𝓈 ✨☁️\n",
                msg: customMsg || "Besties, I need your help with something! 🎀",
                adminHead: "\n\n💖 𝒯𝒽ℯ 𝒬𝓊ℯℯ𝓃𝓈 & 𝒦𝒾𝓃ℊ𝓈:\n",
                bullet: "🎀 ❯ ",
                f: "\n\n_Sending love to the admins!_ 🍭🌸",
                react: "👑"
            }
        };

        const current = ui[style] || ui.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            let tagContent = `${current.h}*${current.msg}*\n${current.adminHead}`;
            
            // Adding Admins with tagging logic
            admins.forEach((adm) => {
                tagContent += `${current.bullet}@${adm.split('@')[0]}\n`;
            });

            tagContent += current.f;

            // Translation Engine
            if (lang !== 'en') {
                const res = await translate(tagContent, { to: lang });
                tagContent = res.text;
            }

            await sock.sendMessage(m.chat, { 
                text: tagContent, 
                mentions: admins 
            }, { quoted: m });

        } catch (error) {
            console.error("TagAdmins Error:", error);
            await sock.sendMessage(m.chat, { text: "⚠️ _Admin_Ping_Fail_" });
        }
    }
};
