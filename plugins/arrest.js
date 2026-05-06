const translate = require("google-translate-api-x");

// ================= GTA LAW ENFORCEMENT =================
const cooldowns = new Map();
const jailed = new Map();

module.exports = {
    command: "arrest",
    alias: ["jail", "police", "wanted"],
    category: "gta-system",
    description: "GTA arrest, jail, bribe, escape system",

    async execute(m, sock, ctx) {
        const { supabase, userSettings, args } = ctx;

        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const userId = m.sender;
        const groupId = m.chat;

        const target = m.mentionedJid?.[0];
        const action = args[0]?.toLowerCase();

        const ui = {
            harsh: {
                title: "☣️ 𝕲𝕿𝕬 𝕷𝖆𝖜 𝕾𝖞𝖘𝖙𝖊𝖒 ☣️",
                react: "🚨",
                jailed: "☣️ 𝖄𝖔𝖚 𝖆𝖗𝖊 𝖎𝖓 𝖏𝖆𝖎𝖑",
                free: "☣️ 𝖗𝖊𝖑𝖊𝖆𝖘𝖊𝖉"
            },
            normal: {
                title: "🚔 Police System",
                react: "🚔",
                jailed: "You are in jail",
                free: "You are free"
            },
            girl: {
                title: "💖 Cute Police",
                react: "🚓",
                jailed: "you got jailed~",
                free: "you are free now~"
            }
        }[style];

        await sock.sendMessage(m.chat, {
            react: { text: ui.react, key: m.key }
        });

        // ================= 1. COOLDOWN =================
        const last = cooldowns.get(userId) || 0;
        if (Date.now() - last < 5000) {
            return m.reply("⏳ Wait before using police actions");
        }
        cooldowns.set(userId, Date.now());

        // ================= 2. REGISTER WANTED LEVEL =================
        const { data: user } = await supabase
            .from("g_users")
            .select("*")
            .eq("user_id", userId)
            .eq("group_id", groupId)
            .single();

        if (!user) return m.reply("❌ Register first");

        let wanted = user.wanted || 0;

        // ================= 3. ACTIONS =================

        // 🚨 ARREST PLAYER
        if (action === "arrest") {

            if (!target) return m.reply("❌ Tag suspect");

            const arrestPower = Math.random() * 100 + user.luck;

            if (arrestPower > 70) {

                await supabase
                    .from("g_users")
                    .update({
                        jailed: true,
                        jail_time: Date.now() + 60000 // 1 min jail
                    })
                    .eq("user_id", target)
                    .eq("group_id", groupId);

                await supabase.from("g_transactions").insert({
                    user_id: target,
                    group_id: groupId,
                    type: "arrest",
                    amount: 0,
                    status: "jailed"
                });

                return m.reply("🚨 Arrest successful!");
            } else {
                wanted += 10;
            }
        }

        // 💰 BRIBE POLICE
        if (action === "bribe") {

            const amount = parseInt(args[1]) || 0;

            if (user.coins < amount) return m.reply("❌ Not enough coins");

            const success = Math.random() > 0.4;

            if (success) {
                await supabase
                    .from("g_users")
                    .update({
                        coins: user.coins - amount,
                        wanted: Math.max(0, wanted - 20)
                    })
                    .eq("user_id", userId)
                    .eq("group_id", groupId);

                return m.reply("💰 Bribe successful, wanted reduced");
            } else {
                wanted += 20;
                return m.reply("🚔 Bribe failed! Police angry!");
            }
        }

        // 🏃 ESCAPE JAIL
        if (action === "escape") {

            const escapeChance = Math.random() * 100;

            const jailedUser = user.jail_time || 0;

            if (Date.now() < jailedUser && escapeChance > 60) {

                await supabase
                    .from("g_users")
                    .update({
                        jailed: false,
                        jail_time: 0
                    })
                    .eq("user_id", userId)
                    .eq("group_id", groupId);

                return m.reply("🏃 Escape successful!");
            } else {
                return m.reply("❌ Escape failed!");
            }
        }

        // 📊 STATUS
        if (!action || action === "status") {

            return m.reply(`
🚨 *GTA LAW STATUS*

👤 Wanted Level: ${wanted}
🚔 Jail: ${user.jailed ? "YES" : "NO"}
⏳ Jail Time: ${user.jail_time ? new Date(user.jail_time).toLocaleTimeString() : "None"}
💰 Coins: ${user.coins}
            `);
        }

        // ================= UPDATE USER =================
        await supabase
            .from("g_users")
            .update({ wanted })
            .eq("user_id", userId)
            .eq("group_id", groupId);

        const { text } = await translate("System updated", { to: lang });

        return sock.sendMessage(m.chat, { text });
    }
};
