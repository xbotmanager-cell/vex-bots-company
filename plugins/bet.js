const translate = require("google-translate-api-x");

module.exports = {
    command: "bet",
    alias: ["gamble", "casino"],
    category: "gamble",
    description: "Unified casino betting engine",

    async execute(m, sock, ctx) {
        const { args, supabase, userSettings, prefix } = ctx;

        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const userId = m.sender;
        const groupId = m.chat;

        const type = args[0]?.toLowerCase();
        const amount = parseInt(args[1]);

        const modes = {
            harsh: {
                win: "☣️ 𝕮𝖆𝖘𝖎𝖓𝖔 𝕾𝖚𝖈𝖈𝖊𝖘𝖘 ☣️",
                lose: "☣️ 𝕷𝖔𝖘𝖙 𝕰𝖛𝖊𝖗𝖞𝖙𝖍𝖎𝖓𝖌 ☣️",
                react: "🎰"
            },
            normal: {
                win: "🎰 You Won!",
                lose: "❌ You Lost!",
                react: "🎲"
            },
            girl: {
                win: "💖 You won baby~",
                lose: "🥺 You lost~",
                react: "🎀"
            }
        };

        const ui = modes[style] || modes.normal;

        try {
            if (!type || !amount || isNaN(amount) || amount <= 0) {
                return m.reply(`
🎰 *CASINO ENGINE*

Usage:
${prefix}bet slots <amount>
${prefix}bet dice <amount>
${prefix}bet roulette <amount>
                `);
            }

            // ================= FETCH USER =================
            const { data: user } = await supabase
                .from("g_users")
                .select("*")
                .eq("user_id", userId)
                .eq("group_id", groupId)
                .single();

            if (!user) {
                return m.reply("❌ Profile not found");
            }

            if (user.coins < amount) {
                return m.reply("❌ Not enough coins");
            }

            let win = false;
            let multiplier = 1;
            let resultText = "";

            // ================= SLOT GAME =================
            if (type === "slots") {
                const symbols = ["💰", "🔥", "🍀", "💣", "👑"];

                const r = () => symbols[Math.floor(Math.random() * symbols.length)];

                const a = r(), b = r(), c = r();

                win = a === b && b === c;
                multiplier = win ? 5 : 0;

                resultText = `[ ${a} | ${b} | ${c} ]`;
            }

            // ================= DICE GAME =================
            if (type === "dice") {
                const roll = Math.floor(Math.random() * 6) + 1;

                win = roll > 3;
                multiplier = win ? 2 : 0;

                resultText = `🎲 Rolled: ${roll}`;
            }

            // ================= ROULETTE =================
            if (type === "roulette") {
                const num = Math.floor(Math.random() * 10);

                win = num % 2 === 0;
                multiplier = win ? 1.8 : 0;

                resultText = `🎡 Number: ${num}`;
            }

            // ================= CALCULATION =================
            const change = win ? Math.floor(amount * multiplier) : -amount;

            const newBalance = user.coins + change;

            await supabase
                .from("g_users")
                .update({ coins: newBalance })
                .eq("user_id", userId)
                .eq("group_id", groupId);

            await supabase.from("g_transactions").insert({
                user_id: userId,
                group_id: groupId,
                type: `casino_${type}`,
                amount: change,
                status: win ? "win" : "lose"
            });

            await sock.sendMessage(m.chat, {
                react: { text: ui.react, key: m.key }
            });

            const msg = `
🎰 *CASINO ENGINE*

🎮 Game: ${type}
${resultText}

${win ? ui.win : ui.lose}
💰 Change: ${change}
🪙 Balance updated
            `;

            const { text } = await translate(msg, { to: lang });

            await m.reply(text);

        } catch (e) {
            console.error("CASINO ERROR:", e);
            await m.reply("⚠️ Casino engine failed");
        }
    }
};
