const translate = require('google-translate-api-x');

module.exports = {
    command: "tagall",
    alias: ["everyone", "all"],
    category: "group",
    description: "Tag all group members with unique UI designs",
    
    async execute(m, sock, { args, userSettings }) {
        if (!m.isGroup) return;

        const lang = args.find(a => a.length === 2) || (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';
        const customMsg = args.filter(a => a.length !== 2).join(" ");

        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const admins = participants.filter(p => p.admin !== null).map(p => p.id);

        // Fonts & Designs Matrix
        const ui = {
            harsh: {
                h: "『 ⚡ 𝖁𝕰𝖃 𝕬𝕹𝕹𝕴𝕳𝕴𝕷𝕬𝕿𝕴𝕺𝕹 ⚡ 』\n",
                msg: customMsg || "𝖂𝖆𝖐𝖊 𝖚𝖕, 𝖞𝖔𝖚 𝖑𝖆𝖟𝖞 𝖕𝖎𝖊𝖈𝖊𝖘 𝖔𝖋 𝖘𝖍*𝖙!",
                adminHead: "\n\n💀 𝕮𝕺𝕸𝕸𝕬𝕹𝕯𝕰𝕽𝖲 (𝕬𝕯𝕸𝕴𝕹𝖲):\n",
                bullet: "🔥 ❯ ",
                f: "\n\n_Stop ignoring me._ 🖕",
                react: "🔥"
            },
            normal: {
                h: "╭───〔 📢 𝗩𝗘𝗫 𝗕𝗥𝗢𝗔𝗗𝗖𝗔𝗦𝗧 〕───╮\n",
                msg: customMsg || "Attention everyone, important update!",
                adminHead: "\n\n🛡️ 𝗚𝗥𝗢𝗨𝗣 𝗔𝗗𝗠𝗜𝗡𝗦:\n",
                bullet: "❯❯ ",
                f: "\n╰────────────────────────╯",
                react: "📢"
            },
            girl: {
                h: "🌸✨ 𝓥𝓮𝔁 𝓢𝔀𝓮𝓮𝓽 𝓝𝓸𝓽𝓲𝓬𝓮 ✨🌸\n",
                msg: customMsg || "Hey babies, can you please look here? 🎀",
                adminHead: "\n\n👑 𝓜𝔂 𝓛𝓸𝓿𝓮𝓵𝔂 𝓐𝓭𝓶𝓲𝓷𝓼:\n",
                bullet: "🍭 ❯ ",
                f: "\n\n_Love you all!_ 💖🌸",
                react: "💖"
            }
        };

        const current = ui[style] || ui.normal;

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            let users = participants.map(u => u.id);
            let tagContent = `${current.h}*${current.msg}*\n\n`;
            
            // Adding all members
            participants.forEach((mem) => {
                tagContent += `${current.bullet}@${mem.id.split('@')[0]}\n`;
            });

            // Adding Admins Section
            tagContent += current.adminHead;
            admins.forEach((adm) => {
                tagContent += ` ❯ @${adm.split('@')[0]}\n`;
            });

            tagContent += current.f;

            // Translation Logic
            if (lang !== 'en') {
                const res = await translate(tagContent, { to: lang });
                tagContent = res.text;
            }

            await sock.sendMessage(m.chat, { 
                text: tagContent, 
                mentions: users 
            }, { quoted: m });

        } catch (error) {
            console.error("TagAll Error:", error);
            await sock.sendMessage(m.chat, { text: "⚠️ Tag_System_Overload" });
        }
    }
};
