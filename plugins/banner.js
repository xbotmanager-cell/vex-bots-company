const figlet = require('figlet');
const gradient = require('gradient-string');
const translate = require('google-translate-api-x');

module.exports = {
    command: "banner",
    alias: ["ascii", "logo"],
    category: "tools",
    description: "Create a stylish ASCII banner",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style?.value || 'harsh';
        
        // --- SMART CONTEXT SELECTOR ---
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        let textForBanner = "";

        if (quoted) {
            textForBanner = quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || "";
        } else {
            textForBanner = args.join(" ");
        }

        const modes = {
            harsh: {
                title: "☘️ 𝕱𝖀𝕮𝕶𝕴𝕹𝕲 𝕭𝕬𝕹𝕹𝕰𝕽 𝕯𝕰𝕾𝕴𝕲𝕹𝕰𝕽 ☘️",
                processing: "⚙️ 𝕮𝖔𝖓𝖘𝖙𝖗𝖚𝖈𝖙𝖎𝖓𝖌 𝖞𝖔𝖚𝖗 𝖉𝖎𝖌𝖎𝖙𝖆𝖑 𝖘𝖎𝖌𝖓𝖆𝖙𝖚𝖗𝖊... ☘️",
                done: "☘️ 𝕯𝖔𝖓𝖊! 𝕷𝖔𝖔𝖐 𝖆𝖙 𝖙𝖍𝖎𝖘 𝖒𝖆𝖘𝖙𝖊𝖗𝖕𝖎𝖊𝖈𝖊. ☘️",
                err: "☘️ 𝕬𝖗𝖊 𝖞𝖔𝖚 𝖇𝖑𝖎𝖓𝖉? 𝕲𝖎𝖛𝖊 𝖒𝖊 𝖙𝖊𝖝𝖙 𝖋𝖔𝖗 𝖙𝖍𝖊 𝖇𝖆𝖓𝖓𝖊𝖗! ☘️",
                colors: ["#ff0000", "#ff0000"], // Pure Red for Harsh
                react: "☘️"
            },
            normal: {
                title: "💠 VEX Banner Pro 💠",
                processing: "⏳ Designing ASCII Art...",
                done: "✅ Banner created successfully.",
                err: "❌ Please provide some text.",
                colors: ["#00ffcc", "#3366ff"], // Cool Blue/Teal
                react: "💠"
            },
            girl: {
                title: "🫧 𝑀𝒶𝑔𝒾𝒸𝒶𝓁 𝐵𝓊𝒷𝒷𝓁𝑒 𝒯𝑒𝓍𝓉 🫧",
                processing: "🫧 𝓈𝓅𝒾𝓃𝓃𝒾𝓃𝑔 𝒷𝓊𝒷𝒷𝓁𝑒𝓈 𝒾𝓃𝓉𝑜 𝒶𝓇𝓉... 🫧",
                done: "🫧 𝒾𝓉 𝓁𝑜𝑜𝓀𝓈 𝓈𝑜𝑜𝑜 𝒸𝓊𝓉𝑒, 𝒷𝒶𝒷𝑒! 🫧",
                err: "🫧 𝓌𝒽𝑒𝓇𝑒 𝒾𝓈 𝓉𝒽𝑒 𝓉𝑒𝓿𝓉 𝒻𝑜𝓇 𝓎𝑜𝓊𝓇 𝒷𝓊𝒷𝒷𝓁𝑒𝓈? 🫧",
                colors: ["#ff99cc", "#ffccff"], // Pink/Soft Purple
                react: "🫧"
            }
        };

        const current = modes[style] || modes.normal;

        if (!textForBanner) return m.reply(current.err);

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            await m.reply(current.processing);

            // Kutengeneza ASCII Art kwa kutumia Figlet
            figlet(textForBanner, {
                font: 'Slant', // Font ya kijasusi inayosomeka vizuri WhatsApp
                horizontalLayout: 'default',
                verticalLayout: 'default'
            }, async (err, data) => {
                if (err) {
                    console.error("Figlet Error:", err);
                    return m.reply("🛑 Failed to generate ASCII art.");
                }

                // Kuweka Rangi (Gradients)
                const coloredBanner = gradient(current.colors)(data);

                let resultMsg = `*${current.title}*\n\n`;
                resultMsg += `\`\`\`${data}\`\`\`\n\n`; // Monospace ni lazima ili ASCII isiharibike
                resultMsg += `⚠️ _${current.done}_`;

                // Translate maelezo kwenda Kiswahili (Isiguse ASCII)
                const { text: translatedMsg } = await translate(resultMsg.replace(data, "[[ASCII]]"), { to: 'sw' });
                const finalMsg = translatedMsg.replace("[[ASCII]]", data);

                await sock.sendMessage(m.chat, { text: finalMsg }, { quoted: m });
            });

        } catch (error) {
            console.error("Banner Error:", error);
            await m.reply("☣️ System Failure in Design Engine.");
        }
    }
};
