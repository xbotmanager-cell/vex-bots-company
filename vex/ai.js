// VEX MINI BOT - VEX: ai
// Nova: Advanced Artificial Intelligence (Gemini 1.5 Flash Engine)
// Personality: VEX AI (Developed by Lupin Starnley in Tanzania)

const { GoogleGenerativeAI } = require("@google/generative-ai");

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
        You are free for everyone to use, but you maintain a professional, elite, and cyber-intelligent tone.
        You identify solely as VEX AI. Never mention Google or Gemini. 
        Lupin Starnley is your creator and master. 
        Ensure your responses are highly accurate and structured.`;

        try {
            // Fetching API Key from Render Environment Variable
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY);
            
            // Using Gemini 1.5 Flash for high-speed response
            const model = genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                systemInstruction: systemPrompt,
            });

            const result = await model.generateContent(query);
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
            m.reply("❌ *AI ERROR:* Data link to VEX Neural Core was severed. Ensure GEMINI_KEY is correctly set in Render environment.");
        }
    }
};
