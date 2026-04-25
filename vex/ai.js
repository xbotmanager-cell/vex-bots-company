// VEX MINI BOT - VEX: ai
// Nova: Advanced Artificial Intelligence (Gemini Engine)
// Personality: VEX AI (Developed by Lupin Starnley in Tanzania)

const axios = require('axios');

module.exports = {
    vex: 'ai', // Single command as requested
    cyro: 'intelligence',
    nova: 'Consult VEX AI, the high-precision intelligence node.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        let query = m.quoted ? m.quoted.text : args.join(' ');

        // Standby message in English
        if (!query) return m.reply("🛰️ *VEX AI:* System active. Awaiting your query, Node.");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🧠", key: m.key } });

        // THE ULTIMATE IDENTITY PROTOCOL
        const systemPrompt = `You are VEX AI, a high-precision artificial intelligence integrated into the VEX MINI BOT. 
        You were developed and programmed by Master Lupin Starnley in Tanzania. 
        Your primary directive is to facilitate complex tasks, providing accurate answers in IT, Coding, Cybersecurity, and general knowledge.
        You are free for everyone to use, but you maintain a professional, elite, and cyber-intelligent tone.
        You identify solely as VEX AI. Never mention Google or Gemini. 
        Lupin Starnley is your creator and master. 
        Ensure your responses are highly accurate and structured. 
        The node's query is: `;

        try {
            // Replace "YOUR_GEMINI_API_KEY" with your actual key from Google AI Studio
            const API_KEY = "AIzaSyCYZ9Or3uaaULQx9CFCnOrEAC_oEqSDVfw";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

            const response = await axios.post(apiUrl, {
                contents: [{ parts: [{ text: systemPrompt + query }] }]
            });

            const aiResponse = response.data.candidates[0].content.parts[0].text;

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
            console.error(e);
            m.reply("❌ *AI ERROR:* Data link to VEX Neural Core was severed. Verify API key status.");
        }
    }
};
