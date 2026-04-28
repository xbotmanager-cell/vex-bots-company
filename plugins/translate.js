const translate = require('google-translate-api-x');

module.exports = {
    command: "tr",
    alias: ["translate", "tafsiri"],
    category: "tools",
    description: "Translate text to any language with custom footers",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'harsh';
        const targetLang = args[0] || (userSettings?.lang || 'en');

        // 1. INPUT DETECTION (Reply or Text After Command)
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || "";
        const textToTranslate = args.slice(1).join(" ") || quotedText;

        // 2. STYLES & FOOTERS (Uncolored `> style word` format)
        const modes = {
            harsh: {
                footer: "`> trash translated`",
                react: "☠",
                err: "☡ ᴛᴇʟʟ ᴍᴇ ᴡʜᴀᴛ ᴛᴏ ᴛʀᴀɴsʟᴀᴛᴇ, ʏᴏᴜ ɪᴅɪᴏᴛ."
            },
            normal: {
                footer: "`> text translated`",
                react: "🌐",
                err: "⚠ *Please provide text or reply to a message.*"
            },
            girl: {
                footer: "`> pretty words`",
                react: "✨",
                err: "☙ 𝒷𝒶𝒷ℯ, 𝒾 𝓃ℯℯ𝒹 𝓈ℴ𝓂ℯ 𝓉ℯ𝓍𝓉 𝓉ℴ 𝓉𝓇𝒶𝓃𝓈𝓁𝒶тℯ! 🌸"
            }
        };

        const current = modes[style] || modes.normal;

        if (!textToTranslate) return m.reply(current.err);

        try {
            // Reaction based on style
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 3. TRANSLATION ENGINE (Auto-Detect Source)
            const res = await translate(textToTranslate, { to: targetLang });

            // 4. OUTPUT (Translation + Uncolored Footer)
            const finalResult = `${res.text}\n\n${current.footer}`;

            await sock.sendMessage(m.chat, { text: finalResult }, { quoted: m });

        } catch (error) {
            console.error("TR Error:", error);
            await sock.sendMessage(m.chat, { text: `☤ *TRANSLATION FAIL:* ${error.message}` });
        }
    }
};
