const memoryCache = new Map();

module.exports = {
    name: "auto_typing_engine_v1",

    async onMessage(m, sock, ctx) {
        const { supabase } = ctx;
        const remoteJid = m.key.remoteJid;

        // 1. MSIKE KAZI KAMA NI BOT MWENYEWE
        if (m.key.fromMe) return;

        try {
            // 2. CONFIG CACHE SYNC
            let config = memoryCache.get("auto_typing_config");

            if (!config) {
                const { data: activeData } = await supabase
                    .from("luper_config")
                    .select("is_active")
                    .eq("config_key", "auto_typing_enabled")
                    .single();

                const { data: durationData } = await supabase
                    .from("luper_config")
                    .select("value")
                    .eq("config_key", "auto_typing_duration")
                    .single();

                config = {
                    enabled: activeData?.is_active || false,
                    duration: parseInt(durationData?.value) || 3
                };

                memoryCache.set("auto_typing_config", config);
                // Refresh kila baada ya 30s
                setTimeout(() => memoryCache.delete("auto_typing_config"), 30000);
            }

            if (!config.enabled) return;

            // 3. SMART DELAY LOGIC (Anti-Ban)
            const isGroup = remoteJid.endsWith("@g.us");
            // Kama ni Group, tumia 0.1s (100ms). Kama ni DM, tumia muda wa SQL.
            const typingMs = isGroup ? 100 : config.duration * 1000;

            // 4. EXECUTE PRESENCE
            // Hapa tunaambia WhatsApp "Luper anatype..."
            await sock.sendPresenceUpdate("composing", remoteJid);

            // Tunachelewesha bot isijibu mpaka muda upite (Artificial Delay)
            await new Promise(resolve => setTimeout(resolve, typingMs));

            // Zima typing signal kabla ya kutuma meseji (Optional lakini nzuri)
            await sock.sendPresenceUpdate("paused", remoteJid);

        } catch (err) {
            // Silent error handling
            console.error("AUTO-TYPING ERROR:", err);
        }
    }
};
