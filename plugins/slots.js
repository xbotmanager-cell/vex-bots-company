const translate = require("google-translate-api-x");

// 🔥 GLOBAL QUEUE (ANTI BAN)
const queue = [];
let processing = false;

module.exports = {
    command: "slots",
    alias: ["slot", "spin"],
    category: "casino",
    description: "Real slot machine with animation",

    async execute(m, sock, ctx) {
        queue.push({ m, sock, ctx });
        processQueue();
    }
};

// ================= QUEUE ENGINE =================
async function processQueue() {
    if (processing) return;
    processing = true;

    while (queue.length > 0) {
        const { m, sock, ctx } = queue.shift();

        try {
            await runSlot(m, sock, ctx);
            await sleep(1500); // 🔥 anti-ban delay
        } catch (e) {
            console.error("SLOT ERROR:", e);
        }
    }

    processing = false;
}

// ================= MAIN SLOT LOGIC =================
async function runSlot(m, sock, ctx) {
    const { supabase, userSettings } = ctx;

    const style = userSettings?.style || "harsh";
    const lang = userSettings?.lang || "en";

    const userId = m.sender;
    const groupId = m.chat;

    const modes = {
        harsh: {
            start: "☣️ 𝕾𝖕𝖎𝖓𝖓𝖎𝖓𝖌 𝖞𝖔𝖚𝖗 𝖋𝖆𝖙𝖊... ☣️",
            win: "☣️ 𝕵𝖆𝖈𝖐𝖕𝖔𝖙 ☣️",
            lose: "☣️ 𝖄𝖔𝖚 𝖑𝖔𝖘𝖙 ☣️",
            react: "🎰"
        },
        normal: {
            start: "🎰 Spinning...",
            win: "🎉 You Win!",
            lose: "💀 You Lost!",
            react: "🎰"
        },
        girl: {
            start: "🫧 spinning for you~",
            win: "💖 jackpot baby~",
            lose: "🥺 try again~",
            react: "🎀"
        }
    };

    const ui = modes[style] || modes.normal;

    await sock.sendMessage(m.chat, {
        react: { text: ui.react, key: m.key }
    });

    // ================= GET USER =================
    const { data: user } = await supabase
        .from("g_users")
        .select("*")
        .eq("user_id", userId)
        .eq("group_id", groupId)
        .single();

    if (!user) {
        return m.reply("❌ Register first");
    }

    const bet = 100;

    if (user.coins < bet) {
        return m.reply("❌ Not enough coins");
    }

    // ================= SLOT ITEMS =================
    const items = ["🍒", "🍋", "🍉", "⭐", "💎"];

    const spin = () => [
        items[Math.floor(Math.random() * items.length)],
        items[Math.floor(Math.random() * items.length)],
        items[Math.floor(Math.random() * items.length)]
    ];

    // ================= SPIN ANIMATION =================
    let msg = await sock.sendMessage(m.chat, {
        text: ui.start
    }, { quoted: m });

    let result;

    for (let i = 0; i < 5; i++) {
        const temp = spin();

        await sock.sendMessage(m.chat, {
            text: `🎰 [ ${temp.join(" | ")} ]`,
            edit: msg.key
        });

        await sleep(500);
        result = temp;
    }

    // ================= RESULT =================
    let win = false;
    let reward = 0;

    if (result[0] === result[1] && result[1] === result[2]) {
        win = true;
        reward = bet * 5;
    } else if (result[0] === result[1] || result[1] === result[2]) {
        win = true;
        reward = bet * 2;
    }

    // ================= UPDATE DB =================
    let newCoins = user.coins - bet;

    if (win) {
        newCoins += reward;
    }

    await supabase
        .from("g_users")
        .update({ coins: newCoins })
        .eq("user_id", userId)
        .eq("group_id", groupId);

    await supabase.from("g_bets").insert({
        user_id: userId,
        group_id: groupId,
        amount: bet,
        multiplier: win ? reward / bet : 0,
        result: win ? "win" : "lose"
    });

    // ================= FINAL MESSAGE =================
    let finalText = `
🎰 [ ${result.join(" | ")} ]

${win ? ui.win : ui.lose}

💰 Balance: ${newCoins}
    `;

    const { text } = await translate(finalText, { to: lang });

    await sock.sendMessage(m.chat, {
        text,
        edit: msg.key
    });
}

// ================= UTIL =================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
