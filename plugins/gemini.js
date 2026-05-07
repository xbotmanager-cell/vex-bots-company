/**
 * VEX PLUGIN: AI CORE BACKUP (DIRECT MODE)
 * Logic: Lupin Starnley Jimmoh (VEX CEO)
 * Location: plugins/ai_backup.js
 */

const vexBridge = require('../core/vex_bridge');

module.exports = {
    command: "ai",
    alias: [],
    category: "ai",
    description: "Direct AI Response without delays",

    async execute(m, sock, ctx) {
        const { args, userSettings, body, prefix } = ctx;
        const style = userSettings?.style?.value || 'normal';
        
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        let query = "";

        if (quoted) {
            query = quoted.conversation || quoted.extendedTextMessage?.text || quoted.imageMessage?.caption || "";
        } else {
            query = args.join(" ");
        }

        if (!query && body.startsWith(prefix)) {
            query = body.slice(prefix.length + 2).trim(); 
        }

        if (!query) return; // Silent return kama hamna swali

        const styles = {
            harsh: {
                title: "☘️ 𝖁𝕰𝖃 𝕳𝕬𝕽𝕾𝕳 ☘️",
                react: "☘️"
            },
            normal: {
                title: "💠 VEX AI 💠",
                react: "💠"
            },
            girl: {
                title: "🫧 𝒱𝑒𝓍𝒾𝑒 🫧",
                react: "🫧"
            }
        };

        const current = styles[style] || styles.normal;

        try {
            // Direct reaction pekee, mambo ya "Thinking..." yameondolewa
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            
            const aiResponse = await vexBridge.askAI(query, ctx);

            // Jibu direct bila maelezo mengi
            let finalMsg = `*${current.title}*\n\n`;
            finalMsg += `${aiResponse}`;

            await sock.sendMessage(m.chat, { text: finalMsg }, { quoted: m });

        } catch (error) {
            console.error("AI DIRECT ERROR:", error);
        }
    }
};
