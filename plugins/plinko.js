const crypto = require('crypto');

// 🔥 VEX GLOBAL QUEUE (EXTREME ANTI-BAN)
const queue = [];
let processing = false;

// 🎯 GAME STATE - In-Memory Only
const games = new Map(); // chatId -> game state
const playerStats = new Map(); // userId -> {plays, wins, bestSlot, totalDrops}

module.exports = {
    command: "plinko",
    category: "casino",
    description: "VEX Premium Plinko - Live physics ball drop with animated board",

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
            await runPlinko(m, sock, ctx);
            await sleep(2500); // Extreme anti-ban delay
        } catch (e) {
            console.error("VEX PLINKO ERROR:", e);
        }
    }
    processing = false;
}

async function runPlinko(m, sock, ctx) {
    const { userSettings, args } = ctx;
    const style = userSettings?.style || "harsh";
    const chatId = m.chat;
    const userId = m.sender;
    const userName = m.pushName || userId.split('@')[0];

    const action = args[0]?.toLowerCase();

    // =========================
    // 1. DROP BALL
    // =========================
    if (!action || action === 'drop' || action === 'play') {
        if (games.has(chatId)) {
            const game = games.get(chatId);
            const timeLeft = Math.ceil((game.cooldownEnd - Date.now()) / 1000);
            if (timeLeft > 0) {
                return m.reply(`⏳ Plinko board resetting... ${timeLeft}s left\n\nLast drop: @${game.lastPlayer.split('@')[0]} landed ${game.lastSlot.emoji}`, {
                    mentions: [game.lastPlayer]
                });
            }
        }

        await dropPlinko(m, sock, style, chatId, userId, userName);
        return;
    }

    // =========================
    // 2. STATS
    // =========================
    if (action === 'stats' || action === 'me') {
        const stats = playerStats.get(userId) || { plays: 0, wins: 0, bestSlot: 'NONE', totalDrops: 0 };
        const winRate = stats.plays > 0? ((stats.wins / stats.plays) * 100).toFixed(1) : 0;

        return sock.sendMessage(chatId, {
            text: `🎯 *PLINKO STATS*\n━━━━━━━━━━━━━━\n\n👤 Player: ${userName}\n🔴 Total Drops: ${stats.plays}\n💰 Wins: ${stats.wins}\n💀 Losses: ${stats.plays - stats.wins}\n📊 Win Rate: ${winRate}%\n🏆 Best Slot: ${stats.bestSlot}\n\n_${getPlinkoRank(stats.wins)}_`,
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
            return m.reply("📊 No Plinko champions yet. Be the first! Drop with.plinko");
        }

        const leaderboard = await Promise.all(sorted.map(async ([id, stats], i) => {
            const name = await sock.getName(id) || id.split('@')[0];
            const medal = i === 0? '🥇' : i === 1? '🥈' : i === 2? '🥉' : `${i + 1}.`;
            return `${medal} ${name} - ${stats.wins} wins`;
        }));

        return sock.sendMessage(chatId, {
            text: `🏆 *PLINKO LEADERBOARD*\n━━━━━━━━━━━━━━\n\n${leaderboard.join('\n')}\n\n━━━━━━━━━━━━━━\nDrop to climb ranks!`,
        });
    }

    // Default: Show help
    return m.reply(`🎯 *VEX PLINKO*\n━━━━━━━━━━━━━━\n\n.plinko - Drop the ball\n.plinko stats - Your stats\n.plinko top - Leaderboard\n\n*Slots:* 💀 🤡 😎 👑 💰\n\nDrop and win bragging rights!`);
}

// =========================
// PLINKO PHYSICS ENGINE
// =========================
async function dropPlinko(m, sock, style, chatId, userId, userName) {
    const themes = getTheme(style);

    await sock.sendMessage(m.chat, { react: { text: themes.react, key: m.key } });

    // PLINKO SLOTS - 5 slots with multipliers
    const slots = [
        { emoji: '💀', name: 'DEATH', type: 'loss', msg: 'Plinko gods hate you. You lost.', multiplier: 0 },
        { emoji: '🤡', name: 'CLOWN', type: 'loss', msg: 'Clown energy! You owe the group a joke.', multiplier: 0.5 },
        { emoji: '😎', name: 'COOL', type: 'neutral', msg: 'You are cool. Nothing happens.', multiplier: 1 },
        { emoji: '👑', name: 'KING', type: 'win', msg: 'ROYALTY! Everyone must call you King for 5min', multiplier: 3 },
        { emoji: '💰', name: 'JACKPOT', type: 'win', msg: 'JACKPOT! You won bragging rights for 24h', multiplier: 5 }
    ];

    // =========================
    // 6 FRAME ANIMATION - PHYSICS SIMULATION
    // =========================
    let { key } = await sock.sendMessage(chatId, {
        text: `${themes.dropping}\n━━━━━━━━━━━━━━\n\n🔴\n⚪ ⚪ ⚪\n⚪ ⚪ ⚪ ⚪\n⚪ ⚪ ⚪ ⚪ ⚪\n💀 🤡 😎 👑 💰`
    });

    // Simulate ball path with bounce physics
    const path = generateBallPath();
    let finalSlot;

    for (let f = 0; f < 6; f++) {
        const frame = path[f];
        const board = renderBoard(frame.row, frame.col, frame.ball);

        const animText = `
${themes.frame} *VEX PLINKO* ${themes.frame}
━━━━━━━━━━━━━━

${board}

━━━━━━━━━━━━━━
${style === 'harsh'? '𝔻𝕣𝕠𝕡𝕚𝕟𝕘...' : 'Dropping...'}
        `;

        await sock.sendMessage(chatId, { text: animText, edit: key });
        await sleep(800 + (f * 150)); // Slow down as it falls

        if (f === 5) {
            finalSlot = slots[frame.col];
        }
    }

    // =========================
    // RESULT CALCULATION
    // =========================
    const isWin = finalSlot.type === 'win';
    const isNeutral = finalSlot.type === 'neutral';

    // Update stats
    if (!playerStats.has(userId)) {
        playerStats.set(userId, { plays: 0, wins: 0, bestSlot: 'NONE', totalDrops: 0 });
    }
    const stats = playerStats.get(userId);
    stats.plays++;
    stats.totalDrops++;

    if (isWin) {
        stats.wins++;
        if (finalSlot.multiplier > (stats.bestMultiplier || 0)) {
            stats.bestSlot = `${finalSlot.emoji} ${finalSlot.name}`;
            stats.bestMultiplier = finalSlot.multiplier;
        }
    }

    // Set cooldown
    games.set(chatId, {
        cooldownEnd: Date.now() + 12000, // 12s cooldown
        lastPlayer: userId,
        lastSlot: finalSlot
    });

    // =========================
    // FINAL DISPLAY
    // =========================
    const resultEmoji = isWin? '🎉' : isNeutral? '😐' : '💀';
    const resultText = isWin? themes.win : isNeutral? themes.neutral : themes.lose;

    const finalDisplay = `
${themes.frame} *VEX PLINKO* ${themes.frame}
━━━━━━━━━━━━━━

⚪ ⚪ ⚪ ⚪ ⚪
 ⚪ ⚪ ⚪ ⚪
  ⚪ ⚪ ⚪
   ⚪ ⚪
    ${finalSlot.emoji}

💀 🤡 😎 👑 💰

━━━━━━━━━━━━━━

${resultEmoji} *RESULT:* ${resultText}

👤 *Player:* ${userName}
🎯 *Landed:* ${finalSlot.emoji} ${finalSlot.name}
💬 *Verdict:* ${finalSlot.msg}
📊 *Multiplier:* ${finalSlot.multiplier}x

━━━━━━━━━━━━━━

📈 *YOUR STATS:*
🔴 Drops: ${stats.plays} | 💰 Wins: ${stats.wins}
📊 Win Rate: ${((stats.wins / stats.plays) * 100).toFixed(1)}%

━━━━━━━━━━━━━━
_${style === 'harsh'? '𝔻ℝ𝕆ℙ 𝔸𝔾𝔸𝕀ℕ 𝕀𝔽 𝕐𝕆𝕌 𝔻𝔸ℝ𝔼' : 'Drop again in 12s'}_
    `;

    await sock.sendMessage(chatId, {
        text: finalDisplay,
        edit: key,
        mentions: [userId]
    });

    // Send special message for jackpot
    if (finalSlot.name === 'JACKPOT') {
        setTimeout(async () => {
            await sock.sendMessage(chatId, {
                text: `🎉 *JACKPOT ALERT* 🎉\n\n@${userId.split('@')[0]} just hit 💰 JACKPOT!\n\n👑 They have bragging rights for 24 hours!\n\nBow down to the Plinko God 😎`,
                mentions: [userId]
            });
        }, 2000);
    }
}

// =========================
// PHYSICS SIMULATION
// =========================
function generateBallPath() {
    const path = [];
    let col = 2; // Start center

    // Row 0 - Top
    path.push({ row: 0, col: 2, ball: '🔴' });

    // Row 1 - Bounce left or right
    col += Math.random() > 0.5? 1 : -1;
    col = Math.max(0, Math.min(4, col));
    path.push({ row: 1, col: col, ball: '🔴' });

    // Row 2
    col += Math.random() > 0.5? 1 : -1;
    col = Math.max(0, Math.min(4, col));
    path.push({ row: 2, col: col, ball: '🔴' });

    // Row 3
    col += Math.random() > 0.5? 1 : -1;
    col = Math.max(0, Math.min(4, col));
    path.push({ row: 3, col: col, ball: '🔴' });

    // Row 4
    col += Math.random() > 0.5? 1 : -1;
    col = Math.max(0, Math.min(4, col));
    path.push({ row: 4, col: col, ball: '🔴' });

    // Row 5 - Final slot
    path.push({ row: 5, col: col, ball: '🔴' });

    return path;
}

function renderBoard(ballRow, ballCol, ballEmoji) {
    const rows = [
        ['⚪', '⚪', '⚪'],
        ['⚪', '⚪'],
        ['⚪', '⚪'],
        ['⚪', '⚪'],
        ['⚪']
    ];

    // Place ball
    if (ballRow < 5) {
        rows[ballRow][ballCol] = ballEmoji;
    }

    let board = '';
    board += ` ${rows[0].join(' ')}\n`;
    board += ` ${rows[1].join(' ')}\n`;
    board += ` ${rows[2].join(' ')}\n`;
    board += ` ${rows[3].join(' ')}\n`;
    board += ` ${rows[4].join(' ')}\n`;
    board += `\n💀 🤡 😎 👑 💰`;

    return board;
}

function getTheme(style) {
    const themes = {
        harsh: {
            frame: "☣️",
            dropping: "🎯 𝔻ℝ𝕆ℙ𝕀ℕ𝔾 𝕋ℍ𝔼 𝔹𝔸𝕃 𝕆𝔽 𝔻𝕆𝕄...",
            win: "👑 𝕍𝕀ℂ𝕋𝕆ℝ𝕐! 𝕋ℍ𝔼 𝔹𝕆𝔸ℝ𝔻 𝔹𝕆𝕎𝕊 𝕋𝕆 𝕐𝕆𝕌",
            lose: "💀 𝔻𝔼𝔽𝔼𝔸𝕋! 𝕋ℍ𝔼 ℙ𝕃𝕀ℕ𝕂𝕆 𝔾𝕆𝔻𝕊 𝕃𝔸𝕌𝔾ℍ",
            neutral: "😐 ℕ𝔼𝕌𝕋ℝ𝔸𝕃. 𝕎𝔸𝕊𝕋𝔼 𝕆𝔽 𝕋𝕀𝕄𝔼",
            react: "🎯"
        },
        girl: {
            frame: "🫧",
            dropping: "🎯 𝒹𝓇𝑜𝓅𝒾𝓃𝑔 𝓉𝒽𝑒 𝒷𝒶𝓁𝓁~",
            win: "🎉 𝓎𝒶𝓎! 𝓎𝑜𝓊 𝓌𝑜𝓃 𝓅𝓇𝒾𝓃𝒸𝑒𝓈𝓈~ 👑",
            lose: "🥺 𝑜𝒽 𝓃𝑜... 𝓎𝑜𝓊 𝓁𝑜𝓈𝓉~ 💀",
            neutral: "😐 𝓃𝑜𝓉𝒽𝒾𝓃𝑔 𝒽𝒶𝓅𝑒𝓃𝑒𝒹~",
            react: "🎀"
        },
        normal: {
            frame: "🎯",
            dropping: "🎯 Dropping the Plinko ball...",
            win: "🎉 WINNER! You hit a good slot!",
            lose: "💀 LOSER! Better luck next drop",
            neutral: "😐 NEUTRAL. Nothing happens",
            react: "🎯"
        }
    };
    return themes[style] || themes.normal;
}

function getPlinkoRank(wins) {
    if (wins >= 100) return "Plinko God 👑";
    if (wins >= 50) return "Plinko Master 🏆";
    if (wins >= 25) return "Plinko Pro ⭐";
    if (wins >= 10) return "Plinko Expert 🎯";
    if (wins >= 5) return "Plinko Rookie 🎲";
    return "Plinko Newbie 🥉";
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
