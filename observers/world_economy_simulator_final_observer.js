const translate = require("google-translate-api-x");

let started = false;

module.exports = {
    name: "world_economy_simulator_final_observer",

    async onMessage(m, sock, ctx) {
        const { supabase } = ctx;

        try {
            // 🔒 RUN ONLY ONCE (GLOBAL LOOP START)
            if (started) return;
            started = true;

            console.log("[WORLD ENGINE] Started...");

            // 🔁 INTERNAL LOOP (NO INDEX.JS NEEDED)
            setInterval(async () => {
                try {

                    // ================= GET GROUPS =================
                    const { data: groups } = await supabase
                        .from("g_groups")
                        .select("*");

                    if (!groups) return;

                    for (const g of groups) {

                        // ================= WORLD STATE =================
                        const states = ["boom", "recession", "stable", "crisis"];
                        const state = states[Math.floor(Math.random() * states.length)];

                        let inflation = 1.0;
                        let taxBoost = 1;
                        let eventText = "";

                        if (state === "boom") {
                            inflation = 1.2;
                            eventText = "📈 Economic Boom!";
                        }

                        if (state === "recession") {
                            inflation = 0.8;
                            eventText = "📉 Market Recession!";
                        }

                        if (state === "crisis") {
                            inflation = 0.5;
                            taxBoost = 2;
                            eventText = "💥 Global Crisis!";
                        }

                        if (state === "stable") {
                            inflation = 1.0;
                            eventText = "⚖️ Stable Economy";
                        }

                        // ================= UPDATE GROUP =================
                        await supabase
                            .from("g_groups")
                            .update({
                                inflation_rate: inflation,
                                emergency_mode: state === "crisis"
                            })
                            .eq("group_id", g.group_id);

                        // ================= MARKET SHIFT =================
                        const { data: market } = await supabase
                            .from("g_market")
                            .select("*")
                            .eq("group_id", g.group_id);

                        for (const item of market || []) {
                            let change = Math.floor(Math.random() * 20 - 10);

                            if (state === "boom") change += 15;
                            if (state === "recession") change -= 15;

                            let newPrice = item.price + change;
                            if (newPrice < 10) newPrice = 10;

                            await supabase
                                .from("g_market")
                                .update({
                                    previous_price: item.price,
                                    price: newPrice,
                                    last_updated: new Date()
                                })
                                .eq("id", item.id);
                        }

                        // ================= CITIZENS =================
                        const { data: citizens } = await supabase
                            .from("g_citizens")
                            .select("*")
                            .eq("group_id", g.group_id);

                        let totalTax = 0;

                        for (const c of citizens || []) {
                            let income = Math.floor(Math.random() * 50);

                            if (state === "boom") income += 50;
                            if (state === "recession") income -= 30;
                            if (state === "crisis") income -= 50;

                            const tax = Math.floor(Math.abs(income) * 0.1 * taxBoost);
                            totalTax += tax;

                            await supabase
                                .from("g_citizens")
                                .update({
                                    balance: c.balance + income - tax,
                                    tax_paid: c.tax_paid + tax,
                                    last_action: new Date()
                                })
                                .eq("id", c.id);
                        }

                        // ================= GOVERNMENT =================
                        await supabase
                            .from("g_government")
                            .update({
                                collected_tax: totalTax,
                                inflation: inflation,
                                emergency: state === "crisis",
                                updated_at: new Date()
                            })
                            .eq("group_id", g.group_id);

                        // ================= EVENTS =================
                        await supabase.from("g_events").insert({
                            group_id: g.group_id,
                            event_type: state,
                            description: eventText,
                            reward: 0
                        });

                        // ================= OPTIONAL BROADCAST =================
                        if (Math.random() < 0.3) {
                            await sock.sendMessage(g.group_id, {
                                text: `🌍 *WORLD UPDATE*\n\n${eventText}`
                            });
                        }
                    }

                } catch (e) {
                    console.error("WORLD LOOP ERROR:", e);
                }

            }, 120000); // 🔥 2 min (safe for render free)

        } catch (e) {
            console.error("WORLD OBSERVER ERROR:", e);
        }
    }
};
