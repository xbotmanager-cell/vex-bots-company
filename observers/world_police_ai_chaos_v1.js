const translate = require("google-translate-api-x");

// ================= WORLD CHAOS ENGINE =================
const cache = new Map();

module.exports = {
    name: "world_police_ai_chaos_v1",

    interval: 30000, // kila 30s REAL TIME SIMULATION

    async execute(sock, ctx) {
        const { supabase } = ctx;

        try {

            // ================= LOAD GROUPS =================
            const { data: groups } = await supabase
                .from("g_groups")
                .select("*");

            if (!groups) return;

            // ================= CITY ZONES =================
            const zones = ["SAFE_ZONE", "TRADE_ZONE", "CRIME_ZONE", "WAR_ZONE"];

            // ================= WORLD EVENTS =================
            const chaosEvents = [
                "🔥 Bank robbery in progress",
                "🚔 Police chase active",
                "💣 Explosion reported",
                "🧨 Gang war started",
                "🚨 High wanted criminals spotted",
                "💰 Black market surge",
                "⚔️ Street battle detected"
            ];

            for (const g of groups) {

                // ================= SELECT ZONE =================
                let zone = zones[Math.floor(Math.random() * zones.length)];

                // probability shift based on crime level
                if ((g.crime_level || 0) > 70) zone = "WAR_ZONE";
                if ((g.crime_level || 0) < 20) zone = "SAFE_ZONE";

                // ================= POLICE AI =================
                const policePower = Math.floor(Math.random() * 100 + (g.power_level || 1) * 10);

                const crimeHeat = (g.crime_level || 0) + Math.floor(Math.random() * 20 - 10);

                const chaos = chaosEvents[Math.floor(Math.random() * chaosEvents.length)];

                // ================= UPDATE GROUP STATE =================
                await supabase
                    .from("g_groups")
                    .update({
                        crime_level: Math.max(0, crimeHeat),
                        emergency_mode: zone === "WAR_ZONE"
                    })
                    .eq("group_id", g.group_id);

                // ================= WORLD EVENT LOG =================
                await supabase.from("g_events").insert({
                    group_id: g.group_id,
                    event_type: zone,
                    description: chaos,
                    reward: zone === "SAFE_ZONE" ? 100 : 0
                });

                // ================= POLICE ACTIONS =================

                // arrest random high wanted users
                const { data: suspects } = await supabase
                    .from("g_users")
                    .select("*")
                    .eq("group_id", g.group_id)
                    .gte("wanted", 50);

                for (const s of suspects || []) {

                    const chance = Math.random() * 100;

                    if (chance < 30 && policePower > 60) {

                        await supabase
                            .from("g_users")
                            .update({
                                jailed: true,
                                jail_time: Date.now() + 120000 // 2 min
                            })
                            .eq("user_id", s.user_id)
                            .eq("group_id", g.group_id);

                        await supabase.from("g_transactions").insert({
                            user_id: s.user_id,
                            group_id: g.group_id,
                            type: "auto_arrest",
                            amount: 0,
                            status: "police_ai"
                        });
                    }
                }

                // ================= ECONOMY CHAOS IMPACT =================
                const economyShock = zone === "WAR_ZONE" ? 0.5 :
                                     zone === "CRIME_ZONE" ? 0.8 :
                                     zone === "TRADE_ZONE" ? 1.2 : 1;

                await supabase
                    .from("g_groups")
                    .update({
                        inflation_rate: economyShock
                    })
                    .eq("group_id", g.group_id);

                // ================= OPTIONAL BROADCAST =================
                if (Math.random() < 0.2) {
                    await sock.sendMessage(g.group_id, {
                        text: `🌍 *WORLD UPDATE*\n\n📍 Zone: ${zone}\n⚠️ ${chaos}`
                    });
                }
            }

        } catch (e) {
            console.error("WORLD CHAOS ERROR:", e);
        }
    }
};
