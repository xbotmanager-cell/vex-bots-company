const translate = require("google-translate-api-x");

module.exports = {
    command: "profile",
    alias: ["stats", "balance"],
    category: "economy",
    description: "Shows user economy profile",

    async execute(m, sock, ctx) {
        const { supabase, userSettings } = ctx;

        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const userId = m.sender;
        const groupId = m.chat;

        const modes = {
            harsh: {
                head: "☣️ 𝕻𝖗𝖔𝖋𝖎𝖑𝖊 𝕾𝖞𝖘𝖙𝖊𝖒 ☣️",
                react: "💀"
            },
            normal: {
                head: "👤 Profile System",
                react: "📊"
            },
            girl: {
                head: "🫧 Your Soft Profile 🫧",
                react: "🎀"
            }
        };

        const ui = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, {
                react: { text: ui.react, key: m.key }
            });

            // ================= FETCH USER =================
            let { data: user } = await supabase
                .from("g_users")
                .select("*")
                .eq("user_id", userId)
                .eq("group_id", groupId)
                .single();

            // ================= AUTO CREATE USER =================
            if (!user) {
                const { data: newUser } = await supabase
                    .from("g_users")
                    .insert({
                        user_id: userId,
                        group_id: groupId,
                        coins: 0,
                        bank: 0,
                        debt: 0,
                        luck: 50,
                        strength: 50,
                        last_daily: null
                    })
                    .select()
                    .single();

                user = newUser;
            }

            // ================= GROUP DATA =================
            let { data: group } = await supabase
                .from("g_groups")
                .select("*")
                .eq("group_id", groupId)
                .single();

            if (!group) {
                const { data: newGroup } = await supabase
                    .from("g_groups")
                    .insert({
                        group_id: groupId,
                        name: "Unknown Group",
                        coins: 0,
                        bank_balance: 0,
                        power_level: 1,
                        crime_level: 0
                    })
                    .select()
                    .single();

                group = newGroup;
            }

            // ================= BUILD PROFILE =================
            let msg = `
*${ui.head}*

👤 User: @${userId.split("@")[0]}
💰 Coins: ${user.coins}
🏦 Bank: ${user.bank}
💸 Debt: ${user.debt}

🍀 Luck: ${user.luck}
💪 Strength: ${user.strength}

🏛 Group Stats:
📦 Group Coins: ${group.coins}
🏦 Group Bank: ${group.bank_balance}
⚔️ Power Level: ${group.power_level}
☠️ Crime Level: ${group.crime_level}
            `;

            // ================= TRANSLATE =================
            const { text } = await translate(msg, { to: lang });

            await sock.sendMessage(m.chat, {
                text,
                mentions: [userId]
            }, { quoted: m });

        } catch (e) {
            console.error("PROFILE ERROR:", e);
            await m.reply("⚠️ Profile system error");
        }
    }
};
