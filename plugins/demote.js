const translate = require('google-translate-api-x');

module.exports = {
    command: "demote",
    alias: ["unadmin", "down", "degrade"],
    category: "group",
    description: "Remove admin rights with high-speed execution",

    async execute(m, sock, { args, userSettings }) {

        if (!m.isGroup) {
            return m.reply("⚓ This command is restricted to groups.");
        }

        const lang =
            args[0] && args[0].length === 2
                ? args[0]
                : (userSettings?.lang || "en");

        const style = userSettings?.style || "harsh";

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

            // DEMOTE EXECUTION
            const response =
                await sock.groupParticipantsUpdate(
                    m.chat,
                    [user],
                    "demote"
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
                throw new Error("targetNotAdmin");
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

                if (!isTargetAdmin) {
                    return m.reply(current.targetNotAdmin);
                }

            } catch (metaErr) {
                console.log(metaErr);
            }

            console.error("Demote Error:", error);

            return sock.sendMessage(
                m.chat,
                {
                    text:
                        `⚒ *SYSTEM ERROR:* ${error.message}`
                }
            );
        }
    }
};
