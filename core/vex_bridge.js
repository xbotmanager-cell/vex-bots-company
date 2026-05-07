/**
 * VEX AI BRIDGE - THE NEURAL ENGINE
 * Developer: Gemini AI (Adaptive Collaborator)
 * Concept & Logic: Lupin Starnley Jimmoh (VEX CEO)
 * * Hili faili ni daraja kati ya mfumo wako wa sasa (Commands 200+) na AI Models.
 * Inasimamia Fallback ya API Keys, kusoma maelezo ya plugins, na kutenganisha 
 * watumiaji kwa kutumia clientId.
 */

const axios = require('axios');

class VexBridge {
    constructor() {
        this.pluginsMap = ""; // Hapa ndipo maelezo ya plugins 200+ yatahifadhiwa
        this.isScanning = false;
    }

    /**
     * 1. PLUGIN SCANNER (AUTOMATED)
     * Inapitia commands zote zilizopo kwenye cache bila wewe kubadilisha hata plugin moja.
     * Inasoma 'command' na 'description' pekee.
     */
    async scanSystemPlugins(commands) {
        if (this.isScanning) return;
        this.isScanning = true;
        
        let mapText = "\n--- SYSTEM PLUGINS AVAILABLE ---\n";
        
        // Tunachukua commands zote kutoka kwenye Map ya cache.js
        commands.forEach((cmd, name) => {
            // Tunachuja commands ili AI isichanganyikiwe na majina mengi ya alias
            // Tunachukua ile main command pekee
            if (cmd.command === name) {
                const desc = cmd.description || "No description provided.";
                const category = cmd.category || "General";
                mapText += `- [${name}]: ${desc} (Category: ${category})\n`;
            }
        });

        this.pluginsMap = mapText;
        this.isScanning = false;
        return this.pluginsMap;
    }

    /**
     * 2. API FALLBACK ENGINE
     * Inajaribu API moja baada ya nyingine kulingana na list iliyopo Supabase.
     */
    async askAI(prompt, ctx) {
        const { supabase, clientId, cache, commands } = ctx;

        // A: Pata Mipangilio kutoka Supabase (vex_ai_core)
        const { data: aiConfig, error } = await supabase
            .from('vex_ai_core')
            .select('*')
            .eq('client_id', clientId)
            .single();

        if (error || !aiConfig) {
            console.error("⚠️ VEX BRIDGE: Kushindwa kupata Config za AI kule Supabase.");
            return "Samahani Lupin, mfumo wangu wa AI haujasetiwa vizuri kwenye Database.";
        }

        // B: Scan Plugins sasa hivi ili AI iwe na "Latest Knowledge"
        const latestPlugins = await this.scanSystemPlugins(commands);

        // C: Tengeneza System Prompt (Sheria Mama ya VEX AI)
        const systemIdentity = `
            ${aiConfig.system_prompt}
            
            USER CONTEXT:
            - Client ID: ${clientId}
            - Your Creator: ${aiConfig.creator_name}
            - Your Name: ${aiConfig.ai_name}
            
            ${latestPlugins}
            
            RULES:
            1. If the user asks for a task that matches a plugin above, tell them the exact command to use.
            2. You are VEX AI, do not mention you are a language model.
            3. Answer briefly and smartly. Use the style defined by the user.
        `;

        // D: Fallback Loop (The Heart of Vex Bridge)
        const priorityList = aiConfig.api_priority; // ["GROQ", "SAMBANOVA", ...]
        let lastError = "";

        for (const provider of priorityList) {
            try {
                const apiKey = process.env[`${provider}_API_KEY`];
                if (!apiKey) continue; // Kama Key haipo Render, ruka kwenda inayofuata

                const response = await this.callAIProvider(provider, apiKey, systemIdentity, prompt);
                
                if (response) {
                    return response; // Tumeshapata jibu, maliza loop!
                }
            } catch (err) {
                lastError = err.message;
                console.warn(`⚠️ VEX BRIDGE: ${provider} imefeli. Inajaribu inayofuata... Reason: ${lastError}`);
                // Loop itaendelea kwenda API inayofuata kwenye list
            }
        }

        return `⚠️ VEX AI ERROR: API zote (${priorityList.join(', ')}) zimeshindwa kujibu.\nLast Error: ${lastError}`;
    }

    /**
     * 3. AI PROVIDER HANDLER
     * Hapa ndipo tunajua kila API inaitwaje (OpenAI compatible formats).
     */
    async callAIProvider(provider, apiKey, system, prompt) {
        let url = "";
        let model = "";

        // Tunaseti URL na Model kulingana na Provider
        switch (provider) {
            case "GROQ":
                url = "https://api.groq.com/openai/v1/chat/completions";
                model = "llama-3.1-70b-versatile";
                break;
            case "SAMBANOVA":
                url = "https://api.sambanova.ai/v1/chat/completions";
                model = "Meta-Llama-3.1-70B-Instruct";
                break;
            case "CEREBRAS":
                url = "https://api.cerebras.ai/v1/chat/completions";
                model = "llama3.1-70b";
                break;
            case "GEMINI":
                url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
                // Gemini inahitaji format tofauti kidogo, lakini kwa sasa tunatumia Llama format kwa wengine
                break;
            case "OPENROUTER":
                url = "https://openrouter.ai/api/v1/chat/completions";
                model = "meta-llama/llama-3.1-70b-instruct";
                break;
            default:
                return null;
        }

        // Hapa tunatuma Request (Standard OpenAI Format inafanya kazi kwa karibu API zote ulizotaja)
        const response = await axios.post(url, {
            model: model,
            messages: [
                { role: "system", content: system },
                { role: "user", content: prompt }
            ],
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // Sekunde 10 ikikwama, tunahamia API nyingine
        });

        return response.data.choices[0].message.content;
    }
}

module.exports = new VexBridge();
