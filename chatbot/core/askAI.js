const providers = require("./providers");
const config = require("./config");

function clean(text = "") {
    return String(text)
        .replace(/^\s+|\s+$/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

async function askAI({
    prompt = "",
    user = "Unknown",
    pushName = "User"
}) {

    if (!prompt) return null;

    const enabledProviders = providers.filter(p => p.enabled);

    if (!enabledProviders.length) {
        throw new Error("No AI Providers Available");
    }

    const systemPrompt =
`${config.system}

OWNER NAME:
${config.ownerName}

BOT NAME:
${config.botName}

PERSONALITY:
${config.personality}

RULES:
- Reply naturally like a real human
- Never say you are an AI
- Never mention APIs
- Avoid robotic answers
- Keep responses clean and direct
- Reply in user's language
- Be casual and realistic
- Avoid repeating yourself
- You are chatting as the owner

USER INFO:
Name: ${pushName}
Number: ${user}`;

    let lastError = null;

    for (const provider of enabledProviders) {

        try {

            console.log(`⚡ AI Trying: ${provider.name}`);

            const response = await provider.ask(
                prompt,
                systemPrompt
            );

            if (
                response &&
                typeof response === "string" &&
                response.trim().length > 2
            ) {

                console.log(`✅ AI Success: ${provider.name}`);

                return {
                    success: true,
                    provider: provider.name,
                    text: clean(response)
                };
            }

        } catch (err) {

            lastError = err;

            console.log(
                `❌ Provider Failed: ${provider.name} ->`,
                err.message
            );

            continue;
        }
    }

    console.log("❌ ALL AI PROVIDERS FAILED");

    return {
        success: false,
        error: lastError?.message || "Unknown AI Error",
        text: config.fallbackReply
    };
}

module.exports = askAI;
