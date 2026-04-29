const CryptoJS = require('crypto-js');
const translate = require('google-translate-api-x');

module.exports = {
    command: "encrypt",
    alias: ["funga", "lock"],
    category: "cyber-security",
    description: "Encrypt text using a secret key (AES)",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style?.value || 'harsh';
        
        // --- SMART CONTEXT SELECTOR ---
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        let textToEncrypt = "";
        let secretKey = "";

        if (quoted) {
            // Kama amereply meseji
            textToEncrypt = quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || "";
            secretKey = args[0]; // Kwenye reply, neno la kwanza ndio Key
        } else {
            // Kama haja-reply, anatumia format ya: .encrypt [text] [key]
            // Tunachukua neno la mwisho kama Key, mengine ni Text
            if (args.length >= 2) {
                secretKey = args.pop(); 
                textToEncrypt = args.join(" ");
            }
        }

        const modes = {
            harsh: {
                title: "🌿 𝖁𝕰𝖃 𝕻𝕽𝕴𝖁𝕬𝕿𝕰 𝕾𝕰𝕮𝕿𝕺𝕽 🌿",
                processing: "🧬 𝕴𝖓𝖏𝖊𝖈𝖙𝖎𝖓𝖌 𝕬𝕰𝕾 𝖕𝖗𝖔𝖙𝖔𝖈𝖔𝖑... 𝖘𝖙𝖆𝖞 𝖖𝖚𝖎𝖊𝖙. ☣️",
                done: "☘️ 𝖂𝖆𝖑𝖑 𝖔𝖋 𝖈𝖞𝖕𝖍𝖊𝖗 𝖊𝖗𝖊𝖈𝖙𝖊𝖉. 𝕲𝖔𝖔𝖉 𝖑𝖚𝖈𝖐 𝖇𝖗𝖊𝖆𝖐𝖎𝖓𝖌 𝖙𝖍𝖎𝖘. 🍃",
                err: "☘️ 𝖂𝖍𝖊𝖗𝖊 𝖎𝖘 𝖙𝖍𝖊 𝖉𝖆𝖙𝖆 𝖔𝖗 𝖐𝖊𝖞? 𝕯𝖔𝖓'𝖙 𝖜𝖆𝖘𝖙𝖊 𝖒𝖞 𝖙𝖎𝖒𝖊. 🍀",
                react: "☘️"
            },
            normal: {
                title: "🫧 Aqua Crypt 🫧",
                processing: "🫧 Bubbling your data through encryption... 🫧",
                done: "🫧 Encryption settled at the bottom. 🫧",
                err: "🫧 Give me something to bubble up (Text & Key). 🫧",
                react: "🫧"
            },
            girl: {
                title: "🪐 𝒰𝓃𝓀𝓃𝑜𝓌𝓃 𝒢𝒶𝓁𝒶𝓍𝓎 𝒮𝑒𝒸𝓇𝑒𝓉 🪐",
                processing: "🛸 𝐵𝑒𝒶𝓂𝒾𝓃𝑔 𝓎𝑜𝓊𝓇 𝓂𝑒𝓈𝓈𝒶𝑔𝑒 𝓉𝑜 𝓉𝒽𝑒 𝓋𝑜𝒾𝒹... 🌌",
                done: "🌠 𝒮𝒶𝒻𝑒𝓁𝓎 𝓁𝑜𝓈𝓉 𝒾𝓃 𝓈𝓅𝒶𝒸𝑒. 𝑜𝓃𝓁𝓎 𝓎𝑜𝓊 𝒽𝒶𝓋𝑒 𝓉𝒽𝑒 𝓂𝒶𝓅! 🪐",
                err: "🛸 𝑀𝒾𝓈𝓈𝒾𝓃𝑔 𝒸𝑜𝑜𝓇𝒹𝒾𝓃𝒶𝓉𝑒𝓈 (𝒯𝑒𝓍𝓉/𝒦𝑒𝓎) 𝒷𝒶𝒷𝑒~ ☄️",
                react: "🪐"
            }
        };

        const current = modes[style] || modes.normal;

        if (!textToEncrypt || !secretKey) return m.reply(current.err);

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            await m.reply(current.processing);

            // AES Encryption Logic
            const encrypted = CryptoJS.AES.encrypt(textToEncrypt, secretKey).toString();

            let resultMsg = `*${current.title}*\n\n`;
            resultMsg += `📝 **Status:** Encrypted\n`;
            resultMsg += `🔒 **Ciphertext:**\n\`\`\`${encrypted}\`\`\`\n\n`;
            resultMsg += `🔑 **Hint:** Use your secret key to decrypt.\n\n`;
            resultMsg += `⚠️ _${current.done}_`;

            // Translate maelezo kwenda Kiswahili
            const { text: translatedMsg } = await translate(resultMsg, { to: 'sw' });

            await sock.sendMessage(m.chat, { text: translatedMsg }, { quoted: m });

        } catch (error) {
            console.error("Encryption Error:", error);
            await m.reply("☣️ System Overload: Encryption engine failed.");
        }
    }
};
