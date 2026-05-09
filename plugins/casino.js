const crypto = require('crypto');

// 🔥 VEX GLOBAL QUEUE (ANTI-BAN)
const queue = [];
let processing = false;

// 🎮 GAME STATE - In-Memory Only
const games = new Map(); // chatId -> game state
const players = new Map(); // chatId -> Map(userId -> playerData)

module.exports = {
    command: "aviator",
    category: "casino",
    description: "VEX Premium Aviator - Live multiplier with real-time cashout",

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
            await runAviator(m, sock, ctx);
            await sleep(1500); // Anti-ban delay
        } catch (e) {
            console.error("VEX AVIATOR ERROR:", e);
        }
    }
    processing = false;
}

async function runAviator(m, sock, ctx) {
    const { userSettings, args } = ctx;
    const style = userSettings?.style || "harsh";
    const chatId = m.chat;
    const userId = m.sender;
    const userName = m.pushName || userId.split('@')[0];

    const action = args[0]?.toLowerCase();

    // =========================
    // 1. START NEW ROUND
    // =========================
    if (action === 'start' || action === 'fly') {
        if (games.has(chatId)) {
            const game = games.get(chatId);
            if (game.status === 'flying') {
                return m.reply(`⚡ Aviator already flying!\n\n📈 Current: ${game.multiplier.toFixed(2)}x\n\n➤.aviator cashout to secure`);
            }
            if (game.status === 'waiting') {
                return m.reply(`⏳ Waiting for players...\n\n👥 Joined: ${game.players.size}\n\n➤.aviator join to enter\n➤.aviator go to start`);
            }
        }

        // Create new game
        const crashPoint = parseFloat((Math.random() * 9 + 1.01).toFixed(2)); // 1.01x - 10.00x

        games.set(chatId, {
            status: 'waiting',
            multiplier: 1.00,
            crashPoint: crashPoint,
            startTime: Date.now(),
            players: new Set([userId]),
            messageKey: null,
            interval: null
        });

        players.set(chatId, new Map());
        players.get(chatId).set(userId, {
            name: userName,
            bet: 100,
            cashedOut: false,
            cashoutAt: 0,
            profit: 0
        });

        return sock.sendMessage(chatId, {
            text: `✈️ *VEX AVIATOR* ✈️\n━━━━━━━━━━━━━━\n\n🎯 *WAITING FOR PLAYERS*\n\n👤 Pilot: @${userId.split('@')[0]}\n💰 Bet: 100 coins\n\n⏰ Starting in 10 seconds...\n\n➤.aviator join - Join flight\n➤.aviator go - Force start\n➤.aviator start <bet> - Custom bet`,
            mentions: [userId]
        });
    }

    // =========================
    // 2. JOIN FLIGHT
    // =========================
    if (action === 'join') {
        if (!games.has(chatId)) {
            return m.reply(`❌ No flight waiting. Start with.aviator start`);
        }

        const game = games.get(chatId);
        if (game.status!== 'waiting') {
            return m.reply(`❌ Flight already took off!\n\n📈 Current: ${game.multiplier.toFixed(2)}x`);
        }

        if (game.players.has(userId)) {
            return m.reply(`✅ You're already on this flight`);
        }

        const bet = parseInt(args[1]) || 100;
        if (bet < 50 || bet > 1000) {
            return m.reply("❌ Bet must be 50-1000 coins");
        }

        game.players.add(userId);
        players.get(chatId).set(userId, {
            name: userName,
            bet: bet,
            cashedOut: false,
            cashoutAt: 0,
            profit: 0
        });

        const playerList = Array.from(game.players).map(id => {
            const p = players.get(chatId).get(id);
            return `👤 ${p.name} - ${p.bet} coins`;
        }).join('\n');

        return sock.sendMessage(chatId, {
            text: `✈️ *PLAYER JOINED*\n━━━━━━━━━━━━━━\n\n${playerList}\n\n👥 Total: ${game.players.size} players\n⏰ Starting soon...\n\n➤.aviator go - Force start`,
            mentions: Array.from(game.players)
        });
    }

    // =========================
    // 3. FORCE START / GO
    // =========================
    if (action === 'go' || action === 'takeoff') {
        if (!games.has(chatId)) {
            return m.reply(`❌ No flight to start. Use.aviator start`);
        }

        const game = games.get(chatId);
        if (game.status!== 'waiting') {
            return m.reply(`❌ Flight already in progress`);
        }

        if (!game.players.has(userId)) {
            return m.reply(`❌ Join the flight first with.aviator join`);
        }

        await startFlight(chatId, sock, style);
        return;
    }

    // =========================
    // 4. CASHOUT
    // =========================
    if (action === 'cashout' || action === 'out') {
        if (!games.has(chatId)) {
            return m.reply(`❌ No active flight`);
        }

        const game = games.get(chatId);
        if (game.status!== 'flying') {
            return m.reply(`❌ Flight not active. Current: ${game.status}`);
        }

        const playerMap = players.get(chatId);
        if (!playerMap.has(userId)) {
            return m.reply(`❌ You are not in this flight`);
        }

        const player = playerMap.get(userId);
        if (player.cashedOut) {
            return m.reply(`✅ Already cashed out at ${player.cashoutAt.toFixed(2)}x`);
        }

        // Cash out success
        player.cashedOut = true;
        player.cashoutAt = game.multiplier;
        player.profit = Math.floor(player.bet * game.multiplier - player.bet);

        const themes = getTheme(style);
        await sock.sendMessage(chatId, {
            text: `💸 *CASHOUT SUCCESS*\n━━━━━━━━━━━━━━\n\n👤 ${player.name}\n📈 Cashed: ${player.cashoutAt.toFixed(2)}x\n💰 Bet: ${player.bet} coins\n💵 Profit: +${player.profit} coins\n\n${themes.cashout}`,
            mentions: [userId]
        });
        return;
    }

    // =========================
    // 5. STATUS
    // =========================
    if (action === 'status' || action === 'info') {
        if (!games.has(chatId)) {
            return m.reply(`❌ No active flight. Start with.aviator start`);
        }

        const game = games.get(chatId);
        const playerMap = players.get(chatId);
        const activePlayers = Array.from(playerMap.values()).filter(p =>!p.cashedOut).length;

        return sock.sendMessage(chatId, {
            text: `✈️ *AVIATOR STATUS*\n━━━━━━━━━━━━━━\n\n📊 Status: ${game.status.toUpperCase()}\n📈 Multiplier: ${game.multiplier.toFixed(2)}x\n👥 Active: ${activePlayers}/${game.players.size} players\n🎯 Crash Point: HIDDEN\n\n➤.aviator cashout to secure profit`
        });
    }

    // Default: Show help
    return m.reply(`✈️ *VEX AVIATOR COMMANDS*\n━━━━━━━━━━━━━━\n\n.aviator start - Create flight\n.aviator join - Join flight\n.aviator go - Start flight\n.aviator cashout - Secure profit\n.aviator status - Check flight\n\n*How to play:*\n1. Start/join flight\n2. Watch multiplier rise\n3. Cashout before crash\n4. Higher = Riskier!`);
}

// =========================
// FLIGHT ENGINE
// =========================
async function startFlight(chatId, sock, style) {
    const game = games.get(chatId);
    game.status = 'flying';
    game.startTime = Date.now();

    const themes = getTheme(style);

    // Send initial message
    const { key } = await sock.sendMessage(chatId, {
        text: `${themes.start}\n━━━━━━━━━━━━━━\n\n✈️ *TAKEOFF*\n📈 1.00x\n\n👥 ${game.players.size} players flying\n💰 Cash out before crash!\n\n➤.aviator cashout`
    });

    game.messageKey = key;

    // Start multiplier animation
    let tick = 0;
    game.interval = setInterval(async () => {
        tick++;

        // Exponential growth formula for realism
        const timeElapsed = (Date.now() - game.startTime) / 1000;
        game.multiplier = 1 + (timeElapsed * 0.15) + (Math.pow(timeElapsed, 1.5) * 0.02);
        game.multiplier = parseFloat(game.multiplier.toFixed(2));

        // Check crash
        if (game.multiplier >= game.crashPoint) {
            clearInterval(game.interval);
            await crashFlight(chatId, sock, style);
            return;
        }

        // Update display every 0.8s
        if (tick % 1 === 0) {
            const playerMap = players.get(chatId);
            const activeCount = Array.from(playerMap.values()).filter(p =>!p.cashedOut).length;
            const multiplierBar = getMultiplierBar(game.multiplier);

            const updateText = `
✈️ *VEX AVIATOR* ✈️
━━━━━━━━━━━━━━

📈 ${game.multiplier.toFixed(2)}x
${multiplierBar}

👥 Active: ${activeCount}/${game.players.size}
💥 Next: ${game.crashPoint.toFixed(2)}x

━━━━━━━━━━━━━━
_${style === 'harsh'? 'ℂ𝔸𝕊ℍ 𝕆𝕌𝕋 𝕆ℝ 𝔻𝕀𝔼' : 'Cashout to win!'}_
            `;

            try {
                await sock.sendMessage(chatId, { text: updateText, edit: key });
            } catch (e) {
                clearInterval(game.interval);
            }
        }
    }, 800); // Update every 800ms for smooth animation
}

async function crashFlight(chatId, sock, style) {
    const game = games.get(chatId);
    const playerMap = players.get(chatId);
    const themes = getTheme(style);

    game.status = 'crashed';

    // Calculate results
    let winners = [];
    let losers = [];
    let totalProfit = 0;

    playerMap.forEach((player, userId) => {
        if (player.cashedOut) {
            winners.push(`✅ ${player.name} - ${player.cashoutAt.toFixed(2)}x (+${player.profit})`);
            totalProfit += player.profit;
        } else {
            losers.push(`💀 ${player.name} - LOST ${player.bet}`);
            totalProfit -= player.bet;
        }
    });

    const crashDisplay = `
💥 *CRASHED* 💥
━━━━━━━━━━━━━━

✈️ Plane crashed at ${game.crashPoint.toFixed(2)}x

━━━━━━━━━━━━━━

*WINNERS:*
${winners.length > 0? winners.join('\n') : 'None - Everyone got greedy 🤡'}

*LOSERS:*
${losers.length > 0? losers.join('\n') : 'None - Smart pilots!'}

━━━━━━━━━━━━━━

💰 House Profit: ${totalProfit > 0? '-' : '+'}${Math.abs(totalProfit)} coins

_${themes.crash}_
    `;

    await sock.sendMessage(chatId, {
        text: crashDisplay,
        edit: game.messageKey,
        mentions: Array.from(game.players)
    });

    // Cleanup after 5s
    setTimeout(() => {
        games.delete(chatId);
        players.delete(chatId);
    }, 5000);
}

function getTheme(style) {
    const themes = {
        harsh: {
            start: "✈️ 𝕋𝔸𝕂𝔼𝕆𝔽 𝕀ℕ𝕀𝕋𝕀𝔸𝕋𝔼𝔻",
            cashout: "💸 𝕊𝕄𝔸ℝ𝕋 𝔼𝕏𝕀𝕋. 𝕐𝕆𝕌 𝕃𝕀𝕍𝔼𝔻",
            crash: "𝕋ℍ𝔼 ℍ𝕆𝕌𝕊𝔼 𝔻𝔼𝕍𝕆𝕌ℝ𝔼𝔻 𝕐𝕆𝕌ℝ 𝔾ℝ𝔼𝔻"
        },
        girl: {
            start: "✈️ 𝓉𝒶𝓀𝑒𝑜𝒻 𝓈𝓉𝒶𝓇𝓉𝑒𝒹~",
            cashout: "💸 𝓎𝒶𝓎! 𝓈𝓂𝒶𝓇𝓉 𝑔𝒾𝓇𝓁~ 🎀",
            crash: "💥 𝑜𝒽 𝓃𝑜... 𝓉𝒽𝑒 𝓅𝓁𝒶𝓃𝑒 𝒸𝓇𝒶𝓈𝒽𝑒𝒹~ 🥺"
        },
        normal: {
            start: "✈️ Flight taking off!",
            cashout: "💸 Successful cashout!",
            crash: "💥 Plane crashed! Game over."
        }
    };
    return themes[style] || themes.normal;
}

function getMultiplierBar(multiplier) {
    const bars = Math.min(Math.floor(multiplier * 2), 20);
    return '█'.repeat(bars) + '░'.repeat(20 - bars);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
