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

    const action = args[0]; // buy / sell / list

    const ui = {
        harsh: {
            buy: "☣️ 𝕭𝖚𝖞𝖎𝖓𝖌 𝕭𝖑𝖆𝖈𝖐 𝕸𝖆𝖗𝖐𝖊𝖙 ☣️",
            sell: "☣️ 𝕾𝖊𝖑𝖑𝖎𝖓𝖌 ☣️",
            react: "🖤"
        },
        normal: {
            buy: "🖤 Market Buy",
            sell: "💰 Market Sell",
            react: "🛒"
        },
        girl: {
            buy: "💖 buying for you~",
            sell: "🥺 selling item~",
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

    // ================= LIST MARKET =================
    if (!action || action === "list") {
        const { data: items } = await supabase
            .from("g_market")
            .select("*")
            .eq("group_id", groupId);

        let list = "🖤 *BLACK MARKET LIST*\n\n";

        for (const i of items || []) {
            list += `📦 ${i.name} - 💰 ${i.price}\n`;
        }

        const { text } = await translate(list, { to: lang });

        return sock.sendMessage(m.chat, { text });
    }

    // ================= BUY =================
    if (action === "buy") {
        const itemName = args.slice(1).join(" ");

        const { data: item } = await supabase
            .from("g_market")
            .select("*")
            .eq("group_id", groupId)
            .eq("name", itemName)
            .single();

        if (!item) return m.reply("❌ Item not found");

        if (user.coins < item.price) {
            return m.reply("❌ Not enough coins");
        }

        await supabase
            .from("g_users")
            .update({ coins: user.coins - item.price })
            .eq("user_id", userId)
            .eq("group_id", groupId);

        await supabase.from("g_transactions").insert({
            user_id: userId,
            group_id: groupId,
            type: "market_buy",
            amount: item.price,
            status: "success"
        });

        let msg = `🖤 Bought ${item.name} for ${item.price}`;

        const { text } = await translate(msg, { to: lang });

        return sock.sendMessage(m.chat, { text });
    }

    // ================= SELL =================
    if (action === "sell") {
        const itemName = args.slice(1).join(" ");

        const price = Math.floor(Math.random() * 500 + 100);

        await supabase
            .from("g_users")
            .update({ coins: user.coins + price })
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
