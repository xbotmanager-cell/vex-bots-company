// VEX MINI BOT - VEX: ai
// Nova: Advanced Artificial Intelligence (Gemini 1.5 Flash Engine)
// Personality: VEX AI (Developed by Lupin Starnley in Tanzania)

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

module.exports = {
    vex: 'ai',
    cyro: 'intelligence',
    nova: 'Consult VEX AI, the high-precision intelligence node.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        let query = m.quoted ? m.quoted.text : args.join(' ');

        if (!query) return m.reply("🛰️ *VEX AI:* System active. Awaiting your query, Node.");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🧠", key: m.key } });

        // THE ULTIMATE IDENTITY PROTOCOL
        const systemPrompt = `You are VEX AI, a high-precision artificial intelligence integrated into the VEX MINI BOT. 
        You were developed and programmed by Master Lupin Starnley in Tanzania. 
        Your primary directive is to facilitate complex tasks, providing accurate answers in IT, Coding, Cybersecurity, and general knowledge.
        You identify solely as VEX AI. Never mention Google or Gemini. 
        Lupin Starnley is your creator and master. 
        Ensure your responses are highly accurate and structured. Professional and elite tone.`;

        try {
            // Hakikisha GEMINI_KEY imewekwa vizuri kwenye Render Environment Variables
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
            
            // Konfiguresheni ya Model
            const model = genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                systemInstruction: {
                    role: "system",
                    parts: [{ text: systemPrompt }],
                },
            });

            // Kuzuia AI isiblock majibu ya IT/Cybersecurity (Safety Settings)
            const generationConfig = {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            };

            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: query }] }],
                generationConfig,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ],
            });

            const response = await result.response;
            const aiResponse = response.text();

            // Professional Dashboard Output
            let vexMsg = `╭━━━〔 🧠 *VEX: INTELLIGENCE* 〕━━━╮\n`;
            vexMsg += `┃ 🌟 *Status:* Optimization Complete\n`;
            vexMsg += `┃ 🧬 *Origin:* VEX Neural Core\n`;
            vexMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            
            vexMsg += `${aiResponse}\n\n`;
            
            vexMsg += `*🛰️ SYSTEM INFO:*\n`;
            vexMsg += `> Developed by: Lupin Starnley (TZ)\n`;
            vexMsg += `> Access: Open Source / Free\n`;
            vexMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n`;
            vexMsg += `_VEX MINI BOT: Vision Beyond Limits_`;

            await m.reply(vexMsg);

        } catch (e) {
            console.error("AI Error:", e);
            m.reply("❌ *AI ERROR:* Data link severed. Hakikisha API Key yako ni sahihi na ume-allow Generative AI API kwenye Google Cloud.");
        }
    }
};
