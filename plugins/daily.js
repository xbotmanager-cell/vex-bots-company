const translate = require("google-translate-api-x");

module.exports = {
    command: "daily",
    alias: ["claim", "reward"],
    category: "economy",
    description: "Daily reward system with cooldown",

    async execute(m, sock, ctx) {
        const { supabase, userSettings } = ctx;

        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const userId = m.sender;
        const groupId = m.chat;

        const DAY = 24 * 60 * 60 * 1000;

        const modes = {
            harsh: {
                claim: "☣️ 𝕯𝖆𝖎𝖑𝖞 𝕻𝖆𝖞𝖔𝖚𝖙 ☣️",
                wait: "☣️ 𝖄𝖔𝖚 𝖆𝖑𝖗𝖊𝖆𝖉𝖞 𝖙𝖔𝖔𝖐 𝖎𝖙. 𝖂𝖆𝖎𝖙.",
                react: "☣️"
            },
            normal: {
                claim: "💰 Daily Reward Claimed!",
                wait: "⏳ You already claimed. Come back later.",
                react: "💰"
            },
            girl: {
                claim: "💖 daily reward for you~",
                wait: "🥺 you already took it today~",
                react: "🎀"
            }
        };

        const ui = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, {
                react: { text: ui.react, key: m.key }
            });

            // ================= FETCH USER =================
            const { data: user } = await supabase
                .from("g_users")
                .select("*")
                .eq("user_id", userId)
                .eq("group_id", groupId)
                .single();

            if (!user) {
                return m.reply("❌ Register first using !register");
            }

            // ================= FETCH DAILY =================
            let { data: daily } = await supabase
                .from("g_daily_claims")
                .select("*")
                .eq("user_id", userId)
                .eq("group_id", groupId)
                .single();

            if (!daily) {
                const { data: newDaily } = await supabase
                    .from("g_daily_claims")
                    .insert({
                        user_id: userId,
                        group_id: groupId,
                        last_claim: null,
                        streak: 0,
                        total_claims: 0
                    })
                    .select()
                    .single();

                daily = newDaily;
            }

            const now = Date.now();
            const lastClaim = daily.last_claim
                ? new Date(daily.last_claim).getTime()
                : 0;

            const diff = now - lastClaim;

            // ================= COOLDOWN CHECK =================
            if (diff < DAY) {
                const remaining = DAY - diff;

                const hours = Math.floor(remaining / (1000 * 60 * 60));
                const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

                let waitMsg = `
*⏳ DAILY COOLDOWN*

${ui.wait}

🕐 Time left:
${hours}h ${minutes}m ${seconds}s
                `;

                const { text } = await translate(waitMsg, { to: lang });

                return sock.sendMessage(m.chat, { text });
            }

            // ================= REWARD SYSTEM =================
            let newStreak = daily.streak + 1;

            // reset streak if missed day
            if (diff > DAY * 2) {
                newStreak = 1;
            }

            const baseReward = 500;
            const bonus = Math.min(newStreak * 50, 1000);
            const reward = baseReward + bonus;

            // ================= UPDATE USER =================
            await supabase
                .from("g_users")
                .update({
                    coins: user.coins + reward,
                    last_active: new Date()
                })
                .eq("user_id", userId)
                .eq("group_id", groupId);

            // ================= UPDATE DAILY =================
            await supabase
                .from("g_daily_claims")
                .update({
                    last_claim: new Date(),
                    streak: newStreak,
                    total_claims: daily.total_claims + 1
                })
                .eq("user_id", userId)
                .eq("group_id", groupId);

            // ================= TRANSACTION LOG =================
            await supabase.from("g_transactions").insert({
                user_id: userId,
                group_id: groupId,
                type: "daily",
                amount: reward,
                status: "success"
            });

            // ================= RESPONSE =================
            let msg = `
*${ui.claim}*

👤 @${userId.split("@")[0]}

🔥 Streak: ${newStreak}
💰 Reward: ${reward}

📊 Total Claims: ${daily.total_claims + 1}
            `;

            const { text } = await translate(msg, { to: lang });

            await sock.sendMessage(m.chat, {
                text,
                mentions: [userId]
            });

        } catch (e) {
            console.error("DAILY ERROR:", e);
            await m.reply("⚠️ Daily system failed");
        }
    }
};
