// ================= LUPER-MD GAME ENGINE =================
const memoryCache = new Map();

module.exports = {
    name: "efootball_observer_v1",

    async onMessage(m, sock, ctx) {
        const { body, prefix, supabase } = ctx;
        const chat = m.chat;

        // 1. GATEKEEPER: Angalia kama kuna game inaendelea kwenye hii chat
        if (!global.activeGames || !global.activeGames[chat]) return;

        const game = global.activeGames[chat];
        const isReplyToBot = m.message?.extendedTextMessage?.contextInfo?.stanzaId === game.messageId;

        if (!isReplyToBot) return;

        // 2. JOIN LOGIC (Wait for Number 1-15)
        const choice = parseInt(body.trim());
        if (isNaN(choice) || choice < 1 || choice > 15) return;

        // Angalia kama mtu ashaungana tayari
        if (game.participants.find(p => p.jid === m.sender)) return;

        // Angalia kama timu ishachukuliwa
        if (game.participants.find(p => p.teamIndex === choice - 1)) {
            return m.reply("⚠️ This team is already taken! Pick another one.");
        }

        // Add to participants
        const selectedTeam = game.teams[choice - 1];
        game.participants.push({
            jid: m.sender,
            name: selectedTeam.name,
            power: selectedTeam.power,
            teamIndex: choice - 1
        });

        // 3. VISUAL FEEDBACK (Real-time slots)
        const slotCount = game.participants.length;
        await sock.sendMessage(chat, { 
            text: `👤 @${m.sender.split('@')[0]} joined with *${selectedTeam.name}*!\n🏟️ Slots: [${slotCount}/15]`,
            mentions: [m.sender]
        });

        // 4. AUTO-START TIMER (Run once)
        if (!game.timerStarted) {
            game.timerStarted = true;
            
            setTimeout(async () => {
                await this.runSimulation(chat, sock, game);
            }, 60000); // 60 Seconds Countdown
        }
    },

    async runSimulation(chat, sock, game) {
        if (game.participants.length < 2) {
            delete global.activeGames[chat];
            return sock.sendMessage(chat, { text: "☣️ Match cancelled. Not enough players joined." });
        }

        const styles = {
            harsh: { head: "☣️ 𝕸𝕬𝕿𝕮𝕳 𝕽𝕰𝕻𝕺𝕽𝕿 ☣️", win: "🏆 𝕯𝖔𝖒𝖎𝖓𝖆𝖓𝖈𝖊 𝕮𝖔𝖓𝖋𝖎𝖗𝖒𝖊𝖉:" },
            normal: { head: "🏟️ MATCH RESULTS 🏟️", win: "🏆 WINNER:" },
            girl: { head: "🫧 𝒢𝒶𝓂𝑒 𝑅𝑒𝓈𝓊𝓁𝓉𝓈 🫧", win: "🏆 𝒫𝓇𝒾𝓃𝒸𝑒𝓈𝓈 𝒲𝒾𝓃𝓈:" }
        };
        const st = styles[game.style] || styles.normal;

        await sock.sendMessage(chat, { text: "🏟️ *STADIUM CLOSED! Simulation starting...*" });
        
        // Random Delay for Anti-Ban & Suspense
        await new Promise(resolve => setTimeout(resolve, 4000));

        // 5. THE MATCH ENGINE (Smart Randomizing)
        // Tunatafuta mshindi kulingana na power ya timu + luck
        const results = game.participants.map(p => ({
            ...p,
            score: Math.floor(Math.random() * (p.power / 2)) + Math.floor(Math.random() * 3)
        }));

        results.sort((a, b) => b.score - a.score);
        const winner = results[0];

        // 6. FINAL STAR REPORT
        let report = `*${st.head}*\n━━━━━━━━━━━━━━━\n\n`;
        
        results.forEach((res, i) => {
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
            report += `${medal} @${res.jid.split('@')[0]}\n╰──> ${res.name} (${res.score} Goals)\n`;
        });

        report += `\n━━━━━━━━━━━━━━━\n${st.win} @${winner.jid.split('@')[0]} 🎉\n`;
        report += `_System analyzed ${game.participants.length} players with precision._`;

        await sock.sendMessage(chat, { 
            text: report, 
            mentions: results.map(r => r.jid) 
        });

        // 7. CLEANUP
        delete global.activeGames[chat];
    }
};
