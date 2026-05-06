const translate = require("google-translate-api-x");

module.exports = {
    command: "bank",
    alias: ["deposit", "withdraw", "wallet"],
    category: "bank",
    description: "Bank system: deposit and withdraw coins",

    async execute(m, sock, ctx) {
        const { args, supabase, userSettings, prefix } = ctx;

        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const userId = m.sender;
        const groupId = m.chat;

        const action = args[0]?.toLowerCase();
        const amount = parseInt(args[1]);

        const modes = {
            harsh: {
                ok: "☣️ 𝕭𝖆𝖓𝖐 𝕾𝖞𝖘𝖙𝖊𝖒 𝕰𝖝𝖊𝖈𝖚𝖙𝖊𝖉 ☣️",
                err: "☣️ 𝕴𝖓𝖛𝖆𝖑𝖎𝖉 𝕮𝖔𝖒𝖒𝖆𝖓𝖉",
                react: "🏦"
            },
            normal: {
                ok: "🏦 Bank Updated Successfully",
                err: "❌ Invalid input",
                react: "💳"
            },
            girl: {
                ok: "💖 Bank updated baby~",
                err: "🥺 Please check your input",
                react: "🎀"
            }
        };

        const ui = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, {
                react: { text: ui.react, key: m.key }
            });

            if (!action || !amount || isNaN(amount) || amount <= 0) {
                return m.reply(`
❌ Usage:
${prefix}bank deposit <amount>
${prefix}bank withdraw <amount>
                `);
            }

            // ================= FETCH USER =================
            let { data: user } = await supabase
                .from("g_users")
                .select("*")
                .eq("user_id", userId)
                .eq("group_id", groupId)
                .single();

            if (!user) {
                return m.reply("❌ Profile not found. Use profile first.");
            }

            let newCash = user.coins;
            let newBank = user.bank;

            // ================= DEPOSIT =================
            if (action === "deposit") {

                if (user.coins < amount) {
                    return m.reply("❌ Not enough coins.");
                }

                newCash -= amount;
                newBank += amount;

                await supabase.from("g_users")
                    .update({ coins: newCash, bank: newBank })
                    .eq("user_id", userId)
                    .eq("group_id", groupId);

                await supabase.from("g_transactions").insert({
                    user_id: userId,
                    group_id: groupId,
                    type: "deposit",
                    amount: amount,
                    status: "success"
                });

                return m.reply(`
🏦 *DEPOSIT SUCCESS*

💰 Deposited: ${amount}
💳 Wallet: ${newCash}
🏦 Bank: ${newBank}
                `);
            }

            // ================= WITHDRAW =================
            if (action === "withdraw") {

                if (user.bank < amount) {
                    return m.reply("❌ Not enough bank balance.");
                }

                newCash += amount;
                newBank -= amount;

                await supabase.from("g_users")
                    .update({ coins: newCash, bank: newBank })
                    .eq("user_id", userId)
                    .eq("group_id", groupId);

                await supabase.from("g_transactions").insert({
                    user_id: userId,
                    group_id: groupId,
                    type: "withdraw",
                    amount: amount,
                    status: "success"
                });

                return m.reply(`
🏦 *WITHDRAW SUCCESS*

💰 Withdrawn: ${amount}
💳 Wallet: ${newCash}
🏦 Bank: ${newBank}
                `);
            }

        } catch (e) {
            console.error("BANK ERROR:", e);
            await m.reply("⚠️ Bank system failed");
        }
    }
};
