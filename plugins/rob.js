const translate = require("google-translate-api-x");

module.exports = {
    command: "rob",
    alias: ["steal", "crime"],
    category: "crime",
    description: "Rob coins from users with risk system",

    async execute(m, sock, ctx) {
        const { args, supabase, userSettings } = ctx;

        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const userId = m.sender;
        const groupId = m.chat;

        const target = m.mentionedJid?.[0];

        const modes = {
            harsh: {
                win: "☣️ 𝕽𝖔𝖇 𝕾𝖚𝖈𝖈𝖊𝖘𝖘 ☣️",
                lose: "☣️ 𝕱𝖆𝖎𝖑𝖊𝖉 𝕽𝖔𝖇 ☣️",
                react: "💣"
            },
            normal: {
                win: "💣 Rob Successful!",
                lose: "❌ Rob Failed!",
                react: "🕵️"
            },
            girl: {
                win: "💖 You successfully stole~",
                lose: "🥺 Aww you got caught~",
                react: "🎀"
            }
        };

        const ui = modes[style] || modes.normal;

        try {
            if (!target) {
                return m.reply("❌ Tag user to rob");
            }

            if (target === userId) {
                return m.reply("❌ You cannot rob yourself");
            }

            await sock.sendMessage(m.chat, {
                react: { text: ui.react, key: m.key }
            });

            // ================= FETCH USERS =================
            const { data: robber } = await supabase
                .from("g_users")
                .select("*")
                .eq("user_id", userId)
                .eq("group_id", groupId)
                .single();

            const { data: victim } = await supabase
                .from("g_users")
                .select("*")
                .eq("user_id", target)
                .eq("group_id", groupId)
                .single();

            if (!victim) {
                return m.reply("❌ Target not found in economy system");
            }

            // ================= CHANCE SYSTEM =================
            const successRate = 0.45 + (robber?.luck || 50) / 200; // luck influences chance
            const success = Math.random() < successRate;

            const stealAmount = Math.floor(Math.random() * 300) + 100;

            let resultMsg = "";
            let change = 0;

            // ================= SUCCESS =================
            if (success) {

                const stolen = Math.min(victim.coins, stealAmount);

                await supabase
                    .from("g_users")
                    .update({ coins: victim.coins - stolen })
                    .eq("user_id", target)
                    .eq("group_id", groupId);

                await supabase
                    .from("g_users")
                    .update({ coins: robber.coins + stolen })
                    .eq("user_id", userId)
                    .eq("group_id", groupId);

                await supabase.from("g_transactions").insert({
                    user_id: userId,
                    group_id: groupId,
                    type: "rob_success",
                    amount: stolen,
                    status: "success"
                });

                resultMsg = `${ui.win}\n\n💰 Stolen: ${stolen}`;

            } 
            // ================= FAIL =================
            else {

                const penalty = Math.floor(Math.random() * 100) + 50;

                const newCash = Math.max(0, robber.coins - penalty);

                await supabase
                    .from("g_users")
                    .update({ coins: newCash })
                    .eq("user_id", userId)
                    .eq("group_id", groupId);

                await supabase.from("g_transactions").insert({
                    user_id: userId,
                    group_id: groupId,
                    type: "rob_fail",
                    amount: penalty,
                    status: "failed"
                });

                resultMsg = `${ui.lose}\n\n💸 Penalty: -${penalty}`;
            }

            const finalMsg = `
*💣 ROB SYSTEM*

👤 You: @${userId.split("@")[0]}
🎯 Target: @${target.split("@")[0]}

${resultMsg}
            `;

            const { text } = await translate(finalMsg, { to: lang });

            await sock.sendMessage(m.chat, {
                text,
                mentions: [userId, target]
            });

        } catch (e) {
            console.error("ROB ERROR:", e);
            await m.reply("⚠️ Rob system crashed");
        }
    }
};
