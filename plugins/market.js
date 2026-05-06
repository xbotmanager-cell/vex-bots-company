const translate = require("google-translate-api-x");

module.exports = {
    command: "market",
    alias: ["trade", "stock"],
    category: "economy",
    description: "AI powered trader market system",

    async execute(m, sock, ctx) {
        const { args, supabase, userSettings } = ctx;

        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const userId = m.sender;
        const groupId = m.chat;

        const action = args[0]?.toLowerCase(); // buy / sell / view
        const item = args[1]?.toUpperCase();
        const amount = parseInt(args[2]);

        const items = {
            GOLD: { price: 100 },
            CRYPTO: { price: 200 },
            OIL: { price: 80 },
            DIAMOND: { price: 500 },
            BITCOIN: { price: 1000 }
        };

        const modes = {
            harsh: {
                head: "☣️ 𝕬𝕴 𝕸𝖆𝖗𝖐𝖊𝖙 𝕮𝖔𝖗𝖊 ☣️",
                buy: "☣️ 𝕭𝖚𝖞 𝕾𝖚𝖈𝖈𝖊𝖘𝖘 ☣️",
                sell: "☣️ 𝕾𝖊𝖑𝖑 𝕮𝖔𝖒𝖕𝖑𝖊𝖙𝖊 ☣️",
                react: "📊"
            },
            normal: {
                head: "📊 AI Market",
                buy: "✅ Bought successfully",
                sell: "✅ Sold successfully",
                react: "💹"
            },
            girl: {
                head: "💖 Cute Market 💖",
                buy: "💖 you bought it~",
                sell: "💖 you sold it~",
                react: "🎀"
            }
        };

        const ui = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, {
                react: { text: ui.react, key: m.key }
            });

            // ================= VIEW MARKET =================
            if (!action || action === "view") {
                let msg = `*${ui.head}*\n\n📊 LIVE PRICES:\n\n`;

                for (let key in items) {
                    // AI FLUCTUATION ENGINE
                    let fluctuation = Math.floor(Math.random() * 20 - 10);
                    items[key].price += fluctuation;

                    if (items[key].price < 10) items[key].price = 10;

                    msg += `💰 ${key}: ${items[key].price}\n`;
                }

                return m.reply(msg);
            }

            // ================= BUY =================
            if (action === "buy") {
                if (!items[item]) return m.reply("❌ Invalid item");

                const cost = items[item].price * amount;

                const { data: user } = await supabase
                    .from("g_users")
                    .select("*")
                    .eq("user_id", userId)
                    .single();

                if (!user || user.coins < cost) {
                    return m.reply("❌ Not enough coins");
                }

                await supabase
                    .from("g_users")
                    .update({
                        coins: user.coins - cost
                    })
                    .eq("user_id", userId);

                await supabase.from("g_transactions").insert({
                    user_id: userId,
                    group_id: groupId,
                    type: "market_buy",
                    item,
                    amount,
                    cost
                });

                return m.reply(`📈 Bought ${amount} ${item} for ${cost}`);
            }

            // ================= SELL =================
            if (action === "sell") {
                if (!items[item]) return m.reply("❌ Invalid item");

                const gain = items[item].price * amount;

                const { data: user } = await supabase
                    .from("g_users")
                    .select("*")
                    .eq("user_id", userId)
                    .single();

                await supabase
                    .from("g_users")
                    .update({
                        coins: user.coins + gain
                    })
                    .eq("user_id", userId);

                await supabase.from("g_transactions").insert({
                    user_id: userId,
                    group_id: groupId,
                    type: "market_sell",
                    item,
                    amount,
                    gain
                });

                return m.reply(`📉 Sold ${amount} ${item} for ${gain}`);
            }

        } catch (e) {
            console.error("MARKET ERROR:", e);
            await m.reply("⚠️ Market system failed");
        }
    }
};
