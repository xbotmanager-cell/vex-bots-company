const translate = require('google-translate-api-x');

module.exports = {
    command: "efootball",
    alias: ["efoot", "pes", "game"],
    category: "games",
    description: "Advanced eFootball system with AI match engine",

    async execute(m, sock, { args, supabase, userSettings, prefix }) {

        // ================= SAFE GUARDS =================
        if (!global.activeGames) global.activeGames = {};

        if (global.activeGames[m.chat]) {
            return m.reply("⚠️ Game already running. Wait for current match to finish.");
        }

        // ================= SETTINGS =================
        const style = userSettings?.style || 'harsh';
        const lang = userSettings?.lang || 'en';

        // ================= ANTI FAKE JOIN TRACKER =================
        const joinedUsers = new Set();

        // ================= TEAMS =================
        const teams = [
            { name: "Real Madrid", stars: 5, power: 9.8 },
            { name: "Manchester City", stars: 5, power: 9.7 },
            { name: "Bayern Munich", stars: 5, power: 9.5 },
            { name: "Arsenal", stars: 4, power: 9.0 },
            { name: "Liverpool", stars: 4, power: 8.9 },
            { name: "Barcelona", stars: 4, power: 8.8 },
            { name: "PSG", stars: 4, power: 8.7 },
            { name: "Inter Milan", stars: 4, power: 8.6 },
            { name: "Leverkusen", stars: 4, power: 8.5 },
            { name: "Atletico Madrid", stars: 4, power: 8.2 },
            { name: "Dortmund", stars: 4, power: 8.1 },
            { name: "Aston Villa", stars: 3, power: 7.8 },
            { name: "AC Milan", stars: 3, power: 7.7 },
            { name: "Sporting", stars: 3, power: 7.5 },
            { name: "Napoli", stars: 3, power: 7.3 }
        ];

        // ================= STYLES =================
        const modes = {
            harsh: {
                title: "☣️ EFOOTBALL WORLD ☣️",
                line: "━",
                arrow: "╰─>",
                joinMsg: "Reply with team number.",
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
                joinMsg: "Pick a number 💕",
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        // ================= UI BUILD =================
        let dashboard = `*${current.title}*\n${current.line.repeat(20)}\n\n`;

        teams.forEach((t, i) => {
            const num = (i + 1).toString().padStart(2, '0');
            dashboard += `*${num}.* ${t.name}\n${current.arrow} ⭐${t.stars} (${t.power})\n${current.line.repeat(15)}\n`;
        });

        dashboard += `\n👥 PARTICIPANTS: 0/15\n⏳ STATUS: LIVE (60s)\n\n_${current.joinMsg}_`;

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
            global.activeGames[m.chat] = {
                messageId: sent.key.id,
                teams,
                participants: [],
                joinedUsers,
                locked: false,
                startTime: Date.now(),
                endTime: Date.now() + 60000
            };

            // ================= REPLY LISTENER ENGINE =================
            const listener = async (update) => {
                try {
                    const msg = update.messages?.[0];
                    if (!msg || !msg.message) return;

                    if (!global.activeGames[m.chat]) return;

                    const game = global.activeGames[m.chat];
                    if (game.locked) return;

                    const text =
                        msg.message.conversation ||
                        msg.message.extendedTextMessage?.text;

                    if (!text || isNaN(text)) return;

                    const num = parseInt(text);
                    if (num < 1 || num > 15) return;

                    const user = msg.key.participant || msg.key.remoteJid;

                    // ================= ANTI FAKE JOIN =================
                    if (game.joinedUsers.has(user)) return;

                    game.joinedUsers.add(user);

                    game.participants.push({
                        user,
                        team: teams[num - 1].name,
                        power: teams[num - 1].power
                    });

                } catch {}
            };

            sock.ev.on("messages.upsert", listener);

            // ================= AUTO END ENGINE =================
            setTimeout(async () => {

                const game = global.activeGames[m.chat];
                if (!game) return;

                game.locked = true;

                sock.ev.off("messages.upsert", listener);

                // ================= RANK SYSTEM =================
                const sorted = game.participants.sort((a, b) => b.power - a.power);

                let result = `🏁 *MATCH RESULTS*\n\n`;

                if (sorted.length === 0) {
                    result += "No players joined.";
                } else {

                    // ================= AI MATCH SIMULATION =================
                    const winnerIndex = Math.floor(Math.random() * sorted.length);
                    const winner = sorted[winnerIndex];

                    result += `🏆 WINNER: ${winner.team}\n\n`;

                    result += `📊 RANKINGS:\n`;

                    sorted.forEach((p, i) => {
                        result += `${i + 1}. ${p.team} (${p.power})\n`;
                    });
                }

                await sock.sendMessage(m.chat, { text: result });

                delete global.activeGames[m.chat];

            }, 60000);

        } catch (error) {
            console.error("EFOOTBALL ERROR:", error);
            await m.reply("☣️ System failure.");
        }
    }
};
