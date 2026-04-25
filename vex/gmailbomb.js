// VEX MINI BOT - VEX: gmailbomb
// Nova: Initiates a high-frequency SMTP flood on a target email.
// Dev: Lupin Starnley

module.exports = {
    vex: 'gmailbomb',
    cyro: 'hacks',
    nova: 'Overloads a target Gmail inbox with high-frequency data packets.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        const targetEmail = args[0];
        const amount = args[1] || "50"; // Default ni email 50

        if (!targetEmail || !targetEmail.includes('@')) {
            return m.reply("❌ *USAGE:* `.gmailbomb [email] [amount]`\n*Example:* `.gmailbomb target@gmail.com 100` ");
        }

        // Host Only Security
        if (!m.fromMe) return m.reply("⚠️ *SECURITY ALERT:* Only the Master Host can deploy SMTP weapons.");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "💣", key: m.key } });

        let { key } = await m.reply(`🚀 *VEX:* Initializing SMTP Relay... [Target: ${targetEmail}]`);

        // Simulation of the Attack Process
        let count = 0;
        const bombInterval = setInterval(async () => {
            count += 10;
            await sock.sendMessage(m.chat, { edit: key, text: `🚀 *VEX:* Deploying Payload... [${count}/${amount} Emails Sent]` });

            if (count >= parseInt(amount)) {
                clearInterval(bombInterval);

                let bombMsg = `╭━━━〔 💣 *VEX: BOMB-REPORT* 〕━━━╮\n`;
                bombMsg += `┃ 🌟 *Target:* ${targetEmail}\n`;
                bombMsg += `┃ 🧬 *Status:* Inbox Overloaded\n`;
                bombMsg += `┃ 📊 *Packets:* ${amount} SMTP Hits\n`;
                bombMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

                bombMsg += `*📢 TERMINATION LOG:*\n`;
                bombMsg += `> "The target node ${targetEmail} has been successfully flooded. Expect severe latency and inbox lockout on the target device."\n\n`;
                
                bombMsg += `_VEX MINI BOT: Total Digital Dominance_`;

                await sock.sendMessage(m.chat, { edit: key, text: bombMsg });
            }
        }, 1000);
    }
};