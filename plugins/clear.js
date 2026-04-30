/**
 * VEX PLUGIN: CLEAR CHAT (SILENT SYNC)
 * Feature: React + Silent Clear (No outcome text)
 * Dev: Lupin Starnley
 */

module.exports = {
    command: "clear",
    alias: ["cls", "clearalldm"],
    category: "tools",
    description: "Cleans the entire chat history silently for the current session",

    async execute(m, sock, { userSettings }) {
        const style = userSettings?.style?.value || 'harsh';

        // Reaction Matrix
        const modes = {
            harsh: { react: "🗑️" },
            normal: { react: "🧹" },
            girl: { react: "✨" }
        };

        const currentMode = modes[style] || modes.normal;

        try {
            // 1. Send Style-Based Reaction First
            await sock.sendMessage(m.chat, { 
                react: { 
                    text: currentMode.react, 
                    key: m.key 
                } 
            });

            // 2. Logic to Clear Chat Silently
            // This removes all messages from the bot's view for this JID
            await sock.chatModify({
                clear: {
                    messages: [
                        {
                            id: m.key.id,
                            fromMe: m.key.fromMe,
                            timestamp: m.messageTimestamp
                        }
                    ]
                }
            }, m.chat);

        } catch (error) {
            console.error("Clear Chat Error:", error);
            // Silent failure to maintain chat cleanliness
        }
    }
};
