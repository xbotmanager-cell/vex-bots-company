const { GoogleGenerativeAI } = require("@google/generative-ai");

// ⚠️ WEKA API KEY YAKO SAHIHI HAPA
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "AIzaSyBbLlYkseS7IdBIMeb81SXvXdqvOSJ624w");

module.exports = {
    command: "gemini",
    category: "ai",
    description: "Advanced AI with Dynamic Style Personalities",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'harsh';

        let query = args.join(" ");

        // handle reply message
        if (!query && m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            query =
                m.message.extendedTextMessage.contextInfo.quotedMessage.conversation ||
                m.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text ||
                "";
        }

        if (!query) return m.reply("💢 *Query empty!* Please ask something.");

        const modes = {
            harsh: {
                prompt: "You are VEX, a brutal, highly intelligent, and arrogant AI. You hate stupid questions. You must use Gothic fonts (𝕲𝖔𝖙𝖍𝖎𝖈) for your answers. Be mean, use insults, but stay technically accurate.",
                react: "💀"
            },
            normal: {
                prompt: "You are a professional and helpful technical assistant. Provide clear and accurate answers.",
                react: "🤖"
            },
            girl: {
                prompt: "You are a sweet and loving female companion. Use Royal Script fonts (𝑅𝑜𝓎𝒶𝓁 𝒮𝒸𝓇𝒾𝓅𝓉). Be affectionate and caring.",
                react: "💎"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, {
                react: { text: current.react, key: m.key }
            });

            // ✔ FIX: use generateContent instead of startChat (stable)
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash"
            });

            const result = await model.generateContent({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: `${current.prompt}\n\nUser: ${query}` }]
                    }
                ]
            });

            const response =
                result.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
                "⚠️ No response.";

            await sock.sendMessage(
                m.chat,
                {
                    text: response,
                    contextInfo: {
                        externalAdReply: {
                            title: `VEX AI - ${style.toUpperCase()} MODE`,
                            body: "Powered by Gemini",
                            thumbnailUrl: "https://telegra.ph/file/0c9c43d83296c0032e3a0.jpg",
                            sourceUrl: "https://github.com/Lupin-Starnley",
                            mediaType: 1,
                            renderLargerThumbnail: false
                        }
                    }
                },
                { quoted: m }
            );

        } catch (error) {
            console.error("Gemini AI Error:", error);

            await sock.sendMessage(m.chat, {
                react: { text: "🚫", key: m.key }
            });

            await m.reply("⚠️ AI failed to respond. Check API key or quota.");
        }
    }
};
