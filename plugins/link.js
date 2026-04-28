const translate = require('google-translate-api-x');

module.exports = {
    command: "link",
    alias: ["grouplink", "invitelink"],
    category: "group",
    description: "Get the group invite link with unique UI per mode",
    
    async execute(m, sock, { args, userSettings }) {
        if (!m.isGroup) return;

        const lang = args.find(a => a.length === 2) || (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        // UI Design Matrix
        const ui = {
            harsh: {
                h: "┏━━━━━━〔 🔗 𝖦𝖤𝖳 𝖫𝖨𝖭𝖪 〕━━━━━━┓\n",
                body: "𝚃𝚑𝚒𝚜 𝚒𝚜 𝚝𝚑𝚎 𝚊𝚌𝚌𝚎𝚜𝚜 𝚌𝚘𝚍𝚎. 𝙳𝚘𝚗'𝚝 𝚜𝚑𝚊𝚛𝚎 𝚒𝚝 𝚠𝚒𝚝𝚑 𝚒𝚍𝚒𝚘𝚝𝚜. 🖕\n\nLink: ",
                f: "\n┗━━━━━━━━━━━━━━━━━━━━━━┛",
                react: "🔗",
                err: "⚠️ 𝖥𝖺𝗂𝗅𝖾𝖽! 𝖨'𝗆 𝗇𝗈𝗍 𝖠𝖽𝗆𝗂𝗇, 𝗒𝗈𝗎 𝗌𝗍𝗎𝗉𝗂𝖽 𝗎𝗌𝖾𝗋. 𝖯𝗋𝗈𝗆𝗈𝗍𝖾 𝗆𝖾 𝖿𝗂𝗋𝗌𝗍."
            },
            normal: {
                h: "╭───〔 🌐 𝗜𝗡𝗩𝗜𝗧𝗘 𝗟𝗜𝗡𝗞 〕───╮\n",
                body: "𝗧𝗵𝗲 𝗼𝗳𝗳𝗶𝗰𝗶𝗮𝗹 𝗴𝗿𝗼𝘂𝗽 𝗶𝗻𝘃𝗶𝘁𝗲 𝗹𝗶𝗻𝗸 𝗵𝗮𝘀 𝗯𝗲𝗲𝗻 𝗴𝗲𝗻𝗲𝗿𝗮𝘁𝗲𝗱.\n\nLink: ",
                f: "\n╰────────────────────────╯",
                react: "🌐",
                err: "❌ 𝗔𝗰𝗰𝗲𝘀𝘀 𝗗𝗲𝗻𝗶𝗲𝗱: 𝗕𝗼𝘁 𝗿𝗲𝗾𝘂𝗶𝗿𝗲𝘀 𝗔𝗱𝗺𝗶𝗻 𝗽𝗲𝗿𝗺𝗶𝘀𝘀𝗶𝗼𝗻𝘀 𝘁𝗼 𝗳𝗲𝘁𝗰𝗵 𝗹𝗶𝗻𝗸."
            },
            girl: {
                h: "🌸✨ 𝒢𝓇ℴ𝓊𝓅 ℐ𝓃𝓋𝒾𝓉ℯ ℒ𝒾𝓃𝓀 ✨🌸\n",
                body: "ℋℯ𝓇ℯ 𝒾𝓈 𝓉𝒽ℯ 𝓂𝒶ℊ𝒾𝒸 𝓁𝒾𝓃𝓀 𝓉ℴ 𝒾𝓃𝓋𝒾𝓉ℯ 𝓎ℴ𝓊𝓇 𝒷ℯ𝓈𝓉𝒾ℯ𝓈! 🎀\n\nLink: ",
                f: "\n\n_𝒦ℯℯ𝓅 𝓉𝒽ℯ 𝓋𝒾𝒷ℯ𝓈 ✨_ 💖",
                react: "🎀",
                err: "📂 𝒪ℴ𝓅𝓈𝒾ℯ! ℐ 𝓃ℯℯ𝒹 𝓉ℴ 𝒷ℯ 𝒜𝒹𝓂𝒾𝓃 𝒷ℯ𝒻ℴ𝓇ℯ ℐ 𝒸𝒶𝓃 𝓈𝒽ℴ𝓌 𝓉𝒽ℯ 𝓁𝒾𝓃𝓀. 🌸"
            }
        };

        const current = ui[style] || ui.normal;

        try {
            // Send Reaction
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // Check if Bot is Admin
            const groupMetadata = await sock.groupMetadata(m.chat);
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            const isBotAdmin = groupMetadata.participants.find(p => p.id === botId)?.admin !== null;

            if (!isBotAdmin) {
                let errText = current.err;
                if (lang !== 'en') {
                    const res = await translate(errText, { to: lang });
                    errText = res.text;
                }
                return m.reply(errText);
            }

            // Fetch Link
            const code = await sock.groupInviteCode(m.chat);
            const link = `https://chat.whatsapp.com/${code}`;
            
            let finalMsg = current.h + current.body + link + current.f;

            // Translation
            if (lang !== 'en') {
                const res = await translate(finalMsg, { to: lang });
                finalMsg = res.text;
            }

            await sock.sendMessage(m.chat, { text: finalMsg }, { quoted: m });

        } catch (error) {
            console.error("Link Command Error:", error);
            await sock.sendMessage(m.chat, { text: current.err });
        }
    }
};
