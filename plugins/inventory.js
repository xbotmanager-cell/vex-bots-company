const translate = require("google-translate-api-x");

module.exports = {
    command: "inventory",
    alias: ["inv", "bag"],
    category: "economy",
    description: "View your inventory",

    async execute(m, sock, ctx) {
        const { supabase, userSettings } = ctx;

        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const userId = m.sender;
        const groupId = m.chat;

        const ui = {
            harsh: {
                title: "☣️ 𝕴𝕹𝖁𝕰𝕹𝕿𝕺𝕽𝖄 ☣️",
                empty: "𝕹𝖔 𝖎𝖙𝖊𝖒𝖘 𝖋𝖔𝖚𝖓𝖉",
                react: "🎒"
            },
            normal: {
                title: "🎒 Inventory",
                empty: "No items found",
                react: "🎒"
            },
            girl: {
                title: "🫧 Your Bag 🫧",
                empty: "no items yet~",
                react: "🎀"
            }
        }[style] || {};

        try {
            await sock.sendMessage(m.chat, {
                react: { text: ui.react, key: m.key }
            });

            // ================= FETCH INVENTORY =================
            const { data: items } = await supabase
                .from("g_inventory")
                .select("*")
                .eq("user_id", userId)
                .eq("group_id", groupId);

            if (!items || items.length === 0) {
                return m.reply(ui.empty);
            }

            let msg = `*${ui.title}*\n\n`;

            items.forEach((it, i) => {
                msg += `📦 ${i + 1}. ${it.item_name}\n`;
                msg += `⚔️ Type: ${it.item_type}\n`;
                msg += `💥 Power: ${it.power}\n`;
                msg += `🛡 Durability: ${it.durability}%\n\n`;
            });

            const { text } = await translate(msg, { to: lang });

            await sock.sendMessage(m.chat, { text });

        } catch (e) {
            console.error("INVENTORY ERROR:", e);
            m.reply("⚠️ Inventory error");
        }
    }
};
