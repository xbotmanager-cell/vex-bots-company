const translate = require("google-translate-api-x");

module.exports = {
    command: "slots",
    category: "gamble",
    description: "Casino slots system",

    async execute(m, sock, ctx) {
        const { supabase, userSettings } = ctx;
        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const userId = m.sender;
        const groupId = m.chat;

        const bet = 100;

        const symbols = ["💰", "🔥", "💣", "🍀", "👑"];

        const spin = () => symbols[Math.floor(Math.random() * symbols.length)];

        const r1 = spin();
        const r2 = spin();
        const r3 = spin();

        const win = r1 === r2 && r2 === r3;

        const reward = win ? bet * 5 : -bet;

        const modes = {
            harsh: {
                win: "☣️ JACKPOT DESTROYED REALITY ☣️",
                lose: "☣️ YOU LOST EVERYTHING ☣️",
                react: "🎰"
            },
            normal: {
                win: "🎰 JACKPOT!",
                lose: "❌ Lost try again",
                react: "🎲"
            },
            girl: {
                win: "💖 OMG YOU WON BABY!",
                lose: "🥺 Aww you lost",
                react: "🎀"
            }
        };

        const ui = modes[style] || modes.normal;

        try {
            const { data: user } = await supabase
                .from("g_users")
                .select("*")
                .eq("user_id", userId)
                .eq("group_id", groupId)
                .single();

            if (!user || user.coins < bet) {
                return m.reply("❌ Not enough coins to play slots");
            }

            const newBalance = user.coins + reward;

            await supabase
                .from("g_users")
                .update({ coins: newBalance })
                .eq("user_id", userId)
                .eq("group_id", groupId);

            await supabase.from("g_transactions").insert({
                user_id: userId,
                group_id: groupId,
                type: "slots",
                amount: reward,
                status: win ? "win" : "lose"
            });

            await sock.sendMessage(m.chat, {
                react: { text: ui.react, key: m.key }
            });

            const msg = `
🎰 *SLOTS RESULT*

[ ${r1} | ${r2} | ${r3} ]

${win ? ui.win : ui.lose}
💰 Change: ${reward}
🪙 Balance updated
            `;

            const { text } = await translate(msg, { to: lang });
            await m.reply(text);

        } catch (e) {
            console.error("SLOTS ERROR:", e);
        }
    }
};
