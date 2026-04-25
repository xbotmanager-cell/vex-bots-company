// VEX MINI BOT - VEX: ddos
// Nova: Simulates a DDoS attack for network stress testing.
// Dev: Lupin Starnley

module.exports = {
    vex: 'ddos',
    cyro: 'hacks',
    nova: 'Simulates a network stress test (DDoS) on a target.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        const target = args[0];
        const port = args[1] || "80";

        if (!target) return m.reply("❌ *USAGE:* `.ddos [IP/URL] [PORT]`");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔥", key: m.key } });

        let progress = 0;
        let { key } = await m.reply("🛰️ *VEX: INITIALIZING ATTACK VECTORS...* [0%]");

        // Simulation Loop
        const interval = setInterval(async () => {
            progress += 25;
            await sock.sendMessage(m.chat, { edit: key, text: `🛰️ *VEX: DEPLOYING PACKETS...* [${progress}%]` });
            
            if (progress >= 100) {
                clearInterval(interval);
                
                let ddosMsg = `╭━━━〔 🔥 *VEX: DDOS-REPORT* 〕━━━╮\n`;
                ddosMsg += `┃ 🌟 *Target:* ${target}\n`;
                ddosMsg += `┃ 🔌 *Port:* ${port}\n`;
                ddosMsg += `┃ 🧬 *Packets:* 1,500,000 PPS\n`;
                ddosMsg += `┃ 📊 *Impact:* High Latency Detected\n`;
                ddosMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

                ddosMsg += `*📢 ATTACK LOG:*\n`;
                ddosMsg += `> "Target node ${target} is being overwhelmed. Connection timeouts reported from multiple proxy layers. Operations complete."\n\n`;
                
                ddosMsg += `_VEX MINI BOT: No System is Safe_`;

                await sock.sendMessage(m.chat, { edit: key, text: ddosMsg });
            }
        }, 1500);
    }
};