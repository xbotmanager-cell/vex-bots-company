const translate = require('google-translate-api-x');

module.exports = {
    command: "promote",
    alias: ["admin", "makeadmin", "up"],
    category: "group",
    description: "Promote a user to admin with high sensitivity",

    async execute(m, sock, { args, userSettings }) {
        if (!m.isGroup) return m.reply("❌ This command is only for groups.");
        
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        // 1. SENSITIVITY ENGINE (Security Checks)
        const groupMetadata = await sock.groupMetadata(m.chat);
        const participants = groupMetadata.participants;
        const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        
        const isBotAdmin = participants.find(p => p.id === botId)?.admin;
        const isUserAdmin = participants.find(p => p.id === m.sender)?.admin;

        // 2. STYLES (Stars & Crosses - No Wait Messages)
        const modes = {
            harsh: {
                msg: "✦ ᴜsᴇʀ † $number † ɪs ɴᴏᴡ ᴀ ᴘᴀʀᴛ ᴏꜰ ᴛʜᴇ ʜɪɢʜ ᴄᴏᴜɴᴄɪʟ. 🛡️",
                noBotAdmin: "✖️ ɪ ʟᴀᴄᴋ ᴘᴇʀᴍɪssɪᴏɴs. ᴍᴀᴋᴇ ᴍᴇ ᴀᴅᴍɪɴ ꜰɪʀsᴛ. 🤡",
                noUserAdmin: "✖️ ʏᴏᴜ ᴅᴏɴ'ᴛ ʜᴀᴠᴇ ᴛʜᴇ ᴀᴜᴛʜᴏʀɪᴛʏ ᴛᴏ ᴄᴏᴍᴍᴀɴᴅ ᴍᴇ. 🖕",
                targetAdmin: "✖️ ᴛᴀʀɢᴇᴛ ɪs ᴀʟʀᴇᴀᴅʏ ɪɴ ᴘᴏᴡᴇʀ. 🛡️",
                react: "🦾",
                err: "✖️ ᴡʜᴏ ᴀʀᴇ ᴡᴇ ᴇʟᴇᴠᴀᴛɪɴɢ? ᴛᴀɢ ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴀ ᴠɪᴄᴛɪᴍ. 👺"
            },
            normal: {
                msg: "✦ *User:* $number *has been promoted to Admin.* ✅",
                noBotAdmin: "❌ *Error: Bot needs Admin rights to promote users.*",
                noUserAdmin: "❌ *Access Denied: Admin only command.*",
                targetAdmin: "❌ *Note: This user is already an Admin.*",
                react: "📥",
                err: "❌ *Error: Please tag, reply, or type a number.*"
            },
            girl: {
                msg: "🎀 𝓎𝒶𝓎! † $number † 𝒾𝓈 𝓃ℴ𝓌 𝒶𝓃 𝒶𝒹𝓂𝒾𝓃! ✨🌷",
                noBotAdmin: "🌷 𝒾'𝓂 𝓃ℴ𝓉 𝒶𝒹𝓂𝒾𝓃 𝒽ℯ𝓇ℯ 𝒹𝒶𝓇𝓁𝒾𝓃ℊ... 🌸",
                noUserAdmin: "🌷 𝓈ℴ𝓇𝓇𝓎 𝒷𝒶𝒷ℯ, ℴ𝓃𝓁𝓎 𝒶𝒹𝓂𝒾𝓃𝓈 𝒸𝒶𝓃 𝒹ℴ 𝓉𝒽𝒾𝓈... ✨",
                targetAdmin: "🌷 𝓉𝒽ℯ𝓎 𝒶𝓇ℯ 𝒶𝓁𝓇ℯ𝒶𝒹𝓎 𝒶𝓃 𝒶𝒹𝓂𝒾𝓃 𝓈𝓌ℯℯ𝓉𝒾ℯ! 🎀",
                react: "🦋",
                err: "🌷 𝓌𝒽ℴ 𝓈𝒽ℴ𝓊𝓁𝒹 𝒾 𝓅𝓇ℴ𝓂ℴ𝓉ℯ? 𝓉𝒶ℊ 𝓉𝒽ℯ𝓂! 🧸"
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

            // Execute Reaction
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 4. EXECUTE PROMOTE
            await sock.groupParticipantsUpdate(m.chat, [user], "promote");

            // 5. OUTPUT DELIVERY
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
            console.error("Promote Error:", error);
            await sock.sendMessage(m.chat, { text: `✖️ *FAILED:* ${error.message}` });
        }
    }
};
