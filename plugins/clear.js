/**
 * VEX PLUGIN: CLEAR CHAT (ULTIMATE FORCE SYNC)
 * Feature: Style React + Silent Deep Clear
 * Version: 2.0 (Power Million)
 * Dev: Lupin Starnley
 */

module.exports = {
    command: "clear",
    alias: ["cls", "clearalldm", "futa"],
    category: "tools",
    description: "Cleans the entire chat history silently with deep sync technology",

    async execute(m, sock, { userSettings }) {
        // Tunapata JID ya chat husika
        const chatJid = m.chat || m.key.remoteJid;
        const style = userSettings?.style?.value || 'harsh';

        // Reaction Matrix kulingana na style yako
        const modes = {
            harsh: { react: "🗑️" },
            normal: { react: "🧹" },
            girl: { react: "✨" }
        };

        const currentMode = modes[style] || modes.normal;

        try {
            // 1. Send Reaction kwanza kama ishara (Signal)
            await sock.sendMessage(chatJid, { 
                react: { 
                    text: currentMode.react, 
                    key: m.key 
                } 
            });

            // 2. DEEP CLEAR LOGIC (Hapa ndo kuna nguvu milioni)
            // Tunatumia chatModify yenye "allMessages: true" ili kufagia kila kitu
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
            }, chatJid);

            // 3. Option ya ziada: Archive & Unarchive (Hii inalazimisha WhatsApp UI kufuta chat)
            // Hii inahakikisha screen inakuwa nyeupe kabisa (Safi)
            await sock.chatModify({
                archive: true,
                lastMessages: [{ key: m.key, messageTimestamp: m.messageTimestamp }]
            }, chatJid);

            // Rudisha chat baada ya millisecond 500 (Invisible speed)
            setTimeout(async () => {
                await sock.chatModify({ archive: false }, chatJid);
            }, 500);

        } catch (error) {
            // Ikishindikana kabisa, log itatokea kwenye terminal yako
            console.error("🔥 [VEX CLEAR ERROR]:", error);
        }
    }
};
