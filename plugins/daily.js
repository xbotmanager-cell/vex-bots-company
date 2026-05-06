const translate = require("google-translate-api-x");

module.exports = {
    command: "daily",
    category: "economy",
    description: "Daily reward system with 24h cooldown",

    async execute(m, sock, ctx) {
        const { supabase, userSettings } = ctx;
        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const userId = m.sender;
        const groupId = m.chat;

        const reward = Math.floor(Math.random() * 500) + 300;
        const now = Date.now();

        const modes = {
            harsh: {
                ok: "☣️ 𝕯𝕬𝕴𝕷𝖄 𝕾𝕻𝕬𝕽𝕶 𝕬𝕮𝕮𝕰𝕻𝕿𝕰𝕯 ☣️",
                cd: "𝕿𝖔𝖔 𝖘𝖑𝖔𝖜. 𝕮𝖔𝖒𝖊 𝖇𝖆𝖈𝖐 𝖑𝖆𝖙𝖊𝖗.",
                react: "💰"
            },
            normal: {
                ok: "💰 Daily Reward Claimed!",
                cd: "⏳ Already claimed daily reward.",
                react: "🎁"
            },
            girl: {
                ok: "💖 Yay! Your daily reward is ready~",
                cd: "⏳ Baby you already claimed it~",
                react: "🎀"
            }
        };

        const ui = modes[style] || modes.normal;

        try {
            // FETCH USER
            const { data: user } = await supabase
                .from("g_users")
                .select("*")
                .eq("user_id", userId)
                .eq("group_id", groupId)
                .single();

            if (!user) {
                await supabase.from("g_users").insert({
                    user_id: userId,
                    group_id: groupId,
                    coins: 0,
                    last_daily: null,
                    luck: 50
                });
            }

            const last = user?.last_daily ? new Date(user.last_daily).getTime() : 0;
            const diff = now - last;
            const cooldown = 24 * 60 * 60 * 1000;

            if (diff < cooldown) {
                const remaining = cooldown - diff;

                const h = Math.floor(remaining / (1000 * 60 * 60));
                const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((remaining % (1000 * 60)) / 1000);

                return m.reply(`⛔ ${ui.cd}\n⏳ ${h}h ${m}m ${s}s remaining`);
            }

            const newCoins = (user?.coins || 0) + reward;
            const streak = (user?.streak || 0) + 1;

            await supabase
                .from("g_users")
                .update({
                    coins: newCoins,
                    last_daily: new Date(now).toISOString(),
                    streak: streak
                })
                .eq("user_id", userId)
                .eq("group_id", groupId);

            await supabase.from("g_transactions").insert({
                user_id: userId,
                group_id: groupId,
                type: "daily",
                amount: reward,
                status: "success"
            });

            await sock.sendMessage(m.chat, {
                react: { text: ui.react, key: m.key }
            });

            const msg = `
*${ui.ok}*

💰 Reward: +${reward}
🔥 Streak: ${streak}
🪙 Total Coins Updated
            `;

            const { text } = await translate(msg, { to: lang });
            await m.reply(text);

        } catch (e) {
            console.error("DAILY ERROR:", e);
        }
    }
};
