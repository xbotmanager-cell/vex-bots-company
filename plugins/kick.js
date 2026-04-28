const translate = require('google-translate-api-x');

module.exports = {
    command: "kick",
    alias: ["remove", "piga"],
    category: "group",
    description: "Remove a user from the group with high sensitivity",

    async execute(m, sock, { args, userSettings }) {
        if (!m.isGroup) return m.reply("❌ This command is only for groups.");
        
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        // 1. SENSITIVITY ENGINE (Admin Checks)
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        
        const isBotAdmin = participants.find(p => p.id === botId)?.admin;
        const isUserAdmin = participants.find(p => p.id === m.sender)?.admin;

        // 2. STYLES (Stars & Crosses - No Lines)
        const modes = {
            harsh: {
                wait: "⚔️ sᴄᴀɴɴɪɴɢ ᴛᴀʀɢᴇᴛ ᴠɪᴛᴀʟs... ᴅᴏɴ'ᴛ ʙʟɪɴᴋ. 💀",
                msg: "✦ ᴜsᴇʀ † $number † ʜᴀs ʙᴇᴇɴ ᴇxᴇᴄᴜᴛᴇᴅ ꜰʀᴏᴍ ᴛʜᴇ ɢʀᴏᴜᴘ. ⚡",
                noBotAdmin: "✖️ ɪ ᴀᴍ ɴᴏᴛ ᴀᴅᴍɪɴ. ɪ ᴄᴀɴ'ᴛ ᴋɪʟʟ ᴡɪᴛʜᴏᴜᴛ ᴀ ᴘᴇʀᴍɪᴛ. 🤡",
                noUserAdmin: "✖️ ʏᴏᴜ ᴀʀᴇ ɴᴏᴛ ᴀᴅᴍɪɴ. ᴋᴇᴇᴘ ᴅreamɪɴɢ, ɴᴏᴏʙ. 🖕",
                targetAdmin: "✖️ ᴛᴀʀɢᴇᴛ ɪs ᴀᴅᴍɪɴ. ɪ ᴅᴏɴ'ᴛ ʙᴇᴛʀᴀʏ ᴍʏ ᴏᴡɴ ᴋɪɴᴅ. 🛡️",
                react: "🦾",
                err: "✖️ ᴡʜᴏ ᴅᴏ ʏᴏᴜ ᴡᴀɴᴛ ᴍᴇ ᴛᴏ ᴋɪᴄᴋ? ɢɪᴠᴇ ᴍᴇ ᴀ ᴠɪᴄᴛɪᴍ. 👺"
            },
            normal: {
                wait: "✨ *Analyzing group permissions...*",
                msg: "✦ *User:* $number *has been removed successfully.* ✅",
                noBotAdmin: "❌ *Error: I need Admin privileges to perform this.*",
                noUserAdmin: "❌ *Access Denied: Only Admins can use this.*",
                targetAdmin: "❌ *Action Blocked: Cannot kick another Admin.*",
                react: "📥",
                err: "❌ *Error: Please tag, reply, or type a number to kick.*"
            },
            girl: {
                wait: "🌸 𝒸𝒽ℯ𝒸𝓀𝒾𝓃ℊ 𝓉𝒽ℯ 𝓁𝒾𝓈𝓉... 𝒽ℴ𝓁倔 ℴ𝓃 𝓁ℴ𝓋ℯ... ✨",
                msg: "🎀 𝒷𝓎ℯ 𝒷𝓎ℯ! † $number † 𝒾𝓈 ℊℴ𝓃ℯ 𝓃ℴ𝓌! 🌷",
                noBotAdmin: "🌷 ℴℴ𝓅𝓈𝒾ℯ! 𝒾'𝓂 𝓃ℴт 𝒶𝒹𝓂𝒾𝓃 𝒽ℯ𝓇ℯ 𝒹𝒶𝓇𝓁𝒾𝓃ℊ... 🌸",
                noUserAdmin: "🌷 𝓈ℴ𝓇𝓇𝓎 𝒷𝒶𝒷ℯ, ℴ𝓃𝓁𝓎 𝒶𝒹𝓂𝒾𝓃𝓈 𝒸𝒶𝓃 𝒹ℴ 𝓉𝒽𝒾𝓈... ✨",
                targetAdmin: "🌷 𝒾 𝒸𝒶𝓃'т 𝓀𝒾𝒸𝓀 𝒶 𝒻ℯ𝓁𝓁ℴ𝓌 𝒶𝒹𝓂𝒾𝓃, 𝓉𝒽𝒶т'𝓈 𝓃ℴт 𝓃𝒾𝒸ℯ! 🎀",
                react: "🦋",
                err: "🌷 𝓌𝒽ℴ 𝓈𝒽ℴ𝓊𝓁𝒹 𝒾 𝓈𝒶𝓎 ℊℴℴ𝒹𝒷𝓎ℯ тℴ? т𝒶ℊ т𝒽ℯ𝓂! 🧸"
            }
        };

        const current = modes[style] || modes.normal;

        // 3. TARGET IDENTIFICATION (REPLY / TAG / NUMBER)
        let user = m.quoted ? m.quoted.sender : 
                   (m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : 
                   (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null));

        if (!user) return m.reply(current.err);

        try {
            // SECURITY CHECKPOINT
            if (!isBotAdmin) return m.reply(current.noBotAdmin);
            if (!isUserAdmin) return m.reply(current.noUserAdmin);
            
            const isTargetAdmin = participants.find(p => p.id === user)?.admin;
            if (isTargetAdmin) return m.reply(current.targetAdmin);

            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 4. EXECUTE KICK
            await sock.groupParticipantsUpdate(m.chat, [user], "remove");

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
            console.error("Kick Error:", error);
            await sock.sendMessage(m.chat, { text: `✖️ *FAILED:* ${error.message}` });
        }
    }
};
