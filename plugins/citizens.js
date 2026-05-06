const translate = require("google-translate-api-x");

module.exports = {
    command: "citizens",
    alias: ["npc", "population"],
    category: "simulation",
    description: "AI citizens economy simulation system",

    async execute(m, sock, ctx) {
        const { supabase, userSettings } = ctx;

        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const groupId = m.chat;

        const modes = {
            harsh: {
                head: "☣️ 𝕬𝕴 𝕮𝖎𝖙𝖎𝖟𝖊𝖓 𝕮𝖔𝖗𝖊 ☣️",
                spawn: "☣️ 𝕹𝕻𝕮 𝕷𝖎𝖋𝖊 𝕬𝖈𝖙𝖎𝖛𝖆𝖙𝖊𝖉 ☣️",
                react: "🤖"
            },
            normal: {
                head: "🤖 AI Citizens System",
                spawn: "🌍 Population active",
                react: "👥"
            },
            girl: {
                head: "💖 Cute Citizens 💖",
                spawn: "💖 NPCs are living~",
                react: "🎀"
            }
        };

        const ui = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, {
                react: { text: ui.react, key: m.key }
            });

            // ================= FETCH POPULATION =================
            let { data: citizens } = await supabase
                .from("g_citizens")
                .select("*")
                .eq("group_id", groupId);

            if (!citizens || citizens.length === 0) {
                // spawn initial population
                const seed = [];

                for (let i = 0; i < 10; i++) {
                    seed.push({
                        group_id: groupId,
                        type: ["worker", "trader", "gambler"][Math.floor(Math.random() * 3)],
                        balance: Math.floor(Math.random() * 500),
                        tax_paid: 0
                    });
                }

                await supabase.from("g_citizens").insert(seed);

                citizens = seed;
            }

            // ================= SIMULATION ENGINE =================
            let totalIncome = 0;
            let totalTax = 0;

            for (let c of citizens) {
                let income = 0;

                // WORKERS
                if (c.type === "worker") {
                    income = Math.floor(Math.random() * 50) + 20;
                }

                // TRADERS (market impact)
                if (c.type === "trader") {
                    income = Math.floor(Math.random() * 100);
                }

                // GAMBLERS (risk system)
                if (c.type === "gambler") {
                    income = Math.random() > 0.5
                        ? Math.floor(Math.random() * 150)
                        : -Math.floor(Math.random() * 80);
                }

                const tax = Math.floor(income * 0.1);

                totalIncome += income;
                totalTax += tax;

                await supabase
                    .from("g_citizens")
                    .update({
                        balance: c.balance + income - tax,
                        tax_paid: c.tax_paid + tax
                    })
                    .eq("id", c.id);
            }

            // ================= GOVERNMENT UPDATE =================
            await supabase
                .from("g_government")
                .upsert({
                    group_id: groupId,
                    collected_tax: totalTax
                });

            // ================= REPORT =================
            let msg = `
*${ui.head}*

🌍 AI POPULATION REPORT

👥 Citizens: ${citizens.length}
💰 Total Income: ${totalIncome}
🏛 Tax Collected: ${totalTax}

📊 Economy is now living & self-running.
            `;

            const { text } = await translate(msg, { to: lang });

            await m.reply(text);

        } catch (e) {
            console.error("CITIZENS ERROR:", e);
            await m.reply("⚠️ Citizens system failed");
        }
    }
};
