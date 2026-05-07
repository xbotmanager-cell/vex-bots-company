const translate = require("google-translate-api-x");

// 🔥 VEX GLOBAL QUEUE (ULTRA ANTI-BAN)
const queue = [];
let processing = false;

module.exports = {
    command: "slots",
    alias: ["slot", "spin", "mashine"],
    category: "casino",
    description: "VEX Premium Slot Machine with Frame-Animation",

    async execute(m, sock, ctx) {
        queue.push({ m, sock, ctx });
        processQueue();
    }
};

async function processQueue() {
    if (processing) return;
    processing = true;
    while (queue.length > 0) {
        const { m, sock, ctx } = queue.shift();
        try {
            await runSlot(m, sock, ctx);
            await sleep(2000); 
        } catch (e) {
            console.error("VEX SLOT ERROR:", e);
        }
    }
    processing = false;
}

async function runSlot(m, sock, ctx) {
    const { supabase, userSettings, args, prefix } = ctx;
    const style = userSettings?.style || "harsh";
    const lang = userSettings?.lang || "en";
    const userId = m.sender;
    const groupId = m.chat;

    // 1. DATA VALIDATION
    const bet = parseInt(args[0]) || 100;
    if (bet < 10) return m.reply("☣️ Minimum bet is 10 coins.");

    const { data: user } = await supabase
        .from("g_users")
        .select("*")
        .eq("user_id", userId)
        .eq("group_id", groupId)
        .single();

    if (!user) return m.reply("☣️ You are not in the database. Use " + prefix + "reg");
    if (user.coins < bet) return m.reply("☣️ You're broke! You need " + bet + " coins.");

    // 2. THEMES & BRANDING
    const themes = {
        harsh: {
            bar: "━",
            frame: "☣️",
            start: "🎰 𝕾𝖕𝖎𝖓𝖓𝖎𝖓𝖌 𝖄𝖔𝖚𝖗 𝕯𝖔𝖔𝖒...",
            win: "☣️ 𝕵𝕬𝕮𝕶𝕻𝕺𝕿! 𝖄𝖔𝖚 𝖋𝖚𝖈𝖐𝖎𝖓𝖌 𝖉𝖎𝖉 𝖎𝖙! ☣️",
            lose: "☣️ 𝖂𝕬𝕾𝕿𝕰𝕯! 𝕲𝖎𝖛𝖊 𝖒𝖊 𝖞𝖔𝖚𝖗 𝖈𝖔𝖎𝖓𝖘. ☣️",
            react: "💥"
        },
        girl: {
            bar: "✧",
            frame: "🫧",
            start: "🫧 𝓈𝓅𝒾𝓃𝓃𝒾𝓃𝑔 𝒻𝑜𝓇 𝓁𝓊𝒸𝓀𝓎 𝓅𝓇𝒾𝓃𝒸𝑒𝓈𝓈~",
            win: "💖 𝒥𝒜𝒞𝒦𝒫𝒪𝒯 𝐵𝒜𝐵𝒴! 𝓈𝑜 𝓅𝓇𝑜𝓊𝒹~ 🎀",
            lose: "🥺 𝑜𝒽 𝓃𝑜... 𝓉𝓇𝓎 𝒶𝑔𝒶𝒾𝓃, 𝒹𝑒𝒶𝓇~ 🎀",
            react: "🎀"
        },
        normal: {
            bar: "─",
            frame: "🎰",
            start: "🎰 Rolling the reels...",
            win: "🎉 BIG WIN! Congratulations!",
            lose: "💀 BUSTED! Better luck next time.",
            react: "🎰"
        }
    };

    const ui = themes[style] || themes.normal;
    const items = ["🍒", "🍋", "🍇", "💎", "⭐", "🍎"];

    await sock.sendMessage(m.chat, { react: { text: ui.react, key: m.key } });

    // 3. ANIMATION ENGINE
    let { key } = await sock.sendMessage(m.chat, { text: ui.start });

    let finalResult;
    for (let f = 0; f < 6; f++) {
        const frame = [
            items[Math.floor(Math.random() * items.length)],
            items[Math.floor(Math.random() * items.length)],
            items[Math.floor(Math.random() * items.length)]
        ];
        
        const animText = `
${ui.frame} *VEX CASINO* ${ui.frame}
${ui.bar.repeat(12)}
   🎰 [ ${frame.join(" ┃ ")} ] 🎰
${ui.bar.repeat(12)}
${style === 'harsh' ? '𝖕𝖑𝖊𝖆𝖘𝖊 𝖜𝖆𝖎𝖙...' : '𝓌𝒶𝒾𝓉𝒾𝓃𝑔...'}
        `;
        
        await sock.sendMessage(m.chat, { text: animText, edit: key });
        await sleep(600);
        finalResult = frame;
    }

    // 4. WIN LOGIC
    let winType = "lose";
    let multiplier = 0;

    if (finalResult[0] === finalResult[1] && finalResult[1] === finalResult[2]) {
        winType = "jackpot";
        multiplier = 10; // Triple match
    } else if (finalResult[0] === finalResult[1] || finalResult[1] === finalResult[2] || finalResult[0] === finalResult[2]) {
        winType = "match";
        multiplier = 3; // Double match
    }

    const reward = bet * multiplier;
    const newCoins = user.coins - bet + reward;

    // 5. UPDATE DATABASE
    await supabase.from("g_users").update({ coins: newCoins }).eq("user_id", userId).eq("group_id", groupId);
    await supabase.from("g_bets").insert({
        user_id: userId,
        group_id: groupId,
        amount: bet,
        outcome: winType === "lose" ? "lose" : "win",
        profit: reward - bet
    });

    // 6. FINAL BRANDED OUTPUT
    const status = winType !== "lose" ? ui.win : ui.lose;
    const finalDisplay = `
${ui.frame} *VEX CASINO* ${ui.frame}
${ui.bar.repeat(12)}
   🎰 [ ${finalResult.join(" ┃ ")} ] 🎰
${ui.bar.repeat(12)}

${status}

💰 *Bet:* ${bet}
💵 *Reward:* ${reward}
💳 *New Balance:* ${newCoins}

_${style === 'harsh' ? '𝖉𝖔𝖓\'𝖙 𝖈𝖗𝖞, 𝖕𝖑𝖆𝖞 𝖆𝖌𝖆𝖎𝖓.' : '𝑔𝑜𝑜𝒹 𝓁𝓊𝒸𝓀 𝓃𝑒𝓍𝓉 𝓉𝒾𝓂𝑒~'}_
    `;

    const { text: translatedFinal } = await translate(finalDisplay, { to: lang });
    await sock.sendMessage(m.chat, { text: translatedFinal, edit: key });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
