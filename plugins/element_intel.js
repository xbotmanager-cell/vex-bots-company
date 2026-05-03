// ================= LUPER-MD CHEMICAL INTELLIGENCE =================
const axios = require('axios');
const translate = require('google-translate-api-x');

module.exports = {
    command: "element",
    alias: ["chem", "atom", "science"],
    category: "education",
    description: "Get detailed intelligence about chemical elements",

    async execute(m, sock, { args, userSettings, lang, prefix }) {
        // 1. CONFIG & STYLE SYNC
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';
        const query = args[0];

        // 2. STYLES DEFINITION
        const modes = {
            harsh: {
                title: "☣️ 𝕬𝕿𝕺𝕸𝕴𝕮 𝕾𝖀𝕽𝖁𝕰𝕴𝕷𝕷𝕬𝕹𝕮𝕰 ☣️",
                line: "━",
                wait: "⏳ 𝕯𝖊𝖈𝖔𝖓𝖘𝖙𝖗𝖚𝖈𝖙𝖎𝖓𝖌 𝖒𝖆𝖙𝖙𝖊𝖗 𝖘𝖙𝖗𝖚𝖈𝖙𝖚𝖗𝖊...",
                invalid: `❌ 𝕴𝖓𝖛𝖆𝖑𝖎𝖉 𝖙𝖆𝖗𝖌𝖊𝖙. 𝖀𝖘𝖊: ${prefix}𝖊𝖑𝖊𝖒𝖊𝖓𝖙 [𝖓𝖆𝖒𝖊/𝖘𝖞𝖒𝖇𝖔𝖑]`,
                react: "⚛️"
            },
            normal: {
                title: "⚛️ VEX ELEMENT INTEL ⚛️",
                line: "─",
                wait: "⏳ Fetching atomic profile...",
                invalid: `❓ Provide an element! Example: ${prefix}element Gold`,
                react: "🧪"
            },
            girl: {
                title: "🫧 𝒮𝒸𝒾𝑒𝓃𝒸𝑒 𝒫𝓇𝒾𝓃𝒸𝑒𝓈𝓈 𝐿𝒶𝒷 🫧",
                line: "┄",
                wait: "🫧 𝓁𝑒𝓉 𝓂𝑒 𝓈𝑒𝑒 𝓌𝒽𝒶𝓉 𝓉𝒽𝒾𝓈 𝒾𝓈 𝓂𝒶𝒹𝑒 𝑜𝒻~ 🫧",
                invalid: `🫧 𝓌𝒽𝒾𝒸𝒽 𝑒𝓁𝑒𝓂𝑒𝓃𝓉 𝒶𝓇𝑒 𝓌𝑒 𝓈𝓉𝓊𝒹𝓎𝒾𝓃𝑔, 𝒹𝑒𝒶𝓇? 🫧`,
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        if (!query) return m.reply(current.invalid);

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 3. FETCH DATA (Periodic Table API)
            const response = await axios.get(`https://neelpatel05.pythonanywhere.com/element/api/v1/get-element?element=${query}`);
            const data = response.data;

            if (!data.name) throw new Error("Not found");

            // 4. DATA EXTRACTION (VEX Logic)
            const name = data.name;
            const symbol = data.symbol;
            const atomicNumber = data.atomicNumber;
            const atomicMass = data.atomicMass;
            const group = data.groupBlock;
            const period = data.period;
            const meltingPoint = data.meltingPoint || 'N/A';
            const boilingPoint = data.boilingPoint || 'N/A';
            const density = data.density || 'N/A';
            const discoveredBy = data.discoveredBy || 'Ancient';
            const electronConfig = data.electronicConfiguration;

            // 5. BUILD THE INTELLIGENCE REPORT
            let report = `*${current.title}*\n${current.line.repeat(15)}\n\n`;
            report += `🧪 *Element:* ${name} (${symbol})\n`;
            report += `🔢 *Atomic Number:* ${atomicNumber}\n`;
            report += `⚖️ *Atomic Mass:* ${atomicMass}\n`;
            report += `📂 *Group:* ${group}\n`;
            report += `⏳ *Period:* ${period}\n`;
            report += `🌡️ *Melting Pt:* ${meltingPoint} K\n`;
            report += `🔥 *Boiling Pt:* ${boilingPoint} K\n`;
            report += `💎 *Density:* ${density} g/cm³\n`;
            report += `🔍 *Discovered By:* ${discoveredBy}\n`;
            report += `⚡ *Electron Config:* \n\`\`\`${electronConfig}\`\`\`\n\n`;
            report += `${current.line.repeat(15)}\n_VEX Intelligence - Lupin Edition_`;

            // 6. TRANSLATE & SEND
            const { text: translatedReport } = await translate(report, { to: targetLang });
            await m.reply(translatedReport);

        } catch (error) {
            console.error("ELEMENT ERROR:", error);
            await m.reply("☣️ Analysis failed. Element not found in the periodic database.");
        }
    }
};
