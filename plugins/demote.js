const translate = require('google-translate-api-x');

module.exports = {
    command: "demote",
    alias: ["unadmin", "down", "degrade"],
    category: "group",
    description: "Remove admin rights with high-speed execution",

    async execute(m, sock, { args, userSettings }) {
        if (!m.isGroup) return m.reply("⚓ This command is restricted to groups.");
        
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        // 1. UNIQUE DESIGNS (Demotion & Fall Symbols - No Lines)
        const modes = {
            harsh: {
                msg: "⚑ ᴀᴅᴍɪɴ ᴘᴏᴡᴇʀ ʀᴇᴠᴏᴋᴇᴅ ▼ $number ▼ ʙᴀᴄᴋ ᴛᴏ ᴛʜᴇ ᴅᴜsᴛ. 💀",
                noBotAdmin: "⚒ ɪ ᴄᴀɴɴᴏᴛ sᴛʀɪᴘ ᴘᴏᴡᴇʀ ᴡɪᴛʜᴏᴜᴛ ᴀᴅᴍɪɴ ʀɪɢʜᴛs. 🤡",
                noUserAdmin: "⚒ ʏᴏᴜ ʜᴀᴠᴇ ɴᴏ ʀᴀɴᴋ ᴛᴏ ᴅᴇᴍᴏᴛᴇ ᴀɴʏᴏɴᴇ. 🖕",
                targetNotAdmin: "⚒ ᴛᴀʀɢᴇᴛ ɪs ᴀʟʀᴇᴀᴅʏ ᴀ ʟᴏᴡ-ʟᴇᴠᴇʟ ᴍᴇᴍʙᴇʀ. ▽",
                react: "🦾",
                err: "⚓ ᴡʜᴏ ᴀʀᴇ ᴡᴇ ᴅᴇɢʀᴀᴅɪɴɢ? ᴛᴀɢ, ʀᴇᴘʟʏ ᴏʀ ᴛʏᴘᴇ ᴀ ɴᴜᴍʙᴇʀ. 👺"
            },
            normal: {
                msg: "♜ *User:* $number *has been demoted to Member.* ✅",
                noBotAdmin: "⚒ *Error: Bot needs Admin status to demote.*",
                noUserAdmin: "⚒ *Access Denied: Admins only.*",
                targetNotAdmin: "♜ *Note: User is not an Admin.*",
                react: "📥",
                err: "⚓ *Identify the user via tag, reply, or number.*"
            },
            girl: {
                msg: "🌸 ℴℴ𝓅𝓈𝒾ℯ! ▼ $number ▼ 𝓁ℴ𝓈т 𝓉𝒽ℯ𝒾𝓇 𝒸𝓇ℴ𝓌𝓃... ✨🌷",
                noBotAdmin: "🎀 𝒾 𝓃ℯℯ𝒹 𝓉ℴ 𝒷ℯ 𝒶𝒹𝓂𝒾𝓃 𝒻𝒾𝓇𝓈т 𝓁ℴ𝓋ℯ... 🌸",
                noUserAdmin: "🎀 𝓈ℴ𝓇𝓇𝓎 𝒷𝒶𝒷ℯ, 𝓎ℴ𝓊 𝒶𝓇ℯ 𝓃ℴт 𝒶𝒹𝓂𝒾𝓃... ✨",
                targetNotAdmin: "🌸 𝓉𝒽ℯ𝓎 𝒶𝓇ℯ 𝒶𝓁𝓇ℯ𝒶𝒹𝓎 𝒶 𝓃ℴ𝓇𝓂𝒶𝓁 𝓂ℯ𝓂𝒷ℯ𝓇! ▽",
                react: "🦋",
                err: "⚓ 𝓌𝒽ℴ 𝓈𝒽ℴ𝓊𝓁𝒹 𝒾 𝒹ℯ𝓂ℴтℯ? т𝒶ℊ т𝒽ℯ𝓂! 🧸"
            }
        };

        const current = modes[style] || modes.normal;

        // 2. TARGET IDENTIFICATION (Reply / Tag / Number)
        let user = m.quoted ? m.quoted.sender : 
                   (m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : 
                   (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null));

        if (!user) return m.reply(current.err);

        try {
            // Speed Reaction
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 3. EXECUTION ATTEMPT (Bypassing pre-checks for speed)
            const response = await sock.groupParticipantsUpdate(m.chat, [user], "demote");

            // Handle server-side errors
            if (response[0].status === "401") throw new Error("noBotAdmin");
            if (response[0].status === "404") throw new Error("targetNotAdmin");

            // 4. OUTPUT
            let rawNumber = user.split('@')[0];
            let finalMsg = current.msg.replace('$number', rawNumber);

            if (lang !== 'en') {
                try {
                    const res = await translate(current.msg, { to: lang });
                    finalMsg = res.text.replace('$number', rawNumber);
                } catch (e) { console.log("Translation failed."); }
            }

            await sock.sendMessage(m.chat, { text: finalMsg }, { quoted: m });

        } catch (error) {
            // 5. POST-ERROR ANALYSIS
            const groupMetadata = await sock.groupMetadata(m.chat);
            const participants = groupMetadata.participants;
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            
            const isBotAdmin = participants.find(p => p.id === botId)?.admin;
            const isUserAdmin = participants.find(p => p.id === m.sender)?.admin;
            const isTargetAdmin = participants.find(p => p.id === user)?.admin;

            if (!isUserAdmin) return m.reply(current.noUserAdmin);
            if (!isBotAdmin) return m.reply(current.noBotAdmin);
            if (!isTargetAdmin) return m.reply(current.targetNotAdmin);

            console.error("Demote Error:", error);
            await sock.sendMessage(m.chat, { text: `⚒ *SYSTEM ERROR:* ${error.message}` });
        }
    }
};
