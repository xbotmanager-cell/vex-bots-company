const crypto = require('crypto');

// 🔥 VEX GLOBAL QUEUE (ANTI-BAN)
const queue = [];
let processing = false;

// 🎡 GAME STATE - In-Memory Only
const games = new Map(); // chatId -> game state
const playerStats = new Map(); // userId -> {wins, losses, totalSpins}

module.exports = {
    command: "wheel",
    category: "casino",
    description: "VEX Premium Wheel of Fortune - Spin for missions, rewards & punishments",

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
            await runWheel(m, sock, ctx);
            await sleep(2000); // Anti-ban delay
        } catch (e) {
            console.error("VEX WHEEL ERROR:", e);
        }
    }
    processing = false;
}

async function runWheel(m, sock, ctx) {
    const { userSettings, args } = ctx;
    const style = userSettings?.style || "harsh";
    const chatId = m.chat;
    const userId = m.sender;
    const userName = m.pushName || userId.split('@')[0];

    const action = args[0]?.toLowerCase();

    // =========================
    // 1. SPIN WHEEL
    // =========================
    if (!action || action === 'spin') {
        if (games.has(chatId)) {
            const game = games.get(chatId);
            const timeLeft = Math.ceil((game.cooldownEnd - Date.now()) / 1000);
            if (timeLeft > 0) {
                return m.reply(`⏳ Wheel cooling down... ${timeLeft}s left\n\nNext spinner: @${game.nextPlayer.split('@')[0]}`, {
                    mentions: [game.nextPlayer]
                });
            }
        }

        await spinWheel(m, sock, style, chatId, userId, userName);
        return;
    }

    // =========================
    // 2. STATS
    // =========================
    if (action === 'stats' || action === 'me') {
        const stats = playerStats.get(userId) || { wins: 0, losses: 0, totalSpins: 0, missions: 0 };
        const winRate = stats.totalSpins > 0? ((stats.wins / stats.totalSpins) * 100).toFixed(1) : 0;

        return sock.sendMessage(chatId, {
            text: `🎡 *WHEEL STATS*\n━━━━━━━━━━━━━━\n\n👤 Player: ${userName}\n🎯 Total Spins: ${stats.totalSpins}\n🏆 Wins: ${stats.wins}\n💀 Losses: ${stats.losses}\n📊 Win Rate: ${winRate}%\n✅ Missions Completed: ${stats.missions}\n\n_${getRank(stats.wins)}_`,
            mentions: [userId]
        });
    }

    // =========================
    // 3. LEADERBOARD
    // =========================
    if (action === 'top' || action === 'leaderboard') {
        const sorted = Array.from(playerStats.entries())
           .sort((a, b) => b[1].wins - a[1].wins)
           .slice(0, 10);

        if (sorted.length === 0) {
            return m.reply("📊 No wheel champions yet. Be the first! Spin with.wheel");
        }

        const leaderboard = await Promise.all(sorted.map(async ([id, stats], i) => {
            const name = await sock.getName(id) || id.split('@')[0];
            const medal = i === 0? '🥇' : i === 1? '🥈' : i === 2? '🥉' : `${i + 1}.`;
            return `${medal} ${name} - ${stats.wins} wins`;
        }));

        return sock.sendMessage(chatId, {
            text: `🏆 *WHEEL LEADERBOARD*\n━━━━━━━━━━━━━━\n\n${leaderboard.join('\n')}\n\n━━━━━━━━━━━━━━\nSpin to climb the ranks!`,
        });
    }

    // Default: Show help
    return m.reply(`🎡 *VEX WHEEL OF FORTUNE*\n━━━━━━━━━━━━━━\n\n.wheel - Spin the wheel\n.wheel stats - Your stats\n.wheel top - Leaderboard\n\n*Rewards:* 👑💎🎁💰\n*Punishments:* 💀🤡😂⏰\n\nSpin to win!`);
}

// =========================
// SPIN ENGINE
// =========================
async function spinWheel(m, sock, style, chatId, userId, userName) {
    const themes = getTheme(style);

    await sock.sendMessage(m.chat, { react: { text: themes.react, key: m.key } });

    // WHEEL SEGMENTS - 16 options
    const wheelSegments = [
        // REWARDS
        { emoji: '👑', name: 'CROWN', type: 'reward', msg: 'You are the king! Everyone must praise you for 2 minutes', points: 50 },
        { emoji: '💎', name: 'DIAMOND', type: 'reward', msg: 'Rare gem! You earned 24h immunity from roasts', points: 40 },
        { emoji: '🎁', name: 'GIFT', type: 'reward', msg: 'Bot will compliment you 3 times today', points: 30 },
        { emoji: '💰', name: 'JACKPOT', type: 'reward', msg: 'You won! Choose someone to do a dare', points: 60 },
        { emoji: '⭐', name: 'STAR', type: 'reward', msg: 'VIP status! Your next 3 messages get auto-reactions', points: 25 },
        { emoji: '🏆', name: 'TROPHY', type: 'reward', msg: 'Champion! Change group name for 1 hour', points: 45 },

        // NEUTRAL
        { emoji: '😎', name: 'COOL', type: 'neutral', msg: 'You are cool. Nothing happens. Flex on them', points: 10 },
        { emoji: '🎭', name: 'JOKER', type: 'neutral', msg: 'Tell a joke or you owe the group a meme', points: 5 },

        // PUNISHMENTS
        { emoji: '💀', name: 'SKULL', type: 'punishment', msg: 'You should mute yourself for 1 minute 😏', points: -20 },
        { emoji: '🤡', name: 'CLOWN', type: 'punishment', msg: 'Change your DP to a clown for 5 minutes', points: -15 },
        { emoji: '😂', name: 'LAUGH', type: 'punishment', msg: 'Send "I am a clown" in the group', points: -10 },
        { emoji: '⏰', name: 'CLOCK', type: 'punishment', msg: 'Do 10 pushups and send proof or forfeit', points: -25 },
        { emoji: '🍕', name: 'PIZZA', type: 'punishment', msg: 'You owe everyone a virtual pizza. Describe it', points: -5 },
        { emoji: '🔇', name: 'MUTE', type: 'punishment', msg: 'No texting for 2 minutes. React only 😏', points: -30 },
        { emoji: '🎪', name: 'CIRCUS', type: 'punishment', msg: 'Send a voice note singing anything', points: -20 },
        { emoji: '🥊', name: 'BOXING', type: 'punishment', msg: 'Challenge someone to.roule duel or you lose', points: -15 }
    ];

    // =========================
    // ANIMATION ENGINE - 8 FRAMES
    // =========================
    let { key } = await sock.sendMessage(chatId, {
        text: `${themes.spinning}\n━━━━━━━━━━━━━━\n\n🎡 Spinning...`
    });

    let finalSegment;
    for (let f = 0; f < 8; f++) {
        const randomSegment = wheelSegments[Math.floor(Math.random() * wheelSegments.length)];

        const animText = `
${themes.frame} *VEX WHEEL* ${themes.frame}
━━━━━━━━━━━━━━

      🎡 ${randomSegment.emoji} ${randomSegment.name} ${randomSegment.emoji} 🎡

━━━━━━━━━━━━━━
${style === 'harsh'? '𝕊𝕡𝕚𝕟𝕚𝕟𝕘...' : 'Spinning...'}
        `;

        await sock.sendMessage(chatId, { text: animText, edit: key });
        await sleep(700 + (f * 100)); // Slow down effect
        finalSegment = randomSegment;
    }

    // =========================
    // RESULT CALCULATION
    // =========================
    const isWin = finalSegment.type === 'reward';
    const isNeutral = finalSegment.type === 'neutral';

    // Update stats
    if (!playerStats.has(userId)) {
        playerStats.set(userId, { wins: 0, losses: 0, totalSpins: 0, missions: 0 });
    }
    const stats = playerStats.get(userId);
    stats.totalSpins++;

    if (isWin) {
        stats.wins++;
        stats.missions++;
    } else if (!isNeutral) {
        stats.losses++;
    }

    // Set cooldown
    games.set(chatId, {
        cooldownEnd: Date.now() + 10000, // 10s cooldown
        nextPlayer: userId,
        lastSpin: finalSegment
    });

    // =========================
    // FINAL DISPLAY
    // =========================
    const resultEmoji = isWin? '🎉' : isNeutral? '😐' : '💀';
    const resultText = isWin? themes.win : isNeutral? themes.neutral : themes.lose;

    const finalDisplay = `
${themes.frame} *VEX WHEEL* ${themes.frame}
━━━━━━━━━━━━━━

      🎡 ${finalSegment.emoji} ${finalSegment.name} ${finalSegment.emoji} 🎡

━━━━━━━━━━━━━━

${resultEmoji} *RESULT:* ${resultText}

👤 *Player:* ${userName}
🎯 *Landed:* ${finalSegment.emoji} ${finalSegment.name}
💬 *Action:* ${finalSegment.msg}
📊 *Points:* ${finalSegment.points > 0? '+' : ''}${finalSegment.points}

━━━━━━━━━━━━━━

📈 *YOUR STATS:*
🏆 Wins: ${stats.wins} | 💀 Losses: ${stats.losses}
🎯 Win Rate: ${((stats.wins / stats.totalSpins) * 100).toFixed(1)}%

━━━━━━━━━━━━━━
_${style === 'harsh'? '𝕊ℙ𝕀ℕ 𝔸𝔾𝔸𝕀ℕ 𝕀𝔽 𝕐𝕆𝕌 𝔻𝔸ℝ𝔼' : 'Spin again in 10s'}_
    `;

    await sock.sendMessage(chatId, {
        text: finalDisplay,
        edit: key,
        mentions: [userId]
    });

    // Send reminder for punishments
    if (finalSegment.type === 'punishment') {
        setTimeout(async () => {
            await sock.sendMessage(chatId, {
                text: `⏰ *REMINDER*\n\n@${userId.split('@')[0]}, you landed ${finalSegment.emoji} ${finalSegment.name}\n\n📋 Mission: ${finalSegment.msg}\n\n_Complete it or you're a coward 😏_`,
                mentions: [userId]
            });
        }, 3000);
    }
}

function getTheme(style) {
    const themes = {
        harsh: {
            frame: "☣️",
            spinning: "🎡 𝕊ℙ𝕀ℕℕ𝕀ℕ𝔾 𝕋ℍ𝔼 𝕎ℍ𝔼𝔼𝕃 𝕆𝔽 𝔻𝕆𝕄...",
            win: "👑 𝕍𝕀ℂ𝕋𝕆ℝ𝕐! 𝕋ℍ𝔼 𝕎ℍ𝔼𝔼𝕃 𝔹𝕆𝕎𝕊 𝕋𝕆 𝕐𝕆𝕌",
            lose: "💀 ℙ𝕌ℕ𝕀𝕊ℍ𝕄𝔼ℕ𝕋! 𝔸ℂℂ𝔼ℙ𝕋 𝕐𝕆𝕌ℝ 𝔽𝔸𝕋𝔼",
            neutral: "😐 ℕ𝔼𝕌𝕋ℝ𝔸𝕃. 𝔹𝕆ℝ𝕀ℕ𝔾.",
            react: "🎡"
        },
        girl: {
            frame: "🫧",
            spinning: "🎡 𝓈𝓅𝒾𝓃𝒾𝓃𝑔 𝓉𝒽𝑒 𝓌𝒽𝑒𝑒𝓁~",
            win: "🎉 𝓎𝒶𝓎! 𝓎𝑜𝓊 𝓌𝑜𝓃 𝓅𝓇𝒾𝓃𝒸𝑒𝓈𝓈~ 👑",
            lose: "🥺 𝑜𝒽 𝓃𝑜... 𝓅𝓊𝓃𝒾𝓈𝒽𝓂𝑒𝓃𝓉 𝓉𝒾𝓂𝑒~ 💀",
            neutral: "😐 𝓃𝑜𝓉𝒽𝒾𝓃𝑔 𝒽𝒶𝓅𝑒𝓃𝑒𝒹~",
            react: "🎀"
        },
        normal: {
            frame: "🎡",
            spinning: "🎡 Spinning the wheel...",
            win: "🎉 WINNER! You got a reward!",
            lose: "💀 PUNISHMENT! Complete the mission",
            neutral: "😐 NEUTRAL. Nothing happens",
            react: "🎡"
        }
    };
    return themes[style] || themes.normal;
}

function getRank(wins) {
    if (wins >= 100) return "Wheel God 👑";
    if (wins >= 50) return "Wheel Master 🏆";
    if (wins >= 25) return "Wheel Pro ⭐";
    if (wins >= 10) return "Wheel Expert 🎯";
    if (wins >= 5) return "Wheel Rookie 🎲";
    return "Wheel Newbie 🥉";
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
