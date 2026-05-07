/**
 * VEX NEURAL AI - GEMINI BRIDGE
 * Role: Logic #6 - Human-Like Autorepl
 * System: Supabase Integrated & Prompt Engineering
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { SettingsManager } = require("./settings_manager");

// Default VEX API (Hapa unaweka ile yako ya akiba)
const DEFAULT_VEX_KEY = "AIzaSyCYZ9Or3uaaULQx9CFCnOrEAC_oEqSDVfw";

const AI_Manager = {
    /**
     * Inatengeneza jibu linaloonesha uhusika wa mmiliki (Lupin)
     * @param {string} botJid - JID ya bot ili kupata settings zake Supabase
     * @param {string} message - Ujumbe unaoingia
     * @param {string} pushName - Jina la anayetuma ujumbe
     */
    generateResponse: async (botJid, message, pushName) => {
        try {
            // Inasoma settings kutoka Supabase
            const config = await SettingsManager.initUser(botJid);
            const userAI = config.autoReply;

            // Priority Logic: Tumia key ya mtumiaji kama ipo, vinginevyo tumia ya akiba
            const activeKey = userAI.geminiKey && userAI.geminiKey !== "" ? userAI.geminiKey : DEFAULT_VEX_KEY;
            
            const genAI = new GoogleGenerativeAI(activeKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            // The "Neural Identity" Prompt - Imeboreshwa
            const prompt = `
            STRICT IDENTITY SYSTEM:
            ${userAI.aiPrompt || "You are the owner of this WhatsApp account. Respond naturally."}
            
            CONTEXT:
            - Responding to: ${pushName}
            - Incoming message: "${message}"
            
            VEX SYSTEM RULES:
            1. NEVER mention you are an AI, a bot, or a language model.
            2. Keep responses concise, human-like, and direct.
            3. Use Swahili/English mix (Sheng) where natural.
            4. If the message is a greeting, be friendly but brief.
            5. If you are asked something personal you don't know, respond like a busy human.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Kusafisha jibu lisizidi maneno mengi sana (Keep it human)
            return text.trim();

        } catch (error) {
            console.error("VEX AI ERROR:", error.message);
            // Kama kuna error ya API, rudi kwenye jibu fupi la kibinadamu badala ya kukaa kimya
            return null; 
        }
    }
};

module.exports = { AI_Manager };
