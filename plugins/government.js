const translate = require("google-translate-api-x");

module.exports = {
    command: "government",
    alias: ["gov", "state"],
    category: "system",
    description: "Virtual government economy system",

    async execute(m, sock, ctx) {
        const { args, supabase, userSettings } = ctx;

        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const action = args[0]?.toLowerCase();
        const userId = m.sender;
        const groupId = m.chat;

        const modes = {
            harsh: {
                head: "☣️ 𝕲𝖔𝖛𝖊𝖗𝖓𝖒𝖊𝖓𝖙 𝕮𝖔𝖗𝖊 ☣️",
                tax: "☣️ 𝕿𝖆𝖝 𝕴𝖒𝖕𝖔𝖘𝖊𝖉 ☣️",
                law: "☣️ 𝕷𝖆𝖜 𝕰𝖓𝖋𝖔𝖗𝖈𝖊𝖉 ☣️",
                react: "🏛"
            },
            normal: {
                head: "🏛 Government System",
                tax: "💰 Tax applied",
                law: "⚖️ Law updated",
                react: "📜"
            },
            girl: {
                head: "💖 Cute Government 💖",
                tax: "💖 small tax applied~",
                law: "💖 law changed~",
                react: "🎀"
            }
        };

        const ui = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, {
                react: { text: ui.react, key: m.key }
            });

            // ================= VIEW STATUS =================
            if (!action || action === "status") {
                const { data: stats } = await supabase
                    .from("g_government")
                    .select("*")
                    .eq("group_id", groupId)
                    .single();

                let msg = `
*${ui.head}*

🏛 GOVERNMENT STATUS

💰 Tax Rate: ${stats?.tax_rate || 5}%
📊 Inflation: ${stats?.inflation || 1.0}x
⚖️ Laws Active: ${stats?.laws || 0}
🚨 Emergency: ${stats?.emergency ? "ON" : "OFF"}
                `;

                const { text } = await translate(msg, { to: lang });

                return m.reply(text);
            }

            // ================= SET TAX =================
            if (action === "tax") {
                const rate = parseInt(args[1]);

                if (isNaN(rate) || rate < 0 || rate > 50) {
                    return m.reply("❌ Invalid tax rate (0-50)");
                }

                await supabase
                    .from("g_government")
                    .upsert({
                        group_id: groupId,
                        tax_rate: rate
                    });

                const msg = `${ui.tax}\n💰 New tax rate: ${rate}%`;

                const { text } = await translate(msg, { to: lang });

                return m.reply(text);
            }

            // ================= SET LAW =================
            if (action === "law") {
                const lawText = args.slice(1).join(" ");

                if (!lawText) return m.reply("❌ Provide law text");

                const { data: gov } = await supabase
                    .from("g_government")
                    .select("*")
                    .eq("group_id", groupId)
                    .single();

                const newLaws = (gov?.laws || 0) + 1;

                await supabase
                    .from("g_government")
                    .upsert({
                        group_id: groupId,
                        laws: newLaws
                    });

                const msg = `
${ui.law}

⚖️ New Law Added:
"${lawText}"

📜 Total Laws: ${newLaws}
                `;

                const { text } = await translate(msg, { to: lang });

                return m.reply(text);
            }

            // ================= EMERGENCY =================
            if (action === "emergency") {
                await supabase
                    .from("g_government")
                    .upsert({
                        group_id: groupId,
                        emergency: true
                    });

                const msg = `
🚨 EMERGENCY DECLARED!

💥 Market freeze active
💰 Tax doubled temporarily
⚠️ Economy instability detected
                `;

                const { text } = await translate(msg, { to: lang });

                return m.reply(text);
            }

        } catch (e) {
            console.error("GOV ERROR:", e);
            await m.reply("⚠️ Government system failed");
        }
    }
};
