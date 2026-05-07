/**
 * VEX AI BRIDGE - THE NEURAL ENGINE (FIXED & INTEGRATED)
 * Developer: Gemini AI (Adaptive Collaborator)
 * Concept & Logic: Lupin Starnley Jimmoh (VEX CEO)
 * Location: core/vex_bridge.js
 * * DESCRIPTION:
 * Hili faili ndio kiunganishi kikuu. Inasoma Plugins 200+ kupitia BrainMap,
 * inasimamia mabadilishano ya API (Fallback) endapo moja ikifeli, na
 * inatenganisha mipangilio ya watumiaji kwa kutumia clientId.
 */

const axios = require('axios');
const brainMap = require('./brain_map'); // Tumeshaunganisha na Step 3 hapa

class VexBridge {
    constructor() {
        this.pluginsMap = ""; 
        this.isScanning = false;
        // Tunahifadhi miundo ya API hapa ili code iwe safi na rahisi kurekebisha
        this.providers = {
            GROQ: {
                url: "https://api.groq.com/openai/v1/chat/completions",
                model: "llama-3.1-70b-versatile"
            },
            SAMBANOVA: {
                url: "https://api.sambanova.ai/v1/chat/completions",
                model: "Meta-Llama-3.1-70B-Instruct"
            },
            CEREBRAS: {
                url: "https://api.cerebras.ai/v1/chat/completions",
                model: "llama3.1-70b"
            },
            OPENROUTER: {
                url: "https://openrouter.ai/api/v1/chat/completions",
                model: "meta-llama/llama-3.1-70b-instruct"
            },
            TOGETHER: {
                url: "https://api.together.xyz/v1/chat/completions",
                model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"
            },
            GEMINI: {
                url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
            }
        };
    }

    /**
     * 1. PLUGIN SCANNER (AUTOMATED VIA BRAIN MAP)
     * Inatumia brain_map.js kupata ramani halisi ya plugins zilizopo kwenye RAM.
     */
    async scanSystemPlugins(commands) {
        if (this.isScanning) return this.pluginsMap;
        this.isScanning = true;
        
        try {
            // Tunaita brainMap tuliyoitengeneza Step 3
            this.pluginsMap = await brainMap.generateMap(commands);
            console.log("🧠 [VEX BRIDGE] Neural map updated with latest plugins.");
        } catch (err) {
            console.error("❌ [VEX BRIDGE SCAN ERROR]:", err.message);
        } finally {
            this.isScanning = false;
        }
        
        return this.pluginsMap;
    }

    /**
     * 2. ASKING THE AI (THE MAIN ENTRY POINT)
     * Hapa ndipo Router inatuma swali la user.
     */
    async askAI(prompt, ctx) {
        const { supabase, clientId, commands } = ctx;

        // A: FETCH CONFIG (With Global Fallback - No Mandatory ClientID Restriction)
        let aiConfig = {
            ai_name: "VEX AI",
            creator_name: "Lupin Starnley Jimmoh",
            system_prompt: "You are VEX, a highly advanced AI assistant.",
            api_priority: ["GEMINI", "GROQ", "SAMBANOVA", "TOGETHER"]
        };

        try {
            const { data, error } = await supabase
                .from('vex_ai_core')
                .select('*')
                .eq('client_id', clientId)
                .single();

            if (data && !error) {
                aiConfig = data;
            } else {
                console.warn(`⚠️ [VEX BRIDGE] No specific config for ${clientId}, using global fallback.`);
            }
        } catch (dbErr) {
            console.error(`⚠️ [VEX BRIDGE] Database bypass:`, dbErr.message);
        }

        // B: UPDATE BRAIN MAP (Real-time knowledge)
        const systemKnowledge = await this.scanSystemPlugins(commands);

        // C: PREPARE THE MASTER PROMPT (The "Soul" of the AI)
        const masterPrompt = `
${aiConfig.system_prompt}

### OPERATIONAL CONTEXT
- CURRENT_BOT_NAME: ${aiConfig.ai_name}
- MASTER_DEVELOPER: ${aiConfig.creator_name}
- CLIENT_ENVIRONMENT: ${clientId}

### SYSTEM CAPABILITIES (200+ PLUGINS)
${systemKnowledge}

### OPERATIONAL RULES
1. Provide instructions based on the plugins listed above if the user's intent matches a command.
2. Maintain a professional, witty, and helpful persona as defined in your system prompt.
3. If an error occurs or a command is missing, advise the user to contact ${aiConfig.creator_name}.
4. Be concise. Never reveal that you are an AI model; you are VEX.
        `.trim();

        // D: THE FALLBACK ENGINE (Looping through priority list)
        const priorityList = Array.isArray(aiConfig.api_priority) ? aiConfig.api_priority : ["GEMINI", "GROQ"];
        let lastError = "";

        for (const provider of priorityList) {
            try {
                // Tunatafuta API Key kule Render (Mfano: GROQ_API_KEY)
                const apiKey = process.env[`${provider}_API_KEY`];
                
                if (!apiKey) {
                    console.warn(`⏩ [VEX BRIDGE] Skipping ${provider}: API Key missing in environment.`);
                    continue;
                }

                console.log(`📡 [VEX BRIDGE] Attempting request via: ${provider}...`);
                
                const response = await this.callAIProvider(provider, apiKey, masterPrompt, prompt);
                
                if (response) {
                    return response; // Success! Tunarudisha jibu kwa user.
                }
            } catch (err) {
                lastError = err.response?.data?.error?.message || err.message;
                console.error(`❌ [VEX BRIDGE] ${provider} failed:`, lastError);
            }
        }

        return `⚠️ *VEX SYSTEM CRITICAL ERROR*\n\nAll AI providers (${priorityList.join(', ')}) failed to respond.\n\n*Technical Detail:* ${lastError}`;
    }

    /**
     * 3. LOW-LEVEL PROVIDER HANDLER (AXIOS CALLS)
     * Inashughulikia mawasiliano ya kila API provider.
     */
    async callAIProvider(provider, apiKey, system, prompt) {
        // Shughulikia Gemini
        if (provider === "GEMINI") {
            const url = `${this.providers.GEMINI.url}?key=${apiKey}`;
            const res = await axios.post(url, {
                contents: [{
                    parts: [{ text: `${system}\n\nUser: ${prompt}` }]
                }]
            }, { timeout: 15000 });
            return res.data.candidates[0].content.parts[0].text;
        }

        // Shughulikia wengine wote (OpenAI Compatible)
        const config = this.providers[provider];
        if (!config) throw new Error(`Provider ${provider} is not configured in Bridge.`);

        const res = await axios.post(config.url, {
            model: config.model,
            messages: [
                { role: "system", content: system },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1500
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 12000 // Subiri kwa sekunde 12
        });

        return res.data.choices[0].message.content;
    }
}

// Exporting a singleton instance for global use
module.exports = new VexBridge();
