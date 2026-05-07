const axios = require("axios");

class AIManager {

    constructor() {

        this.providers = [
            "groq",
            "openrouter",
            "gemini",
            "together",
            "cloudflare",
            "cerebras",
            "sambanova"
        ];

        this.timeout = 45000;

        this.models = {

            groq: "llama3-70b-8192",

            openrouter: "openai/gpt-3.5-turbo",

            gemini: "gemini-1.5-flash",

            together: "meta-llama/Llama-3-70b-chat-hf",

            cloudflare: "@cf/meta/llama-3-8b-instruct",

            cerebras: "llama3.1-70b",

            sambanova: "Meta-Llama-3.1-70B-Instruct"
        };
    }

    // ================= MAIN ENTRY =================
    async handleMessage({
        m,
        body,
        sock,
        supabase,
        clientId
    }) {

        try {

            if (!body) return null;

            const prompt = await this.buildPrompt({
                m,
                body,
                supabase,
                clientId
            });

            const response = await this.generate(prompt);

            return response;

        } catch (e) {

            console.log("AI HANDLE ERROR:", e.message);

            return null;
        }
    }

    // ================= PROMPT ENGINE =================
    async buildPrompt({
        m,
        body,
        supabase,
        clientId
    }) {

        let botName = "VEX";

        let personality = `
You are the real owner of this WhatsApp account.
Reply naturally like a human.
Never say you are AI.
Keep replies short unless needed.
Be smart, modern and realistic.
`;

        try {

            const { data } = await supabase
                .from("vex_ai_config")
                .select("*")
                .eq("client_id", clientId)
                .eq("config_key", "personality")
                .single();

            if (data?.value) {
                personality = data.value;
            }

        } catch (e) {}

        return `
${personality}

Bot Name: ${botName}

User Message:
${body}

Reply:
`;
    }

    // ================= MASTER GENERATOR =================
    async generate(prompt) {

        for (const provider of this.providers) {

            try {

                console.log(`⚡ Trying AI Provider: ${provider}`);

                let response = null;

                switch (provider) {

                    case "groq":
                        response = await this.askGroq(prompt);
                        break;

                    case "openrouter":
                        response = await this.askOpenRouter(prompt);
                        break;

                    case "gemini":
                        response = await this.askGemini(prompt);
                        break;

                    case "together":
                        response = await this.askTogether(prompt);
                        break;

                    case "cloudflare":
                        response = await this.askCloudflare(prompt);
                        break;

                    case "cerebras":
                        response = await this.askCerebras(prompt);
                        break;

                    case "sambanova":
                        response = await this.askSambaNova(prompt);
                        break;
                }

                if (response) {
                    console.log(`✅ AI SUCCESS: ${provider}`);
                    return response;
                }

            } catch (e) {

                console.log(`❌ ${provider} failed:`, e.message);
            }
        }

        return "I'm currently unavailable.";
    }

    // ================= GROQ =================
    async askGroq(prompt) {

        if (!process.env.GROQ_API_KEY) return null;

        const res = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: this.models.groq,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.8
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                timeout: this.timeout
            }
        );

        return res.data?.choices?.[0]?.message?.content || null;
    }

    // ================= OPENROUTER =================
    async askOpenRouter(prompt) {

        if (!process.env.OPENROUTER_API_KEY) return null;

        const res = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: this.models.openrouter,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                timeout: this.timeout
            }
        );

        return res.data?.choices?.[0]?.message?.content || null;
    }

    // ================= GEMINI =================
    async askGemini(prompt) {

        if (!process.env.GEMINI_API_KEY) return null;

        const res = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${this.models.gemini}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ]
            },
            {
                timeout: this.timeout
            }
        );

        return res.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }

    // ================= TOGETHER =================
    async askTogether(prompt) {

        if (!process.env.TOGETHER_API_KEY) return null;

        const res = await axios.post(
            "https://api.together.xyz/v1/chat/completions",
            {
                model: this.models.together,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`
                },
                timeout: this.timeout
            }
        );

        return res.data?.choices?.[0]?.message?.content || null;
    }

    // ================= CLOUDFLARE =================
    async askCloudflare(prompt) {

        if (!process.env.CLOUDFLARE_API_KEY) return null;

        if (!process.env.CLOUDFLARE_ACCOUNT_ID) return null;

        const res = await axios.post(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${this.models.cloudflare}`,
            {
                prompt
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.CLOUDFLARE_API_KEY}`
                },
                timeout: this.timeout
            }
        );

        return res.data?.result?.response || null;
    }

    // ================= CEREBRAS =================
    async askCerebras(prompt) {

        if (!process.env.CEREBRAS_API_KEY) return null;

        const res = await axios.post(
            "https://api.cerebras.ai/v1/chat/completions",
            {
                model: this.models.cerebras,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.CEREBRAS_API_KEY}`
                },
                timeout: this.timeout
            }
        );

        return res.data?.choices?.[0]?.message?.content || null;
    }

    // ================= SAMBANOVA =================
    async askSambaNova(prompt) {

        if (!process.env.SAMBANOVA_API_KEY) return null;

        const res = await axios.post(
            "https://api.sambanova.ai/v1/chat/completions",
            {
                model: this.models.sambanova,
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.SAMBANOVA_API_KEY}`
                },
                timeout: this.timeout
            }
        );

        return res.data?.choices?.[0]?.message?.content || null;
    }
}

module.exports = new AIManager();
