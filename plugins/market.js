const translate = require("google-translate-api-x");

// 🔥 QUEUE (ANTI BAN)
const queue = [];
let processing = false;

module.exports = {
    command: "market",
    alias: ["bm", "blackmarket"],
    category: "economy",
    description: "Black Market trading system",

    async execute(m, sock, ctx) {
        queue.push({ m, sock, ctx });
        processQueue();
    }
};

// ================= QUEUE ENGINE =================
async function processQueue() {
    if (processing) return;
    processing = true;

    while (queue.length > 0) {
        const job = queue.shift();
        try {
            await runMarket(job.m, job.sock, job.ctx);
            await sleep(1200);
        } catch (e) {
            console.error("MARKET ERROR:", e);
        }
    }

    processing = false;
}

// ================= MAIN =================
async function runMarket(m, sock, ctx) {
    const { supabase, userSettings, args } = ctx;

    const style = userSettings?.style || "harsh";
    const lang = userSettings?.lang || "en";

    const userId = m.sender;
    const groupId = m.chat;

    const action = (args[0] || "list").toLowerCase();

    const ui = {
        harsh: {
            react: "🖤"
        },
        normal: {
            react: "🛒"
        },
        girl: {
            react: "🎀"
        }
    }[style] || {};

    await sock.sendMessage(m.chat, {
        react: { text: ui.react, key: m.key }
    });

    // ================= GET USER =================
    const { data: user } = await supabase
        .from("g_users")
        .select("*")
        .eq("user_id", userId)
        .eq("group_id", groupId)
        .single();

    if (!user) return m.reply("❌ Register first");

    // ================= LIST MARKET (GLOBAL + GROUP) =================
    if (action === "list") {

        const { data: items } = await supabase
            .from("g_market")
            .select("*")
            .or(`group_id.eq.global,group_id.eq.${groupId}`);

        if (!items || items.length === 0) {
            return m.reply("🖤 Market is empty");
        }

        let list = "🖤 *BLACK MARKET*\n\n";

        for (const i of items) {
            list += `📦 ${i.item_name}\n`;
            list += `💰 Price: ${i.price}\n`;
            list += `📊 Stock: ${i.stock}\n\n`;
        }

        const { text } = await translate(list, { to: lang });

        return sock.sendMessage(m.chat, { text });
    }

    // ================= BUY =================
    if (action === "buy") {

        const itemName = args.slice(1).join(" ");
        if (!itemName) return m.reply("❌ Specify item name");

        const { data: item } = await supabase
            .from("g_market")
            .select("*")
            .or(`group_id.eq.global,group_id.eq.${groupId}`)
            .eq("item_name", itemName)
            .single();

        if (!item) return m.reply("❌ Item not found");

        // 💡 dynamic AI price (future economy hook)
        const finalPrice = Math.floor(
            item.price + (item.price * item.volatility)
        );

        if (user.coins < finalPrice) {
            return m.reply("❌ Not enough coins");
        }

        await supabase
            .from("g_users")
            .update({
                coins: user.coins - finalPrice
            })
            .eq("user_id", userId)
            .eq("group_id", groupId);

        await supabase.from("g_transactions").insert({
            user_id: userId,
            group_id: groupId,
            type: "market_buy",
            amount: finalPrice,
            status: "success"
        });

        let msg = `🖤 Bought ${item.item_name} for ${finalPrice}`;

        const { text } = await translate(msg, { to: lang });

        return sock.sendMessage(m.chat, { text });
    }

    // ================= SELL =================
    if (action === "sell") {

        const itemName = args.slice(1).join(" ");
        if (!itemName) return m.reply("❌ Specify item name");

        const price = Math.floor(200 + Math.random() * 800);

        await supabase
            .from("g_users")
            .update({
                coins: user.coins + price
            })
            .eq("user_id", userId)
            .eq("group_id", groupId);

        await supabase.from("g_transactions").insert({
            user_id: userId,
            group_id: groupId,
            type: "market_sell",
            amount: price,
            status: "success"
        });

        let msg = `💰 Sold ${itemName} for ${price}`;

        const { text } = await translate(msg, { to: lang });

        return sock.sendMessage(m.chat, { text });
    }
}

// ================= UTIL =================
function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
