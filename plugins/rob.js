const translate = require("google-translate-api-x");

// 🔥 GLOBAL QUEUE (ANTI BAN)
const queue = [];
let processing = false;

// 🔥 COOLDOWN MEMORY
const robCooldown = new Map();

module.exports = {
    command: "rob",
    alias: ["steal", "heist"],
    category: "crime",
    description: "Advanced rob system with AI logic",

    async execute(m, sock, ctx) {
        queue.push({ m, sock, ctx });
        processQueue();
    }
};

// ================= QUEUE =================
async function processQueue() {
    if (processing) return;
    processing = true;

    while (queue.length > 0) {
        const job = queue.shift();
        try {
            await runRob(job.m, job.sock, job.ctx);
            await sleep(1500);
        } catch (e) {
            console.error("ROB ERROR:", e);
        }
    }

    processing = false;
}

// ================= MAIN LOGIC =================
async function runRob(m, sock, ctx) {
    const { supabase, userSettings } = ctx;

    const style = userSettings?.style || "harsh";
    const lang = userSettings?.lang || "en";

    const userId = m.sender;
    const groupId = m.chat;
    const targetUser = m.mentionedJid?.[0];

    const modes = {
        harsh: {
            win: "☣️ 𝕽𝖔𝖇 𝕾𝖚𝖈𝖈𝖊𝖘𝖘 ☣️",
            lose: "☣️ 𝕽𝖔𝖇 𝕱𝖆𝖎𝖑𝖊𝖉 ☣️",
            jail: "☣️ 𝕮𝖆𝖚𝖌𝖍𝖙 𝖇𝖞 𝕻𝖔𝖑𝖎𝖈𝖊 ☣️",
            react: "💀"
        },
        normal: {
            win: "💰 Rob Success!",
            lose: "❌ Rob Failed!",
            jail: "🚔 You got caught!",
            react: "🕵️"
        },
        girl: {
            win: "💖 you stole it~",
            lose: "🥺 failed baby~",
            jail: "🚔 oh no you got caught~",
            react: "🎀"
        }
    };

    const ui = modes[style] || modes.normal;

    if (!targetUser) {
        return m.reply("❌ Tag someone to rob");
    }

    if (targetUser === userId) {
        return m.reply("❌ You can't rob yourself");
    }

    // ================= COOLDOWN =================
    const now = Date.now();
    const cd = robCooldown.get(userId) || 0;

    if (now - cd < 20000) {
        const remaining = Math.floor((20000 - (now - cd)) / 1000);
        return m.reply(`⏳ Wait ${remaining}s`);
    }

    robCooldown.set(userId, now);

    await sock.sendMessage(m.chat, {
        react: { text: ui.react, key: m.key }
    });

    // ================= FETCH USERS =================
    const { data: attacker } = await supabase
        .from("g_users")
        .select("*")
        .eq("user_id", userId)
        .eq("group_id", groupId)
        .single();

    const { data: victim } = await supabase
        .from("g_users")
        .select("*")
        .eq("user_id", targetUser)
        .eq("group_id", groupId)
        .single();

    if (!attacker || !victim) {
        return m.reply("❌ Both users must be registered");
    }

    if (victim.coins < 50) {
        return m.reply("❌ Target too poor");
    }

    // ================= AI LOGIC =================
    const luckFactor = attacker.luck / 100;
    const victimLuck = victim.luck / 100;

    const baseChance = 0.5;

    const successChance = baseChance + (luckFactor * 0.3) - (victimLuck * 0.3);

    const policeChance = 0.2 + (victimLuck * 0.2);
    const trapChance = 0.15;

    const roll = Math.random();

    let result = "";
    let amount = 0;

    // ================= POLICE =================
    if (roll < policeChance) {
        const fine = Math.floor(attacker.coins * 0.2);

        await supabase
            .from("g_users")
            .update({
                coins: Math.max(0, attacker.coins - fine)
            })
            .eq("user_id", userId)
            .eq("group_id", groupId);

        result = `${ui.jail}\n\n💸 Fine: ${fine}`;
    }

    // ================= TRAP =================
    else if (roll < policeChance + trapChance) {
        const loss = Math.floor(attacker.coins * 0.15);

        await supabase
            .from("g_users")
            .update({
                coins: Math.max(0, attacker.coins - loss)
            })
            .eq("user_id", userId)
            .eq("group_id", groupId);

        result = `💣 TRAP!\n\n💸 Lost: ${loss}`;
    }

    // ================= SUCCESS =================
    else if (roll < successChance) {
        amount = Math.floor(victim.coins * (Math.random() * 0.3 + 0.1));

        await supabase
            .from("g_users")
            .update({ coins: attacker.coins + amount })
            .eq("user_id", userId)
            .eq("group_id", groupId);

        await supabase
            .from("g_users")
            .update({ coins: victim.coins - amount })
            .eq("user_id", targetUser)
            .eq("group_id", groupId);

        result = `${ui.win}\n\n💰 Stolen: ${amount}`;
    }

    // ================= FAIL =================
    else {
        const loss = Math.floor(attacker.coins * 0.1);

        await supabase
            .from("g_users")
            .update({
                coins: attacker.coins - loss
            })
            .eq("user_id", userId)
            .eq("group_id", groupId);

        result = `${ui.lose}\n\n💸 Lost: ${loss}`;
    }

    // ================= LOG =================
    await supabase.from("g_transactions").insert({
        user_id: userId,
        group_id: groupId,
        type: "rob",
        amount: amount,
        status: result.includes("Success") ? "win" : "fail"
    });

    // ================= FINAL =================
    let msg = `
🕵️ *ROB SYSTEM V2*

👤 @${userId.split("@")[0]}
🎯 Target: @${targetUser.split("@")[0]}

${result}
    `;

    const { text } = await translate(msg, { to: lang });

    await sock.sendMessage(m.chat, {
        text,
        mentions: [userId, targetUser]
    });
}

// ================= UTIL =================
function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
