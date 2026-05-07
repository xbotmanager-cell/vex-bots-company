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
            // Dynamic sleep to avoid rate limits
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

    // 🔥 SMART TARGET DETECTION
    // Detects target from mentions OR quoted message
    const targetUser = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);

    const modes = {
        harsh: {
            win: "☣️ 𝕽𝖔𝖇 𝕾𝖚𝖈𝖈𝖊𝖘𝖘 ☣️",
            lose: "☣️ 𝕽𝖔𝖇 𝕱𝖆𝖎𝖑𝖊𝖉 ☣️",
            jail: "☣️ 𝕮𝖆𝖚𝖍𝖙 𝖇𝖞 𝕻𝖔𝖑𝖎𝖈𝖊 ☣️",
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
        return m.reply("❌ Tag someone or reply to their message to rob them.");
    }

    if (targetUser === userId) {
        return m.reply("❌ Don't be a fool, you can't rob yourself.");
    }

    // ================= COOLDOWN =================
    const now = Date.now();
    const cd = robCooldown.get(userId) || 0;
    const COOLDOWN_TIME = 30000; // Increased to 30s for realism

    if (now - cd < COOLDOWN_TIME) {
        const remaining = Math.floor((COOLDOWN_TIME - (now - cd)) / 1000);
        return m.reply(`⏳ Chill out! You're under heat. Wait ${remaining}s`);
    }

    robCooldown.set(userId, now);

    await sock.sendMessage(m.chat, {
        react: { text: ui.react, key: m.key }
    });

    // ================= FETCH USERS (PARALLEL) =================
    const [{ data: attacker }, { data: victim }] = await Promise.all([
        supabase.from("g_users").select("*").eq("user_id", userId).eq("group_id", groupId).single(),
        supabase.from("g_users").select("*").eq("user_id", targetUser).eq("group_id", groupId).single()
    ]);

    if (!attacker || !victim) {
        return m.reply("❌ One of the users is not registered in the VEX database.");
    }

    if (victim.coins < 100) {
        return m.reply("❌ This target is struggling. Leave some crumbs for the poor.");
    }

    // ================= AI LUCK LOGIC =================
    const attackerLuck = (attacker.luck || 50) / 100;
    const victimLuck = (victim.luck || 50) / 100;

    // Base Success: 45%. Luck can swing it by ±20%
    const successChance = 0.45 + (attackerLuck * 0.2) - (victimLuck * 0.2);
    const policeChance = 0.15 + (victimLuck * 0.15); // Higher victim luck = higher police chance
    
    const roll = Math.random();
    let resultMessage = "";
    let finalAmount = 0;
    let status = "fail";

    // ================= BRANCHING LOGIC =================
    if (roll < policeChance) {
        // CASE: POLICE ARREST
        const fine = Math.floor(attacker.coins * 0.25);
        await updateCoins(supabase, userId, groupId, -fine);
        resultMessage = `${ui.jail}\n\n💸 Police Fine: -${fine} coins`;
    } 
    else if (roll < successChance) {
        // CASE: SUCCESSFUL HEIST
        finalAmount = Math.floor(victim.coins * (Math.random() * 0.25 + 0.05));
        
        await Promise.all([
            updateCoins(supabase, userId, groupId, finalAmount),
            updateCoins(supabase, targetUser, groupId, -finalAmount)
        ]);

        resultMessage = `${ui.win}\n\n💰 Loot: +${finalAmount} coins`;
        status = "win";
    } 
    else {
        // CASE: JUST FAILED
        const penalty = Math.floor(attacker.coins * 0.1);
        await updateCoins(supabase, userId, groupId, -penalty);
        resultMessage = `${ui.lose}\n\n💸 Escape cost: -${penalty} coins`;
    }

    // ================= LOGGING & UI =================
    await supabase.from("g_transactions").insert({
        user_id: userId,
        group_id: groupId,
        type: "rob",
        amount: finalAmount,
        status: status
    });

    let rawMsg = `
🕵️ *VEX HEIST LOG*

👤 Attacker: @${userId.split("@")[0]}
🎯 Target: @${targetUser.split("@")[0]}

${resultMessage}
    `;

    const { text } = await translate(rawMsg, { to: lang });

    await sock.sendMessage(m.chat, {
        text,
        mentions: [userId, targetUser]
    });
}

// ================= HELPERS =================
async function updateCoins(supabase, uid, gid, change) {
    const { data } = await supabase.from("g_users").select("coins").eq("user_id", uid).eq("group_id", gid).single();
    const newBalance = Math.max(0, (data?.coins || 0) + change);
    return supabase.from("g_users").update({ coins: newBalance }).eq("user_id", uid).eq("group_id", gid);
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
