const translate = require("google-translate-api-x");

module.exports = {
    command: "event",
    category: "events",
    description: "Random world spawn event system",

    async execute(m, sock, ctx) {
        const { supabase, userSettings } = ctx;

        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const groupId = m.chat;

        const modes = {
            harsh: {
                coin: "☣️ 𝕮𝖔𝖎𝖓 𝕾𝖕𝖆𝖜𝖓 ☣️",
                chaos: "☣️ 𝕮𝖍𝖆𝖔𝖘 𝕰𝖛𝖊𝖓𝖙 ☣️",
                jackpot: "☣️ 𝕵𝖆𝖈𝖐𝖕𝖔𝖙 𝕭𝖑𝖔𝖔𝖉 ☣️",
                react: "🌍"
            },
            normal: {
                coin: "💰 Coin Spawn Event",
                chaos: "💣 Chaos Event",
                jackpot: "🎰 Jackpot Event",
                react: "🌍"
            },
            girl: {
                coin: "💖 Cute Coin Spawn~",
                chaos: "🥺 Chaos happening~",
                jackpot: "💖 Big jackpot baby~",
                react: "🎀"
            }
        };

        const ui = modes[style] || modes.normal;

        try {
            const eventTypes = ["coin", "chaos", "jackpot", "trader"];
            const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];

            let message = "";
            let reward = 0;

            // ================= COIN SPAWN =================
            if (type === "coin") {
                reward = Math.floor(Math.random() * 500) + 100;

                await supabase.from("g_events").insert({
                    group_id: groupId,
                    event_type: "coin_spawn",
                    description: "Coins spawned in group",
                    reward
                });

                message = `
🌍 *${ui.coin}*

💰 A coin storm has appeared!
🎁 Reward pool: ${reward}
⚡ First to claim wins!
                `;
            }

            // ================= CHAOS EVENT =================
            if (type === "chaos") {
                await supabase.from("g_events").insert({
                    group_id: groupId,
                    event_type: "chaos",
                    description: "Random losses triggered",
                    reward: 0
                });

                message = `
🌍 *${ui.chaos}*

💣 Chaos has erupted in the system!
⚠️ Random users may lose coins!
                `;
            }

            // ================= JACKPOT EVENT =================
            if (type === "jackpot") {
                reward = Math.floor(Math.random() * 2000) + 500;

                await supabase.from("g_events").insert({
                    group_id: groupId,
                    event_type: "jackpot",
                    description: "Mass jackpot event",
                    reward
                });

                message = `
🌍 *${ui.jackpot}*

🎰 JACKPOT EVENT ACTIVE!
💰 Total pool: ${reward}
🏆 Everyone can compete!
                `;
            }

            // ================= TRADER EVENT =================
            if (type === "trader") {
                await supabase.from("g_events").insert({
                    group_id: groupId,
                    event_type: "trader",
                    description: "Market trader spawned",
                    reward: 0
                });

                message = `
🌍 *🧑‍💼 Trader Event*

💱 A mysterious trader has appeared!
📈 Buy low, sell high opportunity active!
                `;
            }

            const { text } = await translate(message, { to: lang });

            await sock.sendMessage(m.chat, {
                text
            });

        } catch (e) {
            console.error("EVENT ERROR:", e);
            await m.reply("⚠️ Event system failed");
        }
    }
};
