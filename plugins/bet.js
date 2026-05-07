const translate = require("google-translate-api-x");

module.exports = {
    command: "casino", // Changed from 'bet' to avoid conflict
    alias: ["cas", "gamble", "v-casino"], // Removed 'bet' from alias
    category: "gamble",
    description: "VEX Unified casino betting engine",

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
🎰 *VEX CASINO ENGINE*

Usage:
${prefix}casino slots <amount>
${prefix}casino dice <amount>
${prefix}casino roulette <amount>

_Note: The 'bet' command is now 'casino' to avoid conflicts._
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
                return m.reply("❌ Profile not found. Please register first.");
            }

            if (user.coins < amount) {
                return m.reply("❌ You don't have enough coins to place this bet.");
            }

            // 🔥 SMART LUCK SYSTEM
            // Pulls luck from database (default 50 if null)
            const userLuck = (user.luck || 50) / 100; 
            const luckBonus = (userLuck - 0.5) * 0.2; // Can add/sub up to 10% chance

            let win = false;
            let multiplier = 1;
            let resultText = "";

            // ================= SLOT GAME =================
            if (type === "slots") {
                const symbols = ["💰", "🔥", "🍀", "💎", "👑"];
                const r = () => symbols[Math.floor(Math.random() * symbols.length)];
                
                const a = r(), b = r(), c = r();
                
                // Slots are hard, but luck helps a little
                win = (a === b && b === c) || (Math.random() < luckBonus);
                multiplier = 7; // Higher reward for slots
                resultText = `[ ${a} | ${b} | ${c} ]`;
            }

            // ================= DICE GAME =================
            else if (type === "dice") {
                const roll = Math.floor(Math.random() * 6) + 1;
                const winThreshold = 3 - (luckBonus * 2); // Easier to win if lucky

                win = roll > winThreshold;
                multiplier = 2;
                resultText = `🎲 Rolled: ${roll}`;
            }

            // ================= ROULETTE =================
            else if (type === "roulette") {
                const num = Math.floor(Math.random() * 37); // 0-36 standard
                const isEven = num % 2 === 0 && num !== 0;
                
                win = isEven || (Math.random() < luckBonus);
                multiplier = 1.9;
                resultText = `🎡 Ball landed on: ${num}`;
            }

            else {
                return m.reply("❌ Invalid game type. Choose slots, dice, or roulette.");
            }

            // ================= CALCULATION =================
            const change = win ? Math.floor(amount * (multiplier - 1)) : -amount;
            const newBalance = Math.max(0, user.coins + change);

            // UPDATE DATABASE
            await supabase
                .from("g_users")
                .update({ coins: newBalance })
                .eq("user_id", userId)
                .eq("group_id", groupId);

            // LOG TRANSACTION
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
🎰 *VEX CASINO ENGINE*

🎮 Game: ${type.toUpperCase()}
${resultText}

${win ? ui.win : ui.lose}
💰 Result: ${change > 0 ? "+" : ""}${change} coins
🪙 New Balance: ${newBalance}
            `;

            const { text } = await translate(msg, { to: lang });
            await m.reply(text);

        } catch (e) {
            console.error("CASINO ERROR:", e);
            await m.reply("⚠️ Casino engine encountered a technical fault.");
        }
    }
};
