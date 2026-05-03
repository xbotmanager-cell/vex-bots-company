/**
 * VEX PLUGIN: CLEAR CHAT (ULTIMATE SAFE ENGINE)
 * Version: 3.0 (Anti-Ban + Stability Boost)
 */

module.exports = {
    command: "clear",
    alias: ["cls", "clearalldm", "futa"],
    category: "tools",
    description: "Safely clears chat UI with multi-layer sync",

    async execute(m, sock, { userSettings }) {

        const chatJid = m.chat || m.key.remoteJid;

        // ================= STYLE =================
        const style = userSettings?.style || 'harsh';

        const modes = {
            harsh: { react: "🗑️" },
            normal: { react: "🧹" },
            girl: { react: "✨" }
        };

        const currentMode = modes[style] || modes.normal;

        // ================= ANTI-SPAM =================
        global.clearCooldown = global.clearCooldown || {};

        if (global.clearCooldown[chatJid]) {
            return; // silent ignore to avoid spam
        }

        global.clearCooldown[chatJid] = true;

        setTimeout(() => {
            delete global.clearCooldown[chatJid];
        }, 10000); // 10 sec cooldown

        try {
            // ================= REACTION =================
            await sock.sendMessage(chatJid, {
                react: {
                    text: currentMode.react,
                    key: m.key
                }
            });

            // ================= SAFE DELAY =================
            await new Promise(r => setTimeout(r, 400));

            // ================= METHOD 1: CLEAR TRY =================
            try {
                await sock.chatModify({
                    clear: {
                        messages: [{
                            id: m.key.id,
                            fromMe: m.key.fromMe,
                            timestamp: m.messageTimestamp
                        }]
                    }
                }, chatJid);
            } catch {}

            // ================= METHOD 2: ARCHIVE FORCE =================
            try {
                await sock.chatModify({
                    archive: true,
                    lastMessages: [{
                        key: m.key,
                        messageTimestamp: m.messageTimestamp
                    }]
                }, chatJid);
            } catch {}

            // ================= METHOD 3: HARD REFRESH =================
            await new Promise(r => setTimeout(r, 600));

            try {
                await sock.chatModify({ archive: false }, chatJid);
            } catch {}

            // ================= METHOD 4: OPTIONAL DELETE YOUR MESSAGE =================
            try {
                await sock.sendMessage(chatJid, {
                    delete: m.key
                });
            } catch {}

            // ================= FINAL SYNC DELAY =================
            await new Promise(r => setTimeout(r, 300));

        } catch (error) {
            console.error("🔥 [VEX CLEAR ERROR SAFE]:", error);
        }
    }
};
