const bcrypt = require('bcrypt');
const translate = require('google-translate-api-x');

module.exports = {
    command: "hash",
    alias: ["encryptpass"],
    category: "cyber-security",
    description: "Securely hash text using Bcrypt encryption with Auto-Translate",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style?.value || 'harsh';
        const textToHash = args.join(" ");

        const modes = {
            harsh: {
                title: "🔐 𝕮𝖞𝖇𝖊𝖗 𝕰𝖓𝖈𝖗𝖞𝖕𝖙𝖔𝖗 🔐",
                processing: "⚙️ 𝕬𝖓𝖆𝖑𝖞𝖟𝖎𝖓𝖌 𝖉𝖆𝖙𝖆... 𝖉𝖔𝖓'𝖙 𝖇𝖑𝖎𝖓𝖐. 🔪",
                done: "✅ 𝕳𝖆𝖘𝖍 𝕲𝖊𝖓𝖊𝖗𝖆𝖙𝖊𝖉! 𝕶𝖊𝖊𝖕 𝖎𝖙 𝖘𝖆𝖋𝖊, 𝖞𝖔𝖚 𝖋𝖚𝖈𝖐.",
                err: "💢 𝖂𝖍𝖆𝖙 𝖙𝖍𝖊 𝖋𝖚𝖈𝖐? 𝖂𝖗𝖎𝖙𝖊 𝖘𝖔𝖒𝖊𝖙𝖍𝖎𝖓𝖌 𝖙𝖔 𝖍𝖆𝖘𝖍! 🖕",
                react: "🦾"
            },
            normal: {
                title: "🛡️ Security Hasher 🛡️",
                processing: "⏳ Hashing your text...",
                done: "✅ Hash complete!",
                err: "❌ Please provide text to hash.",
                react: "🔐"
            },
            girl: {
                title: "🎀 𝐿𝓊𝓅𝒾𝓃'𝓈 𝒮𝑒𝒸𝓇𝑒𝓉 𝒦𝑒𝑒𝒻𝑒𝓇 🎀",
                processing: "✨ 𝒽𝒾𝒹𝒾𝓃𝑔 𝓎𝑜𝓊𝓇 𝓈𝑒𝒸𝓇𝑒𝓉𝓈, 𝒷𝒶𝒷𝑒... 🍭",
                done: "💖 𝒽𝑒𝓇𝑒 𝒾𝓈 𝓎𝑜𝓇 𝓈𝑒𝒸𝓇𝑒𝓉 𝒸𝑜𝒹𝑒! ✨",
                err: "🌸 𝑜𝑜𝓅𝓈𝒾𝑒! 𝓉𝑒𝓁𝓁 𝓂𝑒 𝓌𝒽𝒶𝓉 𝓉𝑜 𝒽𝒾𝒹𝑒~ 🎀",
                react: "💖"
            }
        };

        const current = modes[style] || modes.normal;

        if (!textToHash) return m.reply(current.err);

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            
            // Tuma ujumbe wa kuanza (Processing)
            await m.reply(current.processing);

            // Brutal Force Hashing
            const saltRounds = 10;
            const hash = await bcrypt.hash(textToHash, saltRounds);

            let resultMsg = `*${current.title}*\n\n`;
            resultMsg += `📝 **Original:** ${textToHash}\n`;
            resultMsg += `🔑 **Bcrypt Hash:**\n\`\`\`${hash}\`\`\`\n\n`;
            resultMsg += `⚠️ _${current.done}_`;

            // --- VEX TRANSLATION SYSTEM ---
            // Kama user yupo Tanzania au anataka Swahili, tunatafsiri maelezo
            const { text: translatedMsg } = await translate(resultMsg, { to: 'sw' });

            await sock.sendMessage(m.chat, { text: translatedMsg }, { quoted: m });

        } catch (error) {
            console.error("Hash Error:", error);
            await m.reply("🛑 Critical system failure during encryption.");
        }
    }
};
