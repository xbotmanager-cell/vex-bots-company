const memoryCache = new Map();

module.exports = {
    name: "auto_recording_engine_v1",

    async onMessage(m, sock, ctx) {
        const { supabase } = ctx;
        const remoteJid = m.key.remoteJid;

        if (m.key.fromMe) return;

        try {
            // 1. SYNC CONFIG FROM DATABASE
            let config = memoryCache.get("auto_rec_config");

            if (!config) {
                const { data: recActive } = await supabase
                    .from("luper_config")
                    .select("is_active")
                    .eq("config_key", "auto_recording_enabled")
                    .single();

                const { data: recDuration } = await supabase
                    .from("luper_config")
                    .select("value")
                    .eq("config_key", "auto_recording_duration")
                    .single();

                // Hapa tunaangalia pia kama Auto-Typing ipo ON ili tuitulize
                const { data: typingActive } = await supabase
                    .from("luper_config")
                    .select("is_active")
                    .eq("config_key", "auto_typing_enabled")
                    .single();

                config = {
                    enabled: recActive?.is_active || false,
                    duration: parseInt(recDuration?.value) || 5,
                    typingWasOn: typingActive?.is_active || false
                };

                memoryCache.set("auto_rec_config", config);
                setTimeout(() => memoryCache.delete("auto_rec_config"), 30000);
            }

            if (!config.enabled) return;

            // 2. CONFLICT MANAGER (Anti-Ban)
            // Kama zote mbili zipo ON, tunaiambia bot itumie Recording kwanza na ipause Typing
            const isGroup = remoteJid.endsWith("@g.us");
            const recMs = isGroup ? 150 : config.duration * 1000;

            // 3. EXECUTE RECORDING PRESENCE
            // Tunatuma signal ya "Recording audio..."
            await sock.sendPresenceUpdate("recording", remoteJid);

            // Simulation Delay
            await new Promise(resolve => setTimeout(resolve, recMs));

            // Maliza Recording signal
            await sock.sendPresenceUpdate("paused", remoteJid);

        } catch (err) {
            console.error("AUTO-RECORDING OBSERVER ERROR:", err);
        }
    }
};
