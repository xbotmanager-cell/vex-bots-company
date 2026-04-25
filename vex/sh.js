// VEX MINI BOT - VEX: sh
// Nova: Executes shell commands directly from the chat.
// Dev: Lupin Starnley

const { exec } = require("child_process");

module.exports = {
    vex: 'sh',
    cyro: 'hacks',
    nova: 'Executes shell/terminal commands (Host Only).',

    async execute(m, sock) {
        if (!m.fromMe) return m.reply("⚠️ *RESTRICTED:* Terminal access is for the Master only.");

        const command = m.text.slice(4);
        if (!command) return m.reply("❌ *ERROR:* No command provided.");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "💻", key: m.key } });

        exec(command, (err, stdout, stderr) => {
            if (err) return m.reply(`*❌ ERROR:*\n\`\`\`${err.message}\`\`\``);
            if (stderr) return m.reply(`*⚠️ STDERR:*\n\`\`\`${stderr}\`\`\``);
            
            let termMsg = `╭━━━〔 💻 *VEX: TERMINAL* 〕━━━╮\n`;
            termMsg += `┃ 🌟 *Status:* Process Executed\n`;
            termMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            termMsg += `\`\`\`${stdout}\`\`\``;

            m.reply(termMsg);
        });
    }
};