// VEX MINI BOT - VEX: chn (Channel Manager)
// Nova: High-speed broadcast node for automated channel content.
// Dev: Lupin Starnley

const { getContentType } = require("@whiskeysockets/baileys");

module.exports = {
    vex: 'chn',
    cyro: 'broadcast',
    nova: 'Transmits custom or default intelligence feeds to specified channels.',

    async execute(m, sock) {
        // 1. INPUT EXTRACTION (Kupasua kwa '|')
        const parts = m.text.split('|');
        let channelInput = parts[0].replace('.chn', '').trim();
        let customMessage = parts[1] ? parts[1].trim() : null;

        if (!channelInput && !m.quoted) {
            return m.reply("⚠️ *VEX CHANNEL:* Target JID/Link required.\nUsage: `.chn [JID] | [message]`");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "📡", key: m.key } });

        try {
            // 2. RESOLVE TARGET JID (Logic inayofanana na getjid)
            let targetJid = channelInput;

            if (channelInput.includes('chat.whatsapp.com/')) {
                const code = channelInput.split('chat.whatsapp.com/')[1].split(' ')[0];
                const info = await sock.groupGetInviteInfo(code);
                targetJid = info.id; // Group JID
            } else if (channelInput.includes('whatsapp.com/channel/')) {
                return m.reply("🛰️ *VEX INFO:* Direct transmission to Channel via link is restricted. Please use the Channel's JID (e.g., 120363xxx@newsletter).");
            } else if (!targetJid.endsWith('@g.us') && !targetJid.endsWith('@newsletter')) {
                // Kama ni namba au ID fupi, tuna-assume ni group
                targetJid = targetJid.replace(/[^0-9]/g, '') + (targetJid.length > 15 ? '@g.us' : '@s.whatsapp.net');
            }

            // 3. DEFAULT INTELLIGENCE FEEDS
            const defaults = [
                `╭━━━〔 📡 *VEX: DAILY FEED* 〕━━━╮\n┃ 🟢 *System:* Optimal\n┃ 🧬 *Focus:* IT & Cybersecurity\n┃ 💡 *Insight:* Encryption is a digital right.\n╰━━━━━━━━━━━━━━━━━━━━╯`,
                `╭━━━〔 🛡️ *VEX: CORE SEC* 〕━━━╮\n┃ ⚡ *Status:* Monitoring Nodes\n┃ 🛠️ *Update:* Version 2.0 Engaged\n┃ 💡 *Insight:* The best defense is a well-informed offense.\n╰━━━━━━━━━━━━━━━━━━━━╯`,
                `╭━━━〔 🧠 *VEX: INTELLIGENCE* 〕━━━╮\n┃ 🌟 *Master:* Lupin Starnley\n┃ 📍 *Origin:* Tanzania (TZ)\n┃ 💡 *Insight:* Coding is the language of the future.\n╰━━━━━━━━━━━━━━━━━━━━╯`
            ];

            let finalMessage = customMessage ? 
                `╭━━━〔 🛰️ *VEX BROADCAST* 〕━━━╮\n\n${customMessage}\n\n╰━━━━━━━━━━━━━━━━━━━━╯\n_Sent via VEX MINI BOT_` : 
                defaults[Math.floor(Math.random() * defaults.length)];

            // 4. TRANSMISSION LOGIC (Media or Text)
            if (m.quoted && (m.quoted.mimetype || m.quoted.msg)) {
                // Kama umereply picha/video, bot ina-forward kule
                await sock.copyNForward(targetJid, m.quoted.fakeObj ? m.quoted.fakeObj : m, true, { caption: finalMessage });
            } else {
                // Send Text Only
                await sock.sendMessage(targetJid, { text: finalMessage });
            }

            await m.reply(`✅ *TRANSMISSION SUCCESS:* Data pushed to node: ${targetJid.split('@')[0]}`);

        } catch (e) {
            console.error("CHN ERROR:", e);
            m.reply("❌ *TRANSMISSION FAIL:* System could not push data. Verify if the JID is correct or if the Bot is a member/admin.");
        }
    }
};
