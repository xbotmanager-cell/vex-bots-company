const translate = require("google-translate-api-x");

module.exports = {
    command: "equip",
    category: "economy",
    description: "Equip a weapon",

    async execute(m, sock, ctx) {
        const { supabase, args, userSettings } = ctx;

        const style = userSettings?.style || "normal";
        const lang = userSettings?.lang || "en";

        const userId = m.sender;
        const groupId = m.chat;

        const itemName = args.join(" ");

        if (!itemName) {
            return m.reply("❌ Specify item name");
        }

        try {
            // ================= FIND ITEM =================
            const { data: item } = await supabase
                .from("g_inventory")
                .select("*")
                .eq("user_id", userId)
                .eq("group_id", groupId)
                .eq("item_name", itemName)
                .single();

            if (!item) {
                return m.reply("❌ Item not found in inventory");
            }

            // ================= SET ACTIVE WEAPON =================
            await supabase
                .from("g_users")
                .update({
                    strength: 50 + item.power
                })
                .eq("user_id", userId)
                .eq("group_id", groupId);

            const msg = `
⚔️ *WEAPON EQUIPPED*

📦 Item: ${item.item_name}
💥 Power Boost: +${item.power}
🛡 Durability: ${item.durability}%
            `;

            const { text } = await translate(msg, { to: lang });

            await sock.sendMessage(m.chat, { text });

        } catch (e) {
            console.error("EQUIP ERROR:", e);
            m.reply("⚠️ Equip failed");
        }
    }
};
