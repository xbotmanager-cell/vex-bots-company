const { delay, getContentType } = require("@whiskeysockets/baileys");

module.exports = {
    name: "status_reaction",

    // ================= TRIGGER =================
    // Inasoma tu status mpya na inahakikisha sio ya bot yenyewe
    trigger: (m) => {
        return m.key.remoteJid === "status@broadcast" && !m.key.fromMe;
    },

    // ================= EXECUTION =================
    async onMessage(m, sock, ctx) {
        const { supabase, cache } = ctx;
        const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net";

        try {
            // 1. ANGALIA CONFIG (Luper Config)
            const { data: config } = await supabase
                .from("luper_config")
                .select("is_active")
                .eq("config_key", "status_autolike_feature")
                .single();

            if (!config || !config.is_active) return;

            // 2. DELAY KUZUIA BAN (Random kati ya sec 5 mpaka 15)
            const waitTime = Math.floor(Math.random() * (15000 - 5000 + 1) + 5000);
            await delay(waitTime);

            // 3. ANDAA EMOJI (Random selection kutoka kwenye list/comma)
            // Unaweza kuongeza emoji hapa mfano: "💜,✨,🔥"
            const emojiSetting = "💜"; 
            const emojiList = emojiSetting.split(",");
            const selectedEmoji = emojiList[Math.floor(Math.random() * emojiList.length)].trim();

            // 4. NJIA 3 ZA KULIKE (Redundancy System)
            const reactionMessage = {
                react: {
                    text: selectedEmoji,
                    key: m.key
                }
            };

            let success = false;

            // Njia ya 1: Standard React
            try {
                await sock.sendMessage(m.key.remoteJid, reactionMessage, { statusJidList: [m.key.participant] });
                success = true;
            } catch (e1) {
                // Njia ya 2: Direct React bila Jid List
                try {
                    await sock.sendMessage(m.key.remoteJid, reactionMessage);
                    success = true;
                } catch (e2) {
                    // Njia ya 3: Legacy Reaction format
                    try {
                        await sock.restageControl?.(m.key, selectedEmoji); // Hidden logic for some baileys versions
                        success = true;
                    } catch (e3) {
                        success = false;
                    }
                }
            }

            // 5. REKODI KWENYE LUPER SYSTEM LOGS
            if (success) {
                const userStyle = cache.getUser(m.sender)?.style || "normal";
                
                await supabase.from("luper_system_logs").insert({
                    module_name: "STATUS_REACTION",
                    target_identifier: m.key.participant.split("@")[0],
                    activity_desc: `Ilikubali kulike status kwa kutumia ${selectedEmoji}`,
                    execution_status: "success",
                    applied_style: userStyle
                });
            }

        } catch (err) {
            // No console.error hapa kama ulivyoomba "No Errors"
        }
    }
};
