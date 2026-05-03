// ================= LUPER-MD HEALTH ENGINE =================
const translate = require('google-translate-api-x');

module.exports = {
    command: "bmi",
    alias: ["afya", "health", "weight"],
    category: "health",
    description: "Calculate your Body Mass Index (BMI)",

    async execute(m, sock, { args, userSettings, lang, prefix }) {
        // 1. CONFIG & STYLE SYNC
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';
        
        // 2. INPUT VALIDATION (Weight in kg, Height in cm)
        const weight = parseFloat(args[0]);
        const heightCm = parseFloat(args[1]);

        // 3. STYLES DEFINITION
        const modes = {
            harsh: {
                title: "☣️ 𝕯𝕴𝕲𝕴𝕿𝕬𝕷 𝕳𝕰𝕬𝕷𝕿𝕳 𝕸𝕺𝕹𝕴𝕿𝕺𝕽 ☣️",
                line: "━",
                header: "💀 𝕬𝖓𝖆𝖑𝖞𝖟𝖎𝖓𝖌 𝖞𝖔𝖚𝖗 𝖕𝖍𝖞𝖘𝖎𝖈𝖆𝖑 𝖘𝖙𝖆𝖙𝖚𝖘:",
                invalid: `❌ 𝖀𝖘𝖊: ${prefix}𝖇𝖒𝖎 [𝖜𝖊𝖎𝖌𝖍𝖙_𝖐𝖌] [𝖍𝖊𝖎𝖌𝖍𝖙_𝖈𝖒]`,
                react: "⚖️"
            },
            normal: {
                title: "⚖️ VEX BMI CALCULATOR ⚖️",
                line: "─",
                header: "💡 Your Health Report:",
                invalid: `❓ Use: ${prefix}bmi 70 175 (Weight in kg, Height in cm)`,
                react: "⚖️"
            },
            girl: {
                title: "🫧 𝐻𝑒𝒶𝓁𝓉𝒽𝓎 𝒫𝓇𝒾𝓃𝒸𝑒𝓈𝓈 𝒞𝒽𝑒𝒸𝓀 🫧",
                line: "┄",
                header: "🫧 𝓁𝑒𝓉'𝓈 𝓈𝑒𝑒 𝒽𝑜𝓌 𝓎𝑜𝓊 𝒶𝓇𝑒 𝒹𝑜𝒾𝓃𝑔, 𝒹𝑒𝒶𝓇~ 🫧",
                invalid: `🫧 𝓅𝓁𝑒𝒶𝓈𝑒 𝓉𝑒𝓁𝓁 𝓂𝑒 𝓎𝑜𝓊𝓇 𝓌𝑒𝒾𝑔𝒽𝓉 𝒶𝓃𝒹 𝒽𝑒𝒾𝑔𝒽𝓉~ 🫧`,
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        if (!weight || !heightCm) {
            return m.reply(current.invalid);
        }

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 4. BMI CALCULATION LOGIC
            const heightM = heightCm / 100;
            const bmi = (weight / (heightM * heightM)).toFixed(2);
            
            let status = "";
            if (bmi < 18.5) status = "Underweight";
            else if (bmi < 25) status = "Normal weight";
            else if (bmi < 30) status = "Overweight";
            else status = "Obese";

            // 5. BUILD THE REPORT
            let report = `*${current.title}*\n${current.line.repeat(15)}\n\n`;
            report += `*${current.header}*\n\n`;
            report += `⚖️ *BMI:* ${bmi}\n`;
            report += `📊 *Status:* ${status}\n\n`;
            report += `${current.line.repeat(15)}\n_VEX Intelligence - Lupin Edition_`;

            // 6. TRANSLATE & SEND
            const { text: translatedMsg } = await translate(report, { to: targetLang });
            await m.reply(translatedMsg);

        } catch (error) {
            console.error("BMI ERROR:", error);
            await m.reply("☣️ Health engine is temporarily offline.");
        }
    }
};
