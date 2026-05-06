const translate = require("google-translate-api-x");

module.exports = {
    command: "raid",
    alias: ["attack", "war"],
    category: "war",
    description: "Group raid system for economy warfare",

    async execute(m, sock, ctx) {
        const { supabase, userSettings } = ctx;

        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const attackerGroup = m.chat;

        // 🔥 FIX: pata user uliotag
        const targetUser = m.mentionedJid?.[0];

        const modes = {
            harsh: {
                win: "☣️ 𝕲𝖗𝖔𝖚𝖕 𝕽𝖆𝖎𝖉 𝕾𝖚𝖈𝖈𝖊𝖘𝖘 ☣️",
                lose: "☣️ 𝕽𝖆𝖎𝖉 𝕱𝖆𝖎𝖑𝖊𝖉 ☣️",
                react: "⚔️"
            },
            normal: {
                win: "⚔️ Raid Successful!",
                lose: "❌ Raid Failed!",
                react: "🪖"
            },
            girl: {
                win: "💖 We won the raid~",
                lose: "🥺 We lost the raid~",
                react: "🎀"
            }
        };

        const ui = modes[style] || modes.normal;

        try {
            if (!targetUser) {
                return m.reply("❌ Tag user from target group");
            }

            // 🔥 STEP: pata group ya huyo user kutoka DB
            const { data: targetUserData } = await supabase
                .from("g_users")
                .select("group_id")
                .eq("user_id", targetUser)
                .single();

            if (!targetUserData) {
                return m.reply("❌ Target user not registered in any group");
            }

            const targetGroup = targetUserData.group_id;

            if (targetGroup === attackerGroup) {
                return m.reply("❌ Cannot raid same group");
            }

            await sock.sendMessage(m.chat, {
                react: { text: ui.react, key: m.key }
            });

            // ================= FETCH GROUPS =================
            const { data: attacker } = await supabase
                .from("g_groups")
                .select("*")
                .eq("group_id", attackerGroup)
                .single();

            const { data: target } = await supabase
                .from("g_groups")
                .select("*")
                .eq("group_id", targetGroup)
                .single();

            if (!target) {
                return m.reply("❌ Target group not found");
            }

            // ================= RAID LOGIC =================
            const attackPower = (attacker?.power_level || 1) + Math.random();
            const defendPower = (target?.power_level || 1) + Math.random();

            const success = attackPower > defendPower;

            const loot = Math.floor(target.coins * (Math.random() * 0.3 + 0.1));

            let resultText = "";

            if (success) {

                await supabase
                    .from("g_groups")
                    .update({ coins: attacker.coins + loot })
                    .eq("group_id", attackerGroup);

                await supabase
                    .from("g_groups")
                    .update({ coins: Math.max(0, target.coins - loot) })
                    .eq("group_id", targetGroup);

                await supabase.from("g_raid_logs").insert({
                    attacker_group: attackerGroup,
                    defender_group: targetGroup,
                    stolen: loot,
                    outcome: "win"
                });

                resultText = `${ui.win}\n\n💰 Loot captured: ${loot}`;
            } else {

                const penalty = Math.floor(attacker.coins * 0.1);

                await supabase
                    .from("g_groups")
                    .update({
                        coins: Math.max(0, attacker.coins - penalty)
                    })
                    .eq("group_id", attackerGroup);

                await supabase.from("g_raid_logs").insert({
                    attacker_group: attackerGroup,
                    defender_group: targetGroup,
                    stolen: 0,
                    outcome: "lose"
                });

                resultText = `${ui.lose}\n\n💸 Loss: ${penalty}`;
            }

            const msg = `
*⚔️ RAID SYSTEM*

🏴 Attacker Group: ${attackerGroup}
🛡 Defender Group: ${targetGroup}

${resultText}
            `;

            const { text } = await translate(msg, { to: lang });

            await sock.sendMessage(m.chat, {
                text,
                mentions: [targetUser] // 🔥 mention sasa inafanya kazi
            });

        } catch (e) {
            console.error("RAID ERROR:", e);
            await m.reply("⚠️ Raid system failed");
        }
    }
};
