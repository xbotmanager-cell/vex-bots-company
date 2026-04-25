// VEX MINI BOT - VEX: recipe
// Nova: Provides concise cooking instructions for any dish globally.
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'recipe',
    cyro: 'utility',
    nova: 'Provides short, step-by-step cooking instructions for any dish.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        let dish = m.quoted ? m.quoted.text : args.join(' ');

        if (!dish) return m.reply("❌ *USAGE:* Provide a dish name. Example: `.recipe Pilau ya Ng'ombe` ");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🍳", key: m.key } });

        // INSTRUCTION PROTOCOL: Inamwambia AI itoe recipe fupi na iliyopangwa vizuri
        const chefPrompt = `You are VEX Chef AI. Provide a concise, step-by-step recipe for "${dish}". 
        Include:
        1. Estimated Prep Time.
        2. Essential Ingredients (Bullet points).
        3. Simple Cooking Steps (Numbered, max 6 steps).
        Tone: Professional and encouraging. Language: English.`;

        try {
            // Tumia Gemini API Key yako hapa
            const API_KEY = "YOUR_GEMINI_API_KEY";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

            const response = await axios.post(apiUrl, {
                contents: [{ parts: [{ text: chefPrompt }] }]
            });

            const recipeData = response.data.candidates[0].content.parts[0].text;

            let recipeMsg = `╭━━━〔 🍳 *VEX: CULINARY-SYNC* 〕━━━╮\n`;
            recipeMsg += `┃ 🌟 *Dish:* ${dish.toUpperCase()}\n`;
            recipeMsg += `┃ 🧬 *Status:* Recipe Extracted\n`;
            recipeMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            recipeMsg += `${recipeData}\n\n`;

            recipeMsg += `*👨‍🍳 MASTER'S NOTE:*\n`;
            recipeMsg += `> "Bon Appétit! Enjoy your meal provided by VEX Intelligence."\n\n`;
            recipeMsg += `_VEX MINI BOT: Vision Beyond Limits_`;

            await m.reply(recipeMsg);

        } catch (e) {
            console.error(e);
            m.reply("❌ *CHEF ERROR:* Failed to connect to the recipe database.");
        }
    }
};