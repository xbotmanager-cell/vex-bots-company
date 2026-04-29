const CryptoJS = require('crypto-js');
const translate = require('google-translate-api-x');

module.exports = {
    command: "decrypt",
    alias: ["fungua", "unlock"],
    category: "cyber-security",
    description: "Decrypt AES ciphertext back to original text",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style?.value || 'harsh';
        
        // --- SMART CONTEXT SELECTOR ---
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        let cipherText = "";
        let secretKey = "";

        if (quoted) {
            // Kama amereply ile code isiyosomeka
            cipherText = quoted.conversation || quoted.extendedTextMessage?.text || "";
            secretKey = args[0]; // Neno la kwanza baada ya command ndio Key
        } else {
            // .decrypt [code] [key]
            if (args.length >= 2) {
                secretKey = args.pop(); 
                cipherText = args.join(" ");
            }
        }

        const modes = {
            harsh: {
                title: "☘️ 𝕯𝕰𝕮𝕽𝖄𝖕𝕿 𝕻𝕽𝕺𝕿𝕺𝕮𝕺𝕷 ☘️",
                processing: "⚙️ 𝕭𝖗𝖊𝖆𝖐𝖎𝖓𝖏 𝖙𝖍𝖊 𝖜𝖆𝖑𝖑𝖘... 𝖜𝖆𝖎𝖙. ☘️",
                done: "☘️ 𝕬𝖈𝖈𝖊𝖘𝖘 𝕲𝖗𝖆𝖓𝖙𝖊𝖉. 𝕳𝖊𝖗𝖊 𝖎𝖘 𝖙𝖍𝖊 𝖘𝖍𝖎𝖙. ☘️",
                err: "☘️ 𝖂𝖍𝖊𝖗𝖊 𝖎𝖘 𝖙𝖍𝖊 𝖋𝖚𝖈𝖐𝖎𝖓𝖌 𝖐𝖊𝖞? ☘️",
                react: "☘️"
            },
            normal: {
                title: "💠 Logic Decoder 💠",
                processing: "⏳ Decoding sequence...",
                done: "✅ Original data recovered.",
                err: "❌ Input ciphertext and key correctly.",
                react: "💠"
            },
            girl: {
                title: "🫧 𝑅𝑒𝒶𝓁 𝐵𝓊𝒷𝒷𝓁𝑒 𝑅𝑒𝓋𝑒𝒶𝓁 🫧",
                processing: "🫧 𝓅𝑜𝓅𝓅𝒾𝓃𝑔 𝓉𝒽𝑒 𝒷𝓊𝒷𝒷𝓁𝑒𝓈 𝓉𝑜 𝓈𝑒𝑒 𝒾𝓃𝓈𝒾𝒹𝑒... 🫧",
                done: "🫧 𝓉𝒽𝑒 𝓈𝑒𝒸𝓇𝑒𝓉 𝒾𝓈 𝑜𝓊𝓉, 𝒷𝒶𝒷𝑒! 🫧",
                err: "🫧 𝑔𝒾𝓋𝑒 𝓂𝑒 𝓉𝒽𝑒 𝓀𝑒𝓎 𝓉𝑜 𝓉𝒽𝑒𝓈𝑒 𝒷𝓊𝒷𝒷𝓁𝑒𝓈~ 🫧",
                react: "🫧"
            }
        };

        const current = modes[style] || modes.normal;

        if (!cipherText || !secretKey) return m.reply(current.err);

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            await m.reply(current.processing);

            // AES Decryption Logic
            const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
            const originalText = bytes.toString(CryptoJS.enc.Utf8);

            if (!originalText) {
                // Kama Key ni mbaya, decryption itarudisha empty string
                return m.reply(style === 'harsh' ? "☘️ 𝖂𝖗𝖔𝖓𝖌 𝕶𝖊𝖞! 𝕯𝖔𝖓'𝖙 𝖕𝖑𝖆𝖞 𝖜𝖎𝖙𝖍 𝖒𝖊. ☘️" : "❌ Incorrect key.");
            }

            let resultMsg = `*${current.title}*\n\n`;
            resultMsg += `🔓 **Decrypted Text:**\n\n${originalText}\n\n`;
            resultMsg += `⚠️ _${current.done}_`;

            // Translate maelezo kwenda Kiswahili (Isiguse ile originalText)
            const { text: translatedMsg } = await translate(resultMsg.replace(originalText, "[[TEXT]]"), { to: 'sw' });
            const finalMsg = translatedMsg.replace("[[TEXT]]", originalText);

            await sock.sendMessage(m.chat, { text: finalMsg }, { quoted: m });

        } catch (error) {
            console.error("Decryption Error:", error);
            await m.reply("☣️ Data Corrupted: Failed to decrypt.");
        }
    }
};
