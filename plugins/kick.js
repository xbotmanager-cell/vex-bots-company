const translate = require('google-translate-api-x');

module.exports = {
    command: "kick",
    alias: ["remove", "piga"],
    category: "group",
    description: "Remove a user with high sensitivity and auto-error detection",

    async execute(m, sock, { args, userSettings }) {

        if (!m.isGroup) {
            return m.reply("☡ This command is restricted to groups.");
        }

        const lang =
            args[0] && args[0].length === 2
                ? args[0]
                : (userSettings?.lang || "en");

        const style = userSettings?.style || "harsh";

        // STYLES
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

        // TARGET DETECTION
        let user =
            m.quoted
                ? m.quoted.sender
                : (
                    m.mentionedJid &&
                    m.mentionedJid[0]
                )
                    ? m.mentionedJid[0]
                    : (
                        args.find(a => /\d+/.test(a))
                    )
                        ? args.find(a => /\d+/.test(a))
                            .replace(/[^0-9]/g, '') +
                          '@s.whatsapp.net'
                        : null;

        if (!user) {
            return m.reply(current.err);
        }

        user = sock.decodeJid(user);

        try {

            // REACTION
            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: current.react,
                        key: m.key
                    }
                }
            );

            // REMOVE EXECUTION
            const response =
                await sock.groupParticipantsUpdate(
                    m.chat,
                    [user],
                    "remove"
                );

            const result = response?.[0];

            if (!result) {
                throw new Error("unknown");
            }

            const status = Number(result.status);

            // STATUS HANDLING
            if (status === 403 || status === 401) {
                throw new Error("noBotAdmin");
            }

            if (status === 406 || status === 409) {
                throw new Error("targetAdmin");
            }

            if (status !== 200) {
                throw new Error(`Failed with status ${status}`);
            }

            // SUCCESS MESSAGE
            let rawNumber = user.split('@')[0];

            let finalMsg =
                current.msg.replace(
                    '$number',
                    rawNumber
                );

            // TRANSLATION
            if (lang !== 'en') {

                try {

                    const res = await translate(
                        current.msg,
                        { to: lang }
                    );

                    finalMsg =
                        res.text.replace(
                            '$number',
                            rawNumber
                        );

                } catch (e) {
                    console.log("Translation skipped");
                }
            }

            await sock.sendMessage(
                m.chat,
                {
                    text: finalMsg
                },
                {
                    quoted: m
                }
            );

        } catch (error) {

            try {

                const metadata =
                    await sock.groupMetadata(m.chat);

                const participants =
                    metadata.participants;

                // FIXED BOT ID
                const botId =
                    sock.decodeJid(sock.user.id);

                const isBotAdmin =
                    participants.find(
                        p => p.id === botId
                    )?.admin;

                const isUserAdmin =
                    participants.find(
                        p => p.id === m.sender
                    )?.admin;

                const isTargetAdmin =
                    participants.find(
                        p => p.id === user
                    )?.admin;

                if (!isUserAdmin) {
                    return m.reply(current.noUserAdmin);
                }

                if (!isBotAdmin) {
                    return m.reply(current.noBotAdmin);
                }

                if (isTargetAdmin) {
                    return m.reply(current.targetAdmin);
                }

            } catch (metaErr) {
                console.log(metaErr);
            }

            console.error("Kick Error:", error);

            return sock.sendMessage(
                m.chat,
                {
                    text:
                        `☡ *SYSTEM ERROR:* ${error.message}`
                }
            );
        }
    }
};
