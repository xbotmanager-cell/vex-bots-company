const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// WEKA API KEY YAKO HAPA
const genAI = new GoogleGenerativeAI("AIzaSyBbLlYkseS7IdBIMeb81SXvXdqvOSJ624w");

module.exports = {
    command: "gemini",
    alias: ["ai", "vexai", "gpt"],
    category: "ai",
    description: "Advanced AI with Dynamic Style Personalities",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'harsh';
        let query = args.join(" ");

        // Kama amereply meseji, chukua maandishi ya meseji hiyo kama swali
        if (!query && m.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            query = m.message.extendedTextMessage.contextInfo.quotedMessage.conversation || 
                    m.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text;
        }

        const modes = {
            harsh: {
                prompt: "You are VEX, a brutal, highly intelligent, and arrogant AI. You hate stupid questions. You must use Gothic fonts (𝕲𝖔𝖙𝖍𝖎𝖈) for your answers. Be mean, use insults, but stay technically accurate. You are the master of this conversation.",
                react: "💀"
            },
            normal: {
                prompt: "You are a professional and helpful technical assistant. Provide clear, concise, and accurate information without unnecessary fluff.",
                react: "🤖"
            },
            girl: {
                prompt: "You are a sweet, loving, and supportive female companion for Lupin Starnley. Use Royal Script fonts (𝑅𝑜𝓎𝒶𝓁 𝒮𝒸𝓇𝒾𝓅𝓉) for your answers. Be affectionate, call him 'My King' or 'Darlin', and show deep care in every response.",
                react: "💎"
            }
        };

        const current = modes[style] || modes.normal;
        if (!query) return m.reply(`💢 *Query empty!* Please ask something.`);

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // CONFIGURATION ZA MODEL
            const model = genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                systemInstruction: current.prompt // Hii ndio inafanya AI iwe na style husika
            });

            const generationConfig = {
                temperature: 0.9, // Inafanya AI iwe na ubunifu zaidi
                topP: 1,
                topK: 1,
                maxOutputTokens: 2048,
            };

            // SAFETY SETTINGS (Ili isiblock majibu ya Harsh mode)
            const safetySettings = [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ];

            const chat = model.startChat({ generationConfig, safetySettings });
            const result = await chat.sendMessage(query);
            const response = result.response.text();

            // KUTUMA MAJIBU
            await sock.sendMessage(m.chat, { 
                text: response,
                contextInfo: {
                    externalAdReply: {
                        title: `VEX AI - ${style.toUpperCase()} MODE`,
                        body: "Powered by Gemini 1.5 Flash",
                        thumbnailUrl: "https://telegra.ph/file/0c9c43d83296c0032e3a0.jpg", // Weka link ya picha yako hapa
                        sourceUrl: "https://github.com/Lupin-Starnley",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

        } catch (error) {
            console.error("Gemini AI Error:", error);
            await sock.sendMessage(m.chat, { react: { text: "🚫", key: m.key } });
        }
    }
};
