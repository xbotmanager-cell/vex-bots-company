const translate = require('google-translate-api-x');

module.exports = {
    command: "kick",
    alias: ["remove", "piga"],
    category: "group",
    description: "Remove a user with high sensitivity and auto-error detection",

    async execute(m, sock, { args, userSettings }) {
        if (!m.isGroup) return m.reply("☡ This command is restricted to groups.");
        
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        // 1. DYNAMIC STYLES (No Wait Messages - New Symbols)
        const modes = {
            harsh: {
                msg: "☣ ᴜsᴇʀ † $number † ᴇxᴇᴄᴜᴛᴇᴅ. ᴅᴏɴ'ᴛ ᴄᴏᴍᴇ ʙᴀᴄᴋ. 💀",
                noBotAdmin: "🛡 ɪ ᴀᴍ ᴘᴏᴡᴇʀʟᴇss. ᴍᴀᴋᴇ ᴍᴇ ᴀᴅᴍɪɴ. 🤡",
                noUserAdmin: "🛡 ʏᴏᴜ ʟᴀᴄᴋ ᴛʜᴇ ʀᴀɴᴋ ᴛᴏ ᴜsᴇ ᴍᴇ. 🖕",
                targetAdmin: "🛡 ɪ ᴄᴀɴɴᴏᴛ ᴛᴏᴜᴄʜ ᴀ ꜰᴇʟʟᴏᴡ ᴀᴅᴍɪɴ. ⚔",
                react: "🦾",
                err: "☡ ᴡʜᴏ ɪs ᴛʜᴇ ᴠɪᴄᴛɪᴍ? ᴛᴀɢ, ʀᴇᴘʟʏ ᴏʀ ᴛʏᴘᴇ ᴀ ɴᴜᴍʙᴇʀ. 👺"
            },
            normal: {
                msg: "⚖ *User:* $number *has been removed.* ✅",
                noBotAdmin: "⚖ *Error: Bot needs Admin rights.*",
                noUserAdmin: "⚖ *Access Denied: Admin only.*",
                targetAdmin: "⚖ *Action Blocked: Target is an Admin.*",
                react: "📥",
                err: "⚖ *Provide a target via tag, reply, or number.*"
            },
            girl: {
                msg: "🌸 𝒷𝓎ℯ 𝒷𝓎ℯ! † $number † 𝒾𝓈 ℊℴ𝓃ℯ! 🌷",
                noBotAdmin: "🎀 𝒾'𝓂 𝓃ℴ𝓉 𝒶𝒹𝓂𝒾𝓃 𝒽ℯ𝓇ℯ 𝓈𝓌ℯℯ𝓉𝒾ℯ... 🌸",
                noUserAdmin: "🎀 𝓈ℴ𝓇𝓇𝓎, ℴ𝓃𝓁𝓎 𝒶𝒹𝓂𝒾𝓃𝓈 𝒸𝒶𝓃 𝒹ℴ 𝓉𝒽𝒾𝓈... ✨",
                targetAdmin: "🎀 𝒾 𝒸𝒶𝓃'𝓉 𝓀𝒾𝒸𝓀 𝒶𝒹𝓂ɪ𝓃𝓈, 𝓈ℴ𝓇𝓇𝓎! 🌷",
                react: "🦋",
                err: "🎀 𝓌𝒽ℴ 𝓈𝒽ℴ𝓊𝓁𝒹 𝒾 𝓇ℯ𝓂ℴ𝓋ℯ? 𝓉𝒶ℊ 𝓉𝒽ℯ𝓂! 🧸"
            }
        };

        const current = modes[style] || modes.normal;

        // 2. SMART TARGETING (Reply / Tag / Number)
        let user = m.quoted ? m.quoted.sender : 
                   (m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : 
                   (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null));

        if (!user) return m.reply(current.err);

        try {
            // Reaction first for speed
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 3. ATTEMPT EXECUTION (Try first, ask questions later)
            const response = await sock.groupParticipantsUpdate(m.chat, [user], "remove");

            // Check if it failed silently or returned error status
            if (response[0].status === "401") throw new Error("noBotAdmin");
            if (response[0].status === "404") throw new Error("targetAdmin");

            // 4. SUCCESS OUTPUT
            let rawNumber = user.split('@')[0];
            let finalMsg = current.msg.replace('$number', rawNumber);

            if (lang !== 'en') {
                try {
                    const res = await translate(current.msg, { to: lang });
                    finalMsg = res.text.replace('$number', rawNumber);
                } catch (e) { console.log("Translation skip"); }
            }

            await sock.sendMessage(m.chat, { text: finalMsg }, { quoted: m });

        } catch (error) {
            // 5. ERROR DETECTION ENGINE
            const groupMetadata = await sock.groupMetadata(m.chat);
            const participants = groupMetadata.participants;
            const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            
            const isBotAdmin = participants.find(p => p.id === botId)?.admin;
            const isUserAdmin = participants.find(p => p.id === m.sender)?.admin;
            const isTargetAdmin = participants.find(p => p.id === user)?.admin;

            if (!isUserAdmin) return m.reply(current.noUserAdmin);
            if (!isBotAdmin) return m.reply(current.noBotAdmin);
            if (isTargetAdmin) return m.reply(current.targetAdmin);

            console.error("Kick Error:", error);
            await sock.sendMessage(m.chat, { text: `☡ *SYSTEM ERROR:* ${error.message}` });
        }
    }
};
