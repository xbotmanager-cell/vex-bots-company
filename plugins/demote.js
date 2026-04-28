const translate = require('google-translate-api-x');

module.exports = {
    command: "demote",
    alias: ["unadmin", "down", "degrade"],
    category: "group",
    description: "Remove admin rights from a user",

    async execute(m, sock, { args, userSettings }) {
        if (!m.isGroup) return m.reply("⚠ This command is restricted to groups.");
        
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        // 1. SENSITIVITY ENGINE
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        
        const isBotAdmin = participants.find(p => p.id === botId)?.admin;
        const isUserAdmin = participants.find(p => p.id === m.sender)?.admin;

        // 2. UNIQUE SYMBOL DESIGNS (Arrows & Hazards - No Lines)
        const modes = {
            harsh: {
                msg: "☣ ᴀᴅᴍɪɴ ᴘᴏᴡᴇʀ sᴛʀɪᴘᴘᴇᴅ ▼ $number ▼ ʏᴏᴜ ᴀʀᴇ ɴᴏᴛʜɪɴɢ ɴᴏᴡ. 💀",
                noBotAdmin: "⚠ ʙᴏᴛ ɪs ɴᴏᴛ ᴀᴅᴍɪɴ. ɪ ᴄᴀɴ'ᴛ ᴅᴇᴍᴏᴛᴇ ᴀɴʏᴏɴᴇ. 🤡",
                noUserAdmin: "⚠ ᴀᴄᴄᴇss ᴅᴇɴɪᴇᴅ. ʏᴏᴜ ʟᴀᴄᴋ ᴛʜᴇ ʀᴀɴᴋ. 🖕",
                targetNotAdmin: "⚠ ᴛᴀʀɢᴇᴛ ɪs ᴀʟʀᴇᴀᴅʏ ᴀ ᴄɪᴠɪʟɪᴀɴ. ▽",
                react: "🦾",
                err: "⚠ sᴘᴇᴄɪꜰʏ ᴀ ᴠɪᴄᴛɪᴍ ᴛᴏ ᴅᴇɢʀᴀᴅᴇ. 👺"
            },
            normal: {
                msg: "✦ *User:* $number *has been demoted to Member.* ▼",
                noBotAdmin: "⚠ *Bot requires Admin status to demote.*",
                noUserAdmin: "⚠ *Permission Error: Admins only.*",
                targetNotAdmin: "✦ *User is not an Admin.*",
                react: "📥",
                err: "⚠ *Please tag or reply to a user.*"
            },
            girl: {
                msg: "🌸 ℴℴ𝓅𝓈𝒾ℯ! ▼ $number ▼ 𝒾𝓈 𝓃ℴ 𝓁ℴ𝓃ℊℯ𝓇 𝒶𝒹𝓂𝒾𝓃... ✨",
                noBotAdmin: "🎀 𝒾 𝓃ℯℯ𝒹 𝓉ℴ 𝒷ℯ 𝒶𝒹𝓂𝒾𝓃 𝒻𝒾𝓇𝓈𝓉 𝓁ℴ𝓋ℯ... 🌸",
                noUserAdmin: "🎀 𝓈ℴ𝓇𝓇𝓎 𝒷𝒶𝒷ℯ, 𝓎ℴ𝓊 𝒶𝓇ℯ 𝓃ℴ𝓉 𝒶𝒹𝓂𝒾𝓃... ✨",
                targetNotAdmin: "🌸 𝓉𝒽ℯ𝓎 𝒶𝓇ℯ 𝒶𝓁𝓇ℯ𝒶𝒹𝓎 𝒶 𝓃ℴ𝓇𝓂𝒶𝓁 𝓂ℯ𝓂𝒷ℯ𝓇! ▽",
                react: "🦋",
                err: "🎀 𝓌𝒽ℴ 𝓈𝒽ℴ𝓊𝓁𝒹 𝒾 𝒹ℯ𝓂ℴ𝓉ℯ? 𝓉𝒶ℊ 𝓉𝒽ℯ𝓂! 🧸"
            }
        };

        const current = modes[style] || modes.normal;

        // 3. TARGET IDENTIFICATION
        let user = m.quoted ? m.quoted.sender : 
                   (m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : 
                   (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null));

        if (!user) return m.reply(current.err);

        try {
            if (!isBotAdmin) return m.reply(current.noBotAdmin);
            if (!isUserAdmin) return m.reply(current.noUserAdmin);
            
            const isTargetAdmin = participants.find(p => p.id === user)?.admin;
            if (!isTargetAdmin) return m.reply(current.targetNotAdmin);

            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 4. EXECUTE DEMOTE
            await sock.groupParticipantsUpdate(m.chat, [user], "demote");

            // 5. OUTPUT
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
            console.error("Demote Error:", error);
            await sock.sendMessage(m.chat, { text: `⚠ *FAILED:* ${error.message}` });
        }
    }
};
