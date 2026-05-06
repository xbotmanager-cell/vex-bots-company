const translate = require("google-translate-api-x");

module.exports = {
    command: "register",
    alias: ["reg", "join"],
    category: "economy",
    description: "Register user into economy system",

    async execute(m, sock, ctx) {
        const { supabase, userSettings } = ctx;

        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const groupId = m.chat;

        // 🔥 detect user (self or tagged)
        const targetUser = m.mentionedJid?.[0] || m.sender;

        const modes = {
            harsh: {
                done: "☣️ 𝖄𝖔𝖚 𝖆𝖗𝖊 𝖓𝖔𝖜 𝖎𝖓 𝖙𝖍𝖊 𝖘𝖞𝖘𝖙𝖊𝖒 ☣️",
                exist: "☣️ 𝕬𝖑𝖗𝖊𝖆𝖉𝖞 𝖗𝖊𝖌𝖎𝖘𝖙𝖊𝖗𝖊𝖉 ☣️",
                react: "☣️"
            },
            normal: {
                done: "✅ Successfully registered!",
                exist: "⚠️ User already registered!",
                react: "✅"
            },
            girl: {
                done: "💖 you're in now, darling~",
                exist: "🥺 already registered~",
                react: "🎀"
            }
        };

        const ui = modes[style] || modes.normal;

        try {
            await sock.sendMessage(m.chat, {
                react: { text: ui.react, key: m.key }
            });

            // ================= CHECK GROUP =================
            let { data: group } = await supabase
                .from("g_groups")
                .select("*")
                .eq("group_id", groupId)
                .single();

            // 🔥 create group if not exists
            if (!group) {
                await supabase.from("g_groups").insert({
                    group_id: groupId,
                    name: "Auto-Generated Group"
                });
            }

            // ================= CHECK USER =================
            const { data: existing } = await supabase
                .from("g_users")
                .select("*")
                .eq("user_id", targetUser)
                .eq("group_id", groupId)
                .single();

            if (existing) {
                const { text } = await translate(ui.exist, { to: lang });

                return sock.sendMessage(m.chat, {
                    text,
                    mentions: [targetUser]
                });
            }

            // ================= REGISTER USER =================
            await supabase.from("g_users").insert({
                user_id: targetUser,
                group_id: groupId,
                coins: 500, // starter bonus
                bank: 0,
                debt: 0,
                luck: 50,
                strength: 50
            });

            // ================= DAILY CLAIM INIT =================
            await supabase.from("g_daily_claims").insert({
                user_id: targetUser,
                group_id: groupId,
                streak: 0,
                total_claims: 0
            });

            // ================= RESPONSE =================
            let msg = `
*👤 REGISTER SYSTEM*

✅ User: @${targetUser.split("@")[0]}
🏦 Group: ${groupId}

💰 Starter Coins: 500

${ui.done}
            `;

            const { text } = await translate(msg, { to: lang });

            await sock.sendMessage(m.chat, {
                text,
                mentions: [targetUser]
            });

        } catch (e) {
            console.error("REGISTER ERROR:", e);
            await m.reply("⚠️ Registration failed");
        }
    }
};
