const translate = require("google-translate-api-x");

module.exports = {
    command: "raid",
    alias: ["attack", "war", "shambulio"],
    category: "war",
    description: "High-stakes group raid system for economic dominance",

    async execute(m, sock, ctx) {
        const { supabase, userSettings, prefix } = ctx;

        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        // 🔥 FIX: Check if it's a group
        if (!m.chat.endsWith('@g.us')) return m.reply("☣️ Raids can only be initiated from a War Zone (Group).");

        const attackerGroup = m.chat;
        const attackerUser = m.sender;
        
        // 🔥 FIX: Pata target user kutoka tag au reply
        const targetUser = m.mentionedJid?.[0] || m.message?.extendedTextMessage?.contextInfo?.participant;

        const modes = {
            harsh: {
                win: "☣️ 𝕲𝕽𝕺𝖀𝕻 𝕽𝕬𝕴𝕯 𝕾𝖀𝕮𝕮𝕰𝕾𝕾: 𝖄𝖔𝖚 𝖋𝖚𝖈𝖐𝖎𝖓𝖌 𝖉𝖊𝖘𝖙𝖗𝖔𝖞𝖊𝖉 𝖙𝖍𝖊𝖒! ☣️",
                lose: "☣️ 𝕽𝕬𝕴𝕯 𝕱𝕬𝕴𝕿𝕰𝕯: 𝖄𝖔𝖚 𝖜𝖊𝖆𝖐 𝖕𝖎𝖊𝖈𝖊 𝖔𝖋 𝖘𝖍𝖎𝖙, 𝖙𝖍𝖊𝖞 𝖗𝖊𝖕𝖊𝖑𝖑𝖊𝖉 𝖞𝖔𝖚! ☣️",
                shield: "🛡️ 𝕿𝖍𝖊𝖎𝖗 𝖋𝖚𝖈𝖐𝖎𝖓𝖌 𝖘𝖍𝖎𝖊𝖑𝖉 𝖆𝖇𝖘𝖔𝖗𝖇𝖊𝖉 𝖙𝖍𝖊 𝖉𝖆𝖒𝖆𝖌𝖊! 🛡️",
                react: "⚔️"
            },
            normal: {
                win: "⚔️ Raid Successful! You looted the target.",
                lose: "❌ Raid Failed! Your forces were pushed back.",
                shield: "🛡️ Enemy Shield is active! Raid blocked.",
                react: "🪖"
            },
            girl: {
                win: "💖 Yay! We totally crushed their base~ 🎀",
                lose: "🥺 Oh no... our raid failed, so sorry~ 🎀",
                shield: "🫧 Their cute shield blocked us, hihi~ 🎀",
                react: "🎀"
            }
        };

        const ui = modes[style] || modes.normal;

        try {
            if (!targetUser) {
                return m.reply(`❌ *USAGE:* ${prefix}raid @user (Tag the victim from the target group)`);
            }

            // 1. Get Target's Group from DB
            const { data: targetUserData } = await supabase
                .from("g_users")
                .select("group_id")
                .eq("user_id", targetUser)
                .single();

            if (!targetUserData) return m.reply("❌ Target is a ghost (Not registered in any VEX group).");

            const targetGroup = targetUserData.group_id;
            if (targetGroup === attackerGroup) return m.reply("☣️ Don't attack your own brothers, idiot.");

            await sock.sendMessage(m.chat, { react: { text: ui.react, key: m.key } });

            // 2. Fetch Stats for both groups
            const { data: attacker } = await supabase.from("g_groups").select("*").eq("group_id", attackerGroup).single();
            const { data: target } = await supabase.from("g_groups").select("*").eq("group_id", targetGroup).single();

            if (!attacker || !target) return m.reply("❌ Group database error. Ensure both groups are registered.");

            // 🛡️ NEW FEATURE: Shield Check
            if (target.shield_active && Math.random() > 0.3) {
                await supabase.from("g_groups").update({ shield_durability: target.shield_durability - 1 }).eq("group_id", targetGroup);
                return sock.sendMessage(m.chat, { text: ui.shield, mentions: [targetUser] });
            }

            // 3. RAID LOGIC (Power vs Defense)
            const attackPower = (attacker.power_level || 1) * (Math.random() * 1.5);
            const defendPower = (target.power_level || 1) * (Math.random() * 1.2);
            const success = attackPower > defendPower;

            let resultText = "";
            let finalLoot = 0;

            if (success) {
                // Success: Steal 10% to 40% of their coins
                finalLoot = Math.floor(target.coins * (Math.random() * 0.3 + 0.1));
                
                await supabase.from("g_groups").update({ 
                    coins: attacker.coins + finalLoot,
                    power_level: attacker.power_level + 0.1 // Level up!
                }).eq("group_id", attackerGroup);

                await supabase.from("g_groups").update({ 
                    coins: Math.max(0, target.coins - finalLoot) 
                }).eq("group_id", targetGroup);

                resultText = `${ui.win}\n\n💰 *Loot Stolen:* ${finalLoot} Coins\n📈 *Power Gained:* +0.1`;
            } else {
                // Failure: Lose 15% of your own coins as penalty
                const penalty = Math.floor(attacker.coins * 0.15);
                await supabase.from("g_groups").update({ 
                    coins: Math.max(0, attacker.coins - penalty) 
                }).eq("group_id", attackerGroup);

                resultText = `${ui.lose}\n\n💸 *Casualties Cost:* ${penalty} Coins`;
            }

            // 4. Log the war
            await supabase.from("g_raid_logs").insert({
                attacker_id: attackerUser,
                attacker_group: attackerGroup,
                defender_group: targetGroup,
                loot_amount: finalLoot,
                status: success ? "WIN" : "LOSE"
            });

            // 5. Build Final Message
            const rawMsg = `
*⚔️ VEX WAR-ROOM REPORT ⚔️*
----------------------------------
🚩 *Aggressor:* @${attackerUser.split('@')[0]}
🛡️ *Victim:* @${targetUser.split('@')[0]}

🏴 *Attacker Unit:* ${attacker.group_name || 'Unknown'}
🏳️ *Defender Unit:* ${target.group_name || 'Unknown'}

${resultText}
----------------------------------
_VEX Economy Warfare System v2.0_
            `;

            const { text: translatedText } = await translate(rawMsg, { to: lang });

            await sock.sendMessage(m.chat, {
                text: translatedText,
                mentions: [attackerUser, targetUser]
            });

        } catch (e) {
            console.error("RAID CRITICAL ERROR:", e);
            await m.reply("☣️ RAID SYSTEM OFFLINE: Database connection severed.");
        }
    }
};
