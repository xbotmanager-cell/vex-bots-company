const translate = require('google-translate-api-x');

module.exports = {
    command: "add",
    alias: ["invite", "welcome"],
    category: "group",
    description: "Add a user to the group by phone number",

    async execute(m, sock, { args, userSettings }) {
        if (!m.isGroup) return m.reply("❌ This command is only for groups.");
        
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        // 1. INPUT SCANNER
        let user = m.quoted ? m.quoted.sender : (args[0] ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null);

        // 2. CRYPTIC STYLES (Stars & Crosses Only - No Lines)
        const modes = {
            harsh: {
                wait: "⚔️ ᴀᴄᴄᴇssɪɴɢ ɢʀᴏᴜᴘ ᴘʀᴏᴛᴏᴄᴏʟ... sᴛᴀɴᴅ ʙʏ. 💀",
                msg: "✦ ᴜsᴇʀ † $number † ʜᴀs ʙᴇᴇɴ ғᴏʀᴄᴇᴅ ɪɴᴛᴏ ᴛʜᴇ ᴄʜᴀᴛ. ⚡",
                react: "🦾",
                err: "✖️ ᴇʀʀᴏʀ: ɢɪᴠᴇ ᴍᴇ ᴀ ɴᴜᴍʙᴇʀ, ɪ ᴄᴀɴ'ᴛ ɪɴᴠɪᴛᴇ ᴀ ɢʜᴏsᴛ. 🤡"
            },
            normal: {
                wait: "✨ *Initiating invitation sequence...*",
                msg: "✦ *User:* $number *is now added to the group.* ✅",
                react: "📥",
                err: "❌ *Error: Please provide a valid phone number.*"
            },
            girl: {
                wait: "🌸 𝓈ℯ𝓃𝒹𝒾𝓃ℊ 𝒾𝓃𝓋𝒾𝓉ℯ 𝓅𝓁ℯ𝒶𝓈ℯ 𝓌𝒶𝒾𝓉... ✨",
                msg: "🎀 𝓎𝒶𝓎! 𝓃𝓊𝓂𝒷ℯ𝓇 † $number † 𝒾𝓈 𝒽ℯ𝓇ℯ 𝓃ℴ𝓌! 🌷",
                react: "🦋",
                err: "🌷 ℴℴ𝓅𝓈𝒾ℯ! 𝒾 𝓃ℯℯ𝒹 𝒶 𝓃𝓊𝓂𝒷ℯ𝓇 𝓉ℴ 𝒻𝒾𝓃𝒹 𝓎ℴ𝓊𝓇 𝒻𝓇𝒾ℯ𝓃𝒹! 🧸"
            }
        };

        const current = modes[style] || modes.normal;

        if (!user) return m.reply(current.err);

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            
            // 3. EXECUTE ADD
            const response = await sock.groupParticipantsUpdate(m.chat, [user], "add");

            // Privacy Wall Check
            if (response[0].status === "403") {
                return m.reply("⚠️ Privacy settings detected. Sending invite link...");
            }

            // 4. TRANSLATION & FINAL OUTPUT
            let rawNumber = user.split('@')[0];
            let finalMsg = current.msg.replace('$number', rawNumber);

            if (lang !== 'en') {
                try {
                    const res = await translate(current.msg, { to: lang });
                    finalMsg = res.text.replace('$number', rawNumber);
                } catch (e) { 
                    console.log("Translation failed, using default."); 
                }
            }

            await sock.sendMessage(m.chat, { text: finalMsg }, { quoted: m });

        } catch (error) {
            console.error("Add Error:", error);
            await sock.sendMessage(m.chat, { text: `✖️ *FAILED:* ${error.message}` });
        }
    }
};
