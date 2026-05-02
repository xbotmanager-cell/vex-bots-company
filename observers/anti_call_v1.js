// ================= LUPER-MD SILENT SHIELD =================
const memoryCache = new Map();

module.exports = {
    name: "anti_call_silent_v1",

    async onCall(call, sock, ctx) {
        const { supabase } = ctx;
        const callId = call[0].id;
        const callerJid = call[0].from;

        try {
            // 1. CONFIG CACHE SYNC (Luper Config Path)
            let isAntiCallOn = memoryCache.get("anti_call_enabled");

            if (isAntiCallOn === undefined) {
                const { data } = await supabase
                    .from("luper_config")
                    .select("is_active")
                    .eq("config_key", "anti_call_enabled")
                    .single();

                isAntiCallOn = data?.is_active || false;
                memoryCache.set("anti_call_enabled", isAntiCallOn);

                // Auto-refresh cache kila baada ya sekunde 30 kuzuia DB overload
                setTimeout(() => memoryCache.delete("anti_call_enabled"), 30000);
            }

            // 2. CHECK STATUS
            if (!isAntiCallOn) return;

            // 3. THE SILENT KILL (Reject Logic)
            // Tunatumia 'reject' ili call ikatike kimya kimya bila kuleta usumbufu
            await sock.rejectCall(callId, callerJid);

            // 4. BACKGROUND LOGGING (Optional - Haina kelele kwenye WhatsApp)
            // Hapa tuna-log tu kwenye console ya bot kwa ajili ya usalama wako
            console.log(`[LUPER-SHIELD] Call Rejected from: ${callerJid.split('@')[0]}`);

        } catch (err) {
            // Silent error handling to prevent bot crash
            console.error("ANTI-CALL ERROR:", err);
        }
    }
};
