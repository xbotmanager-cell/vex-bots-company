const translate = require("google-translate-api-x");

// ================= GTA GROUP BATTLE + WANTED SYSTEM =================
module.exports = {
    command: "battle",
    alias: ["fight", "duel"],
    category: "game",
    description: "GTA style inventory battle system",

    async execute(m, sock, ctx) {
        const { supabase, userSettings } = ctx;

        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const userId = m.sender;
        const groupId = m.chat;
        const target = m.mentionedJid?.[0];

        const ui = {
            harsh: {
                title: "☣️ 𝕲𝕿𝕬 𝕭𝖆𝖙𝖙𝖑𝖊 ☣️",
                react: "⚔️",
                noTarget: "☣️ 𝕿𝖆𝖌 𝖊𝖓𝖊𝖒𝖞 𝖋𝖎𝖗𝖘𝖙",
                self: "☣️ 𝖞𝖔𝖚 𝖈𝖆𝖓𝖓𝖔𝖙 𝖋𝖎𝖌𝖍𝖙 𝖞𝖔𝖚𝖗𝖘𝖊𝖑𝖋"
            },
            normal: {
                title: "⚔️ GTA Battle",
                react: "⚔️",
                noTarget: "Tag a player",
                self: "You cannot fight yourself"
            },
            girl: {
                title: "💖 Battle Time~",
                react: "🎀",
                noTarget: "please tag someone~",
                self: "you can't fight yourself~"
            }
        }[style] || {};

        await sock.sendMessage(m.chat, {
            react: { text: ui.react, key: m.key }
        });

        if (!target) return m.reply(ui.noTarget);
        if (target === userId) return m.reply(ui.self);

        // ================= FETCH USERS =================
        const { data: attacker } = await supabase
            .from("g_users")
            .select("*")
            .eq("user_id", userId)
            .eq("group_id", groupId)
            .single();

        const { data: defender } = await supabase
            .from("g_users")
            .select("*")
            .eq("user_id", target)
            .eq("group_id", groupId)
            .single();

        if (!attacker || !defender) {
            return m.reply("❌ Both players must be registered");
        }

        // ================= WANTED SYSTEM =================
        let wantedA = attacker.wanted_level || 0;
        let wantedB = defender.wanted_level || 0;

        // ================= FETCH WEAPONS (BLACK MARKET READY) =================
        const { data: invA } = await supabase
            .from("g_inventory")
            .select("*")
            .eq("user_id", userId)
            .eq("group_id", groupId);

        const { data: invB } = await supabase
            .from("g_inventory")
            .select("*")
            .eq("user_id", target)
            .eq("group_id", groupId);

        const weaponA =
            invA?.find(i => i.item_type === "weapon") || { power: 15, durability: 100 };

        const weaponB =
            invB?.find(i => i.item_type === "weapon") || { power: 15, durability: 100 };

        // ================= POLICE INTERVENTION =================
        const policeChance = Math.random();

        const policeActive = (wantedA > 3 || wantedB > 3) && policeChance > 0.6;

        // ================= FIGHT POWER =================
        const atkPower =
            weaponA.power +
            Math.floor(Math.random() * (attacker.luck || 50));

        const defPower =
            weaponB.power +
            Math.floor(Math.random() * (defender.luck || 50));

        let win = atkPower > defPower;

        let reward = Math.floor(Math.random() * 500 + 200);

        // ================= POLICE EFFECT =================
        if (policeActive) {
            reward = Math.floor(reward * 0.5);
            win = false;

            wantedA += 1;
        }

        // ================= UPDATE WANTED =================
        await supabase.from("g_users")
            .update({ wanted_level: wantedA })
            .eq("user_id", userId)
            .eq("group_id", groupId);

        // ================= RESULT =================
        let msg = `*${ui.title}*\n\n`;
        msg += `👤 Attacker: @${userId.split("@")[0]}\n`;
        msg += `🛡 Defender: @${target.split("@")[0]}\n\n`;

        if (policeActive) {
            msg += `🚨 POLICE INTERVENTION!\n`;
            msg += `👮 Operation disrupted\n\n`;
        }

        msg += `⚔️ Attack: ${atkPower}\n🛡 Defense: ${defPower}\n\n`;

        if (win) {
            msg += `🏆 ATTACKER WINS\n💰 +${reward}`;

            await supabase.from("g_users").update({
                coins: attacker.coins + reward
            }).eq("user_id", userId);

        } else {
            msg += `💀 DEFENDER WINS\n💸 -${reward}`;

            await supabase.from("g_users").update({
                coins: Math.max(0, attacker.coins - reward)
            }).eq("user_id", userId);
        }

        // ================= LOG =================
        await supabase.from("g_transactions").insert({
            user_id: userId,
            group_id: groupId,
            type: "battle",
            amount: reward,
            status: win ? "win" : "lose"
        });

        const { text } = await translate(msg, { to: lang });

        await sock.sendMessage(m.chat, {
            text,
            mentions: [userId, target]
        });
    }
};
