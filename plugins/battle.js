const translate = require("google-translate-api-x");

/**
 * 𝖵𝖤𝖷 𝖦𝖳𝖠: 𝖳𝖮𝖳𝖠𝖫 𝖶𝖠𝖱 𝖤𝖭𝖦𝖨𝖭𝖤
 * Turn-based combat, Police Ambush, Explosives, and Style-based UI.
 * Built for Lupin Starnley Jimmoh
 */

module.exports = {
    command: "battle",
    alias: ["piga", "war", "shambulia", "kill", "raid", "pambana"],
    category: "game",
    description: "Advanced turn-based street combat system",

    async execute(m, sock, ctx) {
        const { supabase, userSettings, args, prefix } = ctx;

        // 🔥 SETTINGS & STYLE
        const style = userSettings?.style || "normal";
        const isSwahili = args.includes("sw"); // Check if 'sw' is in command
        const userId = m.sender;
        const groupId = m.chat;
        const target = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);

        // 🎭 UI CONFIGURATIONS
        const uiConfig = {
            harsh: {
                start: "☣️ 𝖬𝖨𝖲𝖲𝖨𝖮𝖭 𝖲𝖳𝖠𝖱𝖳𝖤𝖣: 𝖤𝖫𝖨𝖬𝖨𝖭𝖠𝖳𝖤 𝖳𝖠𝖱𝖦𝖤𝖳 ☣️",
                win: "🏆 𝖳𝖠𝖱𝖦𝖤𝖳 𝖶𝖠𝖲𝖳𝖤𝖣. 𝖢𝖠𝖲𝖧 𝖢𝖮𝖫𝖫𝖤𝖢𝖳𝖤𝖣.",
                lose: "💀 𝖸𝖮𝖴 𝖶𝖤𝖱𝖤 𝖪𝖨𝖫𝖫𝖤𝖣 𝖨𝖭 𝖠𝖢𝖳𝖨𝖮𝖭.",
                police: "🚨 𝖡𝖴𝖲𝖳𝖤𝖣! 𝖯𝖮𝖫𝖨𝖢𝖤 𝖱𝖠𝖨𝖣𝖤𝖣 𝖳𝖧𝖤 𝖠𝖱𝖤𝖠.",
                font: (t) => `\x60\x60\x60${t}\x60\x60\x60` // Typewriter
            },
            girl: {
                start: "✨ 𝖡𝖺𝗍𝗍𝗅𝖾 𝖳𝗂𝗆𝖾, 𝖡𝖺𝖻𝗒! 𝖣𝗈𝗇'𝗍 𝗀𝖾𝗍 𝗁𝗎𝗋𝗍~ ✨",
                win: "💖 𝖸𝗈𝗎 𝗐𝗈𝗇! 𝖲𝗈 𝗉𝗋𝗈𝗎𝖽 𝗈𝖿 𝗒𝗈𝗎~",
                lose: "🥺 𝖮𝗁 𝗇𝗈, 𝗒𝗈𝗎 𝗀𝗈𝗍 𝗁𝗎𝗋𝗍. 𝖱𝖾𝗌𝗍 𝗎𝗉~",
                police: "🚔 𝖮𝗈𝘱𝘴! 𝖳𝗁𝖾 𝗉𝗈𝗅𝗂𝖼𝖾 𝖺𝗋𝖾 𝗁𝖾𝗋𝖾~",
                font: (t) => `🌸 ${t} 🌸`
            },
            normal: {
                start: "⚔️ VEX GTA: STREET FIGHT STARTING...",
                win: "🏆 VICTORY! Enemy defeated.",
                lose: "💀 WASTED! You lost the fight.",
                police: "🚓 POLICE INTERVENTION! Operation failed.",
                font: (t) => t
            }
        };

        const ui = uiConfig[style] || uiConfig.normal;

        if (!target) return m.reply("❌ Tag the person you want to eliminate!");
        if (target === userId) return m.reply("❌ You can't start a war against yourself!");

        await sock.sendMessage(m.chat, { react: { text: "🔫", key: m.key } });

        // 🏦 DATA RETRIEVAL
        const [{ data: userA }, { data: userB }] = await Promise.all([
            supabase.from("g_users").select("*").eq("user_id", userId).eq("group_id", groupId).single(),
            supabase.from("g_users").select("*").eq("user_id", target).eq("group_id", groupId).single()
        ]);

        if (!userA || !userB) return m.reply("❌ Both fighters must be registered in VEX!");

        // 🔫 AI WEAPON & TURN SYSTEM
        const weapons = [
            { n: "Fists", p: 10, m: "punching" },
            { n: "Baseball Bat", p: 25, m: "swinging at" },
            { n: "Uzi", p: 45, m: "spraying bullets on" },
            { n: "Grenade", p: 70, m: "throwing an explosive at" },
            { n: "RPG", p: 120, m: "firing a rocket at" },
            { n: "Minigun", p: 200, m: "shredding" }
        ];

        const pickW = (luck) => weapons[Math.floor((luck / 105) * (weapons.length - 1))] || weapons[0];
        
        let hpA = 100, hpB = 100;
        let combatLog = `${ui.start}\n\n`;
        let turn = 0;

        // ⚔️ TURN-BASED COMBAT LOOP (Piga ni Kupigee)
        while (hpA > 0 && hpB > 0 && turn < 6) {
            turn++;
            const wA = pickW(userA.luck || 50);
            const wB = pickW(userB.luck || 50);

            // Attacker's Turn
            const dmgA = Math.floor(Math.random() * wA.p) + 5;
            hpB -= dmgA;
            combatLog += `➡️ [ROUND ${turn}]: You are ${wA.m} @${target.split("@")[0]} with ${wA.n} (-${dmgA} HP)\n`;

            if (hpB <= 0) break;

            // Defender's Turn
            const dmgB = Math.floor(Math.random() * wB.p) + 5;
            hpA -= dmgB;
            combatLog += `⬅️ [ROUND ${turn}]: Enemy is ${wB.m} you with ${wB.n} (-${dmgB} HP)\n\n`;
        }

        // 🚔 RANDOM EVENTS (Police, Bombs, Theft)
        let eventOccurred = false;
        let eventMsg = "";
        const eventRoll = Math.random();

        if (eventRoll < 0.15 && (userA.wanted_level || 0) > 1) {
            eventOccurred = true;
            const fine = Math.floor(userA.coins * 0.2);
            await supabase.from("g_users").update({ coins: userA.coins - fine, wanted_level: 0 }).eq("user_id", userId);
            eventMsg = `\n${ui.police}\n💸 You were fined $${fine} and arrested.`;
        } else if (eventRoll > 0.85) {
            const steal = Math.floor(userB.coins * 0.1);
            await supabase.from("g_users").update({ coins: userA.coins + steal }).eq("user_id", userId);
            await supabase.from("g_users").update({ coins: userB.coins - steal }).eq("user_id", target);
            eventMsg = `\n💰 During the chaos, you managed to steal $${steal} from the target!`;
        }

        // 🏁 FINAL CALCULATION
        let result = "";
        let finalReward = 0;

        if (eventOccurred) {
            result = "BUSTED";
        } else if (hpB <= 0) {
            finalReward = Math.floor(Math.random() * 1000 + 500);
            result = `${ui.win}\n💰 Bounty: +$${finalReward}`;
            await supabase.from("g_users").update({ 
                coins: userA.coins + finalReward, 
                wanted_level: (userA.wanted_level || 0) + 1 
            }).eq("user_id", userId);
        } else {
            finalReward = -Math.floor(userA.coins * 0.1);
            result = `${ui.lose}\n💸 Hospital Bill: $${Math.abs(finalReward)}`;
            await supabase.from("g_users").update({ coins: userA.coins + finalReward }).eq("user_id", userId);
        }

        let fullReport = `${combatLog}\n--------------------------\n${result}\n${eventMsg}`;

        // 🌍 TRANSLATION LOGIC
        if (isSwahili) {
            const { text } = await translate(fullReport, { to: "sw" });
            fullReport = text;
        }

        // 🖋️ APPLY FONT
        const finalOutput = ui.font(fullReport);

        await sock.sendMessage(m.chat, {
            text: finalOutput,
            mentions: [userId, target]
        });

        // 📜 LOG TRANSACTION
        await supabase.from("g_transactions").insert({
            user_id: userId, group_id: groupId, type: "gta_war",
            amount: finalReward, status: hpB <= 0 ? "victory" : "wasted"
        });
    }
};
