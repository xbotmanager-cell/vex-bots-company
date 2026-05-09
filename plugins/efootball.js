const translate = require('google-translate-api-x');

// 🔥 VEX GLOBAL QUEUE (ANTI-BAN)
const queue = [];
let processing = false;
const userCooldowns = new Map(); // Anti-spam

// 🎮 GAME STATE - In-Memory Only
if (!global.activeGames) global.activeGames = {};

module.exports = {
    command: "efootball",
    alias: ["efoot", "pes", 
            "fifa"],
    category: "games",
    description: "VEX Efootball Pro - Real teams, players, live animated matches",

    async execute(m, sock, ctx) {
        const userId = m.sender;

        // Anti-spam: 5s cooldown
        const lastUse = userCooldowns.get(userId) || 0;
        if (Date.now() - lastUse < 5000) return;
        userCooldowns.set(userId, Date.now());

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
            await runEfootball(m, sock, ctx);
            await sleep(3000); // Anti-ban delay
        } catch (e) {
            console.error("VEX EFOOTBALL ERROR:", e);
            try {
                await sock.sendMessage(m.chat, {
                    text: `⚽ *VEX EFOOTBALL*\n\nSystem error. Try again.`
                });
            } catch {}
        }
    }
    processing = false;
}

async function runEfootball(m, sock, ctx) {
    const { userSettings, prefix, args } = ctx;
    const style = userSettings?.style || 'harsh';
    const lang = userSettings?.lang || 'en';
    const chatId = m.chat;
    const userId = m.sender;

    // ================= CHECK ACTIVE GAME =================
    if (global.activeGames[chatId]) {
        const game = global.activeGames[chatId];
        if (game.status === 'joining') {
            return m.reply(`⚠️ Game already running!\n\n👥 Players: ${game.participants.length}/2\n⏳ Time left: ${Math.ceil((game.endTime - Date.now()) / 1000)}s\n\nWait for match to finish.`);
        }
        if (game.status === 'playing') {
            return m.reply(`⚽ Match in progress!\n\n${game.team1.name} ${game.score1} - ${game.score2} ${game.team2.name}\n⏱️ ${game.minute}'`);
        }
    }

    // ================= REAL TEAMS WITH STAR PLAYERS =================
    const teams = [
        {
            name: "Real Madrid",
            league: "La Liga",
            stars: 5,
            power: 98,
            players: ["Mbappé", "Vinícius Jr", "Bellingham", "Valverde", "Courtois"],
            formation: "4-3-3",
            color: "⚪"
        },
        {
            name: "Manchester City",
            league: "Premier League",
            stars: 5,
            power: 97,
            players: ["Haaland", "De Bruyne", "Foden", "Rodri", "Ederson"],
            formation: "4-2-3-1",
            color: "🔵"
        },
        {
            name: "Bayern Munich",
            league: "Bundesliga",
            stars: 5,
            power: 95,
            players: ["Kane", "Musiala", "Sané", "Kimmich", "Neuer"],
            formation: "4-2-3-1",
            color: "🔴"
        },
        {
            name: "Arsenal",
            league: "Premier League",
            stars: 5,
            power: 94,
            players: ["Saka", "Ødegaard", "Rice", "Saliba", "Raya"],
            formation: "4-3-3",
            color: "🔴"
        },
        {
            name: "Liverpool",
            league: "Premier League",
            stars: 5,
            power: 93,
            players: ["Salah", "Van Dijk", "Alexander-Arnold", "Mac Allister", "Alisson"],
            formation: "4-3-3",
            color: "🔴"
        },
        {
            name: "Barcelona",
            league: "La Liga",
            stars: 4,
            power: 92,
            players: ["Lewandowski", "Pedri", "Gavi", "Yamal", "Ter Stegen"],
            formation: "4-3-3",
            color: "🔵"
        },
        {
            name: "PSG",
            league: "Ligue 1",
            stars: 4,
            power: 91,
            players: ["Dembélé", "Hakimi", "Marquinhos", "Vitinha", "Donnarumma"],
            formation: "4-3-3",
            color: "🔵"
        },
        {
            name: "Inter Milan",
            league: "Serie A",
            stars: 4,
            power: 90,
            players: ["Martínez", "Barella", "Çalhanoğlu", "Bastoni", "Sommer"],
            formation: "3-5-2",
            color: "🔵"
        },
        {
            name: "Leverkusen",
            league: "Bundesliga",
            stars: 4,
            power: 89,
            players: ["Wirtz", "Boniface", "Xhaka", "Tah", "Hrádecký"],
            formation: "3-4-2-1",
            color: "🔴"
        },
        {
            name: "Atletico Madrid",
            league: "La Liga",
            stars: 4,
            power: 88,
            players: ["Griezmann", "Álvarez", "De Paul", "Giménez", "Oblak"],
            formation: "4-4-2",
            color: "🔴"
        },
        {
            name: "Dortmund",
            league: "Bundesliga",
            stars: 4,
            power: 87,
            players: ["Brandt", "Adeyemi", "Sabitzer", "Schlotterbeck", "Kobel"],
            formation: "4-2-3-1",
            color: "🟡"
        },
        {
            name: "AC Milan",
            league: "Serie A",
            stars: 4,
            power: 86,
            players: ["Leão", "Pulisic", "Reijnders", "Hernández", "Maignan"],
            formation: "4-2-3-1",
            color: "🔴"
        },
        {
            name: "Aston Villa",
            league: "Premier League",
            stars: 3,
            power: 84,
            players: ["Watkins", "Bailey", "Tielemans", "Konsa", "Martínez"],
            formation: "4-4-2",
            color: "🟣"
        },
        {
            name: "Napoli",
            league: "Serie A",
            stars: 3,
            power: 83,
            players: ["Kvaratskhelia", "Osimhen", "Lobotka", "Di Lorenzo", "Meret"],
            formation: "4-3-3",
            color: "🔵"
        },
        {
            name: "Sporting",
            league: "Primeira Liga",
            stars: 3,
            power: 82,
            players: ["Gyökeres", "Trincão", "Hjulmand", "Inácio", "Adán"],
            formation: "3-4-3",
            color: "🟢"
        }
    ];

    // ================= STYLES =================
    const modes = {
        harsh: {
            title: "☣️ EFOOTBALL WORLD CUP ☣️",
            line: "━",
            arrow: "╰─>",
            joinMsg: "Reply 1-15. 60s timer.",
            react: "⚽"
        },
        normal: {
            title: "🏟️ E-FOOTBALL CHAMPIONSHIP 🏟️",
            line: "─",
            arrow: "└──>",
            joinMsg: "Reply 1-15 to join!",
            react: "🏟️"
        },
        girl: {
            title: "🫧 EFOOTBALL CUP 🫧",
            line: "┄",
            arrow: "╰┈➤",
            joinMsg: "Pick 1-15 cutie 💕",
            react: "🎀"
        }
    };

    const current = modes[style] || modes.normal;

    // ================= UI BUILD =================
    let dashboard = `*${current.title}*\n${current.line.repeat(25)}\n\n`;
    dashboard += `🏆 *REAL TEAMS & PLAYERS*\n${current.line.repeat(25)}\n\n`;

    teams.forEach((t, i) => {
        const num = (i + 1).toString().padStart(2, '0');
        dashboard += `*${num}.* ${t.color} ${t.name}\n`;
        dashboard += `${current.arrow} ${t.league} | ⭐${t.stars} | ${t.power} OVR\n`;
        dashboard += `${current.arrow} ${t.players[0]}, ${t.players[1]}, ${t.players[2]}\n`;
        dashboard += `${current.line.repeat(20)}\n`;
    });

    dashboard += `\n👥 *PLAYERS:* 0/2\n⏳ *STATUS:* LIVE (60s)\n\n_${current.joinMsg}_`;

    try {
        await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

        // ================= TRANSLATE SAFE =================
        let finalMsg = dashboard;
        try {
            const { text } = await translate(dashboard, { to: lang });
            finalMsg = text;
        } catch {}

        const sent = await m.reply(finalMsg);

        // ================= GAME ENGINE =================
        global.activeGames[chatId] = {
            messageId: sent.key.id,
            teams,
            participants: [],
            joinedUsers: new Set(),
            locked: false,
            status: 'joining',
            startTime: Date.now(),
            endTime: Date.now() + 60000,
            chatId,
            style,
            lang
        };

        // ================= REPLY LISTENER ENGINE =================
        const listener = async (update) => {
            try {
                const msg = update.messages?.[0];
                if (!msg ||!msg.message) return;
                if (!global.activeGames[chatId]) return;

                const game = global.activeGames[chatId];
                if (game.locked || game.status!== 'joining') return;

                const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
                if (!text || isNaN(text)) return;

                const num = parseInt(text);
                if (num < 1 || num > 15) return;

                const user = msg.key.participant || msg.key.remoteJid;

                // ================= ANTI FAKE JOIN =================
                if (game.joinedUsers.has(user)) return;
                if (game.participants.length >= 2) return;

                game.joinedUsers.add(user);

                let userName = user.split('@')[0];
                try {
                    userName = await sock.getName(user) || userName;
                } catch {}

                game.participants.push({
                    user,
                    userName,
                    team: teams[num - 1],
                    teamIndex: num - 1
                });

                // Update dashboard
                let updateMsg = `*${current.title}*\n${current.line.repeat(25)}\n\n`;
                updateMsg += `✅ *${userName}* joined with ${teams[num - 1].name}!\n\n`;
                updateMsg += `👥 *PLAYERS:* ${game.participants.length}/2\n`;
                updateMsg += `⏳ *TIME LEFT:* ${Math.ceil((game.endTime - Date.now()) / 1000)}s\n\n`;

                if (game.participants.length === 2) {
                    game.locked = true;
                    updateMsg += `🔒 *MATCH STARTING...*`;
                    await sock.sendMessage(chatId, { text: updateMsg });
                    setTimeout(() => startMatch(chatId, sock), 2000);
                } else {
                    updateMsg += `_Waiting for 1 more player..._`;
                    await sock.sendMessage(chatId, { text: updateMsg });
                }

            } catch (e) {
                console.error("Listener error:", e);
            }
        };

        sock.ev.on("messages.upsert", listener);

        // ================= AUTO END ENGINE =================
        setTimeout(async () => {
            const game = global.activeGames[chatId];
            if (!game || game.status!== 'joining') return;

            sock.ev.off("messages.upsert", listener);

            if (game.participants.length < 2) {
                await sock.sendMessage(chatId, {
                    text: `⏰ *TIME UP*\n\nNot enough players joined.\nNeed 2 players to start.\n\nTry again: ${prefix}efootball`
                });
                delete global.activeGames[chatId];
            }
        }, 60000);

    } catch (error) {
        console.error("EFOOTBALL ERROR:", error);
        await m.reply("☣️ System failure. Try again.");
    }
}

// =========================
// LIVE MATCH ENGINE
// =========================
async function startMatch(chatId, sock) {
    const game = global.activeGames[chatId];
    if (!game) return;

    game.status = 'playing';
    game.team1 = game.participants[0].team;
    game.team2 = game.participants[1].team;
    game.player1 = game.participants[0];
    game.player2 = game.participants[1];
    game.score1 = 0;
    game.score2 = 0;
    game.minute = 0;
    game.events = [];

    const modes = {
        harsh: { bar: "━", commentary: "harsh" },
        normal: { bar: "─", commentary: "normal" },
        girl: { bar: "┄", commentary: "cute" }
    };

    const ui = modes[game.style] || modes.normal;

    // Match intro
    await sock.sendMessage(chatId, {
        text: `🏟️ *KICK OFF!*\n\n${game.team1.color} ${game.team1.name} vs ${game.team2.color} ${game.team2.name}\n\n⚽ ${game.team1.players[0]} vs ${game.team2.players[0]}\n📋 Formation: ${game.team1.formation} vs ${game.team2.formation}\n\n🎮 Match starting...`
    });

    await sleep(2000);

    // Simulate 90 minutes in 60 seconds
    const matchDuration = 60000; // 60s real time
    const updateInterval = 3000; // Update every 3s
    const totalUpdates = matchDuration / updateInterval;

    for (let i = 0; i < totalUpdates; i++) {
        if (!global.activeGames[chatId]) break;

        game.minute = Math.floor((i / totalUpdates) * 90);

        // Random events (goals, cards, etc)
        const event = simulateMatchEvent(game, i, totalUpdates);
        if (event) {
            game.events.push(event);
            await sock.sendMessage(chatId, { text: event });
            await sleep(1500);
        }

        // Score update every 15 minutes
        if (game.minute % 15 === 0 && game.minute > 0) {
            const scoreUpdate = `
⚽ *${game.minute}' UPDATE*

${game.team1.color} ${game.team1.name} ${game.score1} - ${game.score2} ${game.team2.color} ${game.team2.name}

📊 Stats: Shots ${Math.floor(Math.random()*10+5)}-${Math.floor(Math.random()*10+5)}
🎯 Possession: ${Math.floor(Math.random()*30+35)}%-${Math.floor(Math.random()*30+35)}%
            `;
            await sock.sendMessage(chatId, { text: scoreUpdate });
            await sleep(2000);
        }

        await sleep(updateInterval);
    }

    // Full time
    await endMatch(chatId, sock, game);
}

// =========================
// MATCH EVENT SIMULATOR
// =========================
function simulateMatchEvent(game, tick, totalTicks) {
    const minute = Math.floor((tick / totalTicks) * 90);
    const rand = Math.random();

    // Goal probability increases with team power
    const goalProb = 0.08;
    const cardProb = 0.03;
    const saveProb = 0.05;

    if (rand < goalProb) {
        // GOAL!
        const isTeam1 = Math.random() < (game.team1.power / (game.team1.power + game.team2.power));
        const scoringTeam = isTeam1? game.team1 : game.team2;
        const scorer = scoringTeam.players[Math.floor(Math.random() * 3)]; // Top 3 players more likely

        if (isTeam1) {
            game.score1++;
        } else {
            game.score2++;
        }

        const celebrations = [
            `⚽ GOAL! ${scorer} scores for ${scoringTeam.name}! ${game.minute}'`,
            `🎯 WHAT A FINISH! ${scorer} makes it ${game.score1}-${game.score2}!`,
            `🔥 ${scorer} with a screamer! ${scoringTeam.name} lead!`,
            `⚡ ${scorer} breaks the deadlock! ${game.minute}'`
        ];

        return celebrations[Math.floor(Math.random() * celebrations.length)];

    } else if (rand < goalProb + cardProb) {
        // CARD
        const team = Math.random() < 0.5? game.team1 : game.team2;
        const player = team.players[Math.floor(Math.random() * team.players.length)];
        const cardType = Math.random() < 0.8? '🟨 YELLOW' : '🟥 RED';
        return `${cardType} CARD! ${player} (${team.name}) ${game.minute}'`;

    } else if (rand < goalProb + cardProb + saveProb) {
        // BIG SAVE
        const team = Math.random() < 0.5? game.team1 : game.team2;
        const keeper = team.players[4]; // Goalkeeper
        return `🧤 INCREDIBLE SAVE! ${keeper} denies a certain goal! ${game.minute}'`;
    }

    return null;
}

// =========================
// END MATCH
// =========================
async function endMatch(chatId, sock, game) {
    const winner = game.score1 > game.score2? game.team1 : game.score2 > game.score1? game.team2 : null;
    const winnerPlayer = game.score1 > game.score2? game.player1 : game.score2 > game.score1? game.player2 : null;

    let result = `🏁 *FULL TIME*\n\n`;
    result += `${game.team1.color} ${game.team1.name} ${game.score1} - ${game.score2} ${game.team2.color} ${game.team2.name}\n\n`;

    if (winner) {
        result += `🏆 WINNER: ${winner.name}\n`;
        result += `👑 MOTM: ${winner.players[0]}\n`;
        result += `💰 Prize: 500 coins\n\n`;
    } else {
        result += `🤝 DRAW!\n`;
        result += `💰 Each: 100 coins\n\n`;
    }

    result += `📊 *MATCH STATS*\n`;
    result += `⏱️ Duration: 90'\n`;
    result += `🎯 Goals: ${game.score1 + game.score2}\n`;
    result += `📋 Events: ${game.events.length}\n\n`;

    if (game.events.length > 0) {
        result += `⚽ *KEY MOMENTS*\n`;
        game.events.slice(-3).forEach(e => result += `${e}\n`);
    }

    await sock.sendMessage(chatId, { text: result });

    // Cleanup
    delete global.activeGames[chatId];
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
