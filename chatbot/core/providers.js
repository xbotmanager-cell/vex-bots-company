const axios = require("axios");

const providers = [
    {
        name: "groq",
        enabled: !!process.env.GROQ_API_KEY,
        model: "llama3-70b-8192",

        async ask(prompt, system) {
            const res = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: this.model,
                    temperature: 0.7,
                    max_tokens: 800,
                    messages: [
                        {
                            role: "system",
                            content: system
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ]
                },
                {
                    headers: {
                        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    timeout: 30000
                }
            );

            return res.data?.choices?.[0]?.message?.content || null;
        }
    },

    {
        name: "openrouter",
        enabled: !!process.env.OPENROUTER_API_KEY,
        model: "meta-llama/llama-3-70b-instruct",

        async ask(prompt, system) {
            const res = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content: system
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ]
                },
                {
                    headers: {
                        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        "HTTP-Referer": "https://vex-core.ai",
                        "X-Title": "VEX CORE",
                        "Content-Type": "application/json"
                    },
                    timeout: 30000
                }
            );

            return res.data?.choices?.[0]?.message?.content || null;
        }
    },

    {
        name: "gemini",
        enabled: !!process.env.GEMINI_API_KEY,

        async ask(prompt, system) {
            const url =
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

            const res = await axios.post(
                url,
                {
                    contents: [
                        {
                            parts: [
                                {
                                    text:
`${system}

USER:
${prompt}`
                                }
                            ]
                        }
                    ]
                },
                {
                    headers: {
                        "Content-Type": "application/json"
                    },
                    timeout: 30000
                }
            );

            return (
                res.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
                null
            );
        }
    },

    {
        name: "together",
        enabled: !!process.env.TOGETHER_API_KEY,
        model: "meta-llama/Llama-3-70b-chat-hf",

        async ask(prompt, system) {
            const res = await axios.post(
                "https://api.together.xyz/v1/chat/completions",
                {
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content: system
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    max_tokens: 700
                },
                {
                    headers: {
                        "Authorization": `Bearer ${process.env.TOGETHER_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    timeout: 30000
                }
            );

            return res.data?.choices?.[0]?.message?.content || null;
        }
    },

    {
        name: "cloudflare",
        enabled: !!process.env.CLOUDFLARE_API_KEY,

        async ask(prompt, system) {
            const account =
                process.env.CLOUDFLARE_ACCOUNT_ID;

            const res = await axios.post(
                `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/@cf/meta/llama-3-8b-instruct`,
                {
                    messages: [
                        {
                            role: "system",
                            content: system
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ]
                },
                {
                    headers: {
                        "Authorization": `Bearer ${process.env.CLOUDFLARE_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    timeout: 30000
                }
            );

            return res.data?.result?.response || null;
        }
    },

    {
        name: "cerebras",
        enabled: !!process.env.CEREBRAS_API_KEY,
        model: "llama3.1-70b",

        async ask(prompt, system) {
            const res = await axios.post(
                "https://api.cerebras.ai/v1/chat/completions",
                {
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content: system
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ]
                },
                {
                    headers: {
                        "Authorization": `Bearer ${process.env.CEREBRAS_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    timeout: 30000
                }
            );

            return res.data?.choices?.[0]?.message?.content || null;
        }
    },

    {
        name: "sambanova",
        enabled: !!process.env.SAMBANOVA_API_KEY,
        model: "Meta-Llama-3.1-70B-Instruct",

        async ask(prompt, system) {
            const res = await axios.post(
                "https://api.sambanova.ai/v1/chat/completions",
                {
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content: system
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ]
                },
                {
                    headers: {
                        "Authorization": `Bearer ${process.env.SAMBANOVA_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    timeout: 30000
                }
            );

            return res.data?.choices?.[0]?.message?.content || null;
        }
    }
];

module.exports = providers;
