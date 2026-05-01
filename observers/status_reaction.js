const { delay } = require("@whiskeysockets/baileys");

module.exports = {
    name: "status_reaction",

    trigger: (m) => {
        return m.key.remoteJid === "status@broadcast" && !m.key.fromMe;
    },

    async onMessage(m, sock, ctx) {
        const { supabase, cache } = ctx;

        try {
            // ================= CONFIG =================
            const { data: config } = await supabase
                .from("luper_config")
                .select("*")
                .eq("config_key", "status_autolike_feature")
                .single();

            if (!config || !config.is_active) return;

            // ================= EMOJI SYSTEM =================
            let emojiList = ["💜","🔥","✨","😍","⚡"];

            if (config.extra_data?.emojis) {
                emojiList = config.extra_data.emojis.split(",");
            }

            const selectedEmoji =
                emojiList[Math.floor(Math.random() * emojiList.length)].trim();

            // ================= SMART DELAY =================
            const wait = Math.floor(Math.random() * 10000) + 3000;
            await delay(wait);

            const participant = m.key.participant;

            // ================= BRUTE FORCE ENGINE =================
            let success = false;

            const attempts = [
                async () => {
                    await sock.sendMessage(
                        "status@broadcast",
                        {
                            react: {
                                text: selectedEmoji,
                                key: m.key
                            }
                        },
                        { statusJidList: [participant] }
                    );
                },

                async () => {
                    await sock.sendMessage(
                        "status@broadcast",
                        {
                            react: {
                                text: selectedEmoji,
                                key: m.key
                            }
                        }
                    );
                },

                async () => {
                    await sock.relayMessage(
                        "status@broadcast",
                        {
                            reactionMessage: {
                                key: m.key,
                                text: selectedEmoji
                            }
                        },
                        {}
                    );
                }
            ];

            // ================= RETRY SYSTEM =================
            for (let i = 0; i < attempts.length; i++) {
                try {
                    await attempts[i]();
                    success = true;
                    break;
                } catch {}
            }

            // ================= HARD RETRY (REAL BRUTE FORCE) =================
            if (!success) {
                for (let retry = 0; retry < 2; retry++) {
                    try {
                        await delay(2000);
                        await attempts[0]();
                        success = true;
                        break;
                    } catch {}
                }
            }

            // ================= LOGGING =================
            if (success) {
                await supabase.from("luper_system_logs").insert({
                    module_name: "STATUS_REACTION",
                    target_identifier: participant.split("@")[0],
                    activity_desc: `Reacted with ${selectedEmoji}`,
                    execution_status: "success"
                });
            }

        } catch {}
    }
};
