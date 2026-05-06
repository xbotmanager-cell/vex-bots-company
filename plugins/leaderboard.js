const translate = require("google-translate-api-x");

module.exports = {
    command: "leaderboard",
    alias: ["lb", "top", "rank"],
    category: "rank",
    description: "Global economy leaderboard system",

    async execute(m, sock, ctx) {
        const { supabase, userSettings } = ctx;

        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";
        const groupId = m.chat;

        const modes = {
            harsh: {
                head: "☣️ 𝕷𝖊𝖆𝖉𝖊𝖗𝖇𝖔𝖆𝖗𝖉 𝕮𝖔𝖗𝖊 ☣️",
                react: "🏆"
            },
            normal: {
                head: "🏆 Leaderboard",
                react: "📊"
            },
            girl: {
                head: "💖 Cute Rankings 💖",
                react: "🎀"
            }
        };

        const ui = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, {
                react: { text: ui.react, key: m.key }
            });

            // ================= USERS RANK =================
            const { data: users } = await supabase
                .from("g_users")
                .select("user_id, coins, bank")
                .order("coins", { ascending: false })
                .limit(5);

            // ================= GROUP RANK =================
            const { data: groups } = await supabase
                .from("g_groups")
                .select("group_id, coins, bank_balance")
                .order("coins", { ascending: false })
                .limit(5);

            // ================= BUILD MESSAGE =================
            let msg = `
*${ui.head}*

🏆 TOP USERS
`;

            users?.forEach((u, i) => {
                msg += `\n${i + 1}. @${u.user_id.split("@")[0]} 💰 ${u.coins + u.bank}`;
            });

            msg += `

🏛 TOP GROUPS
`;

            groups?.forEach((g, i) => {
                msg += `\n${i + 1}. Group ${i + 1} 💰 ${g.coins + g.bank_balance}`;
            });

            msg += `

⚡ Compete, earn, dominate the economy world.
            `;

            const { text } = await translate(msg, { to: lang });

            // mentions users
            const mentions = users?.map(u => u.user_id) || [];

            await sock.sendMessage(m.chat, {
                text,
                mentions
            });

        } catch (e) {
            console.error("LEADERBOARD ERROR:", e);
            await m.reply("⚠️ Leaderboard failed");
        }
    }
};
