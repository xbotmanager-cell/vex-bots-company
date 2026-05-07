const translate = require('google-translate-api-x');

module.exports = {
    command: "promote",
    alias: ["admin", "makeadmin", "up"],
    category: "group",
    description: "Promote a user to admin with high-speed execution",

    async execute(m, sock, { args, userSettings }) {

        if (!m.isGroup) {
            return m.reply("⚓ This command is for groups only.");
        }

        const lang =
            args[0] && args[0].length === 2
                ? args[0]
                : (userSettings?.lang || "en");

        const style = userSettings?.style || "harsh";

        const modes = {

            harsh: {
                msg: "♚ ᴜsᴇʀ † $number † ᴇʟᴇᴠᴀᴛᴇᴅ ᴛᴏ ᴛʜᴇ ᴛʜʀᴏɴᴇ. ⚔",
                noBotAdmin: "⚙ ɪ ᴀᴍ ɴᴏᴛ ᴀɴ ᴀᴅᴍɪɴ. ɢɪᴠᴇ ᴍᴇ ᴛʜᴇ ʜᴀᴍᴍᴇʀ. 🤡",
                noUserAdmin: "⚙ ʏᴏᴜ ᴀʀᴇ ᴀ ᴘᴇᴀsᴀɴᴛ. ᴅᴏɴ'ᴛ ᴛᴏᴜᴄʜ ᴍʏ ᴄᴏɴsᴏʟᴇ. 🖕",
                targetAdmin: "⚙ ᴛʜᴇʏ ᴀʟʀᴇᴀᴅʏ ʜᴏʟᴅ ᴛʜᴇ ᴄʀᴏᴡɴ. 👑",
                react: "🦾",
                err: "⚓ ᴡʜᴏ ɪs ᴡᴏʀᴛʜʏ? ᴛᴀɢ, ʀᴇᴘʟʏ ᴏʀ ᴛʏᴘᴇ ᴀ ɴᴜᴍʙᴇʀ. 👺"
            },

            normal: {
                msg: "♔ *User:* $number *is now an Admin.* ✅",
                noBotAdmin: "⚙ *Error: Bot needs Admin to promote.*",
                noUserAdmin: "⚙ *Access Denied: Admin only.*",
                targetAdmin: "♔ *Note: User is already an Admin.*",
                react: "📥",
                err: "⚓ *Identify the user via tag, reply, or number.*"
            },

            girl: {
                msg: "♕ 𝓎𝒶𝓎! † $number † 𝒾𝓈 𝓃ℴ𝓌 𝒶 𝓆𝓊ℯℯ𝓃! ✨🌷",
                noBotAdmin: "🎀 𝒾 𝓃ℯℯ𝒹 𝓉ℴ 𝒷ℯ 𝒶𝒹𝓂𝒾𝓃 𝒻𝒾𝓇𝓈𝓉 𝒷𝒶𝒷ℯ... 🌸",
                noUserAdmin: "🎀 𝓈ℴ𝓇𝓇𝓎 𝒹ℴ𝓁𝓁, ℴ𝓃𝓁𝓎 𝒶𝒹𝓂𝒾𝓃𝓈 𝒽ℯ𝓇ℯ... ✨",
                targetAdmin: "🎀 𝓉𝒽ℯ𝓎 𝒶𝓇ℯ 𝒶𝓁𝓇ℯ𝒶𝒹𝓎 𝒶𝒹𝓂𝒾𝓃! ♕",
                react: "🦋",
                err: "⚓ 𝓌𝒽ℴ 𝒹ℯ𝓈ℯ𝓇𝓋ℯ𝓈 𝒶 𝓅𝓇ℴ𝓂ℴ𝓉𝒾ℴ𝓃? 𝓉𝒶ℊ 𝓉𝒽ℯ𝓂! 🧸"
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

            // PROMOTE EXECUTION
            const response =
                await sock.groupParticipantsUpdate(
                    m.chat,
                    [user],
                    "promote"
                );

            const result = response?.[0];

            if (!result) {
                throw new Error("unknown");
            }

            const status = Number(result.status);

            if (status === 403 || status === 401) {
                throw new Error("noBotAdmin");
            }

            if (status === 409) {
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

            console.error("Promote Error:", error);

            return sock.sendMessage(
                m.chat,
                {
                    text:
                        `⚙ *SYSTEM ERROR:* ${error.message}`
                }
            );
        }
    }
};
