// VEX MINI BOT - VEX: chn (Channel Manager)
// Nova: High-speed broadcast node for automated channel content.
// Dev: Lupin Starnley

const { getContentType } = require("@whiskeysockets/baileys");

module.exports = {
    vex: 'chn',
    cyro: 'broadcast',
    nova: 'Transmits custom or default intelligence feeds to specified channels.',

    async execute(m, sock) {
        const args = m.text.trim().split('|');
        const channelInput = args.replace('.chn', '').trim();
        const customMessage = args ? args.trim() : null;

        if (!channelInput) {
            return m.reply("⚠️ *VEX CHANNEL:* Target link/JID required.\nUsage: `.chn [link/ID] | [message]`");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "📡", key: m.key } });

        // 1. RESOLVE TARGET JID
        let targetJid = channelInput;
        if (channelInput.includes('chat.whatsapp.com/')) {
            const code = channelInput.split('chat.whatsapp.com/');
            try {
                targetJid = await sock.groupAcceptInvite(code);
            } catch (e) {
                return m.reply("❌ *ACCESS DENIED:* Ensure the bot is an admin or the link is valid.");
            }
        } else if (!targetJid.endsWith('@g.us') && !targetJid.endsWith('@newsletter')) {
            targetJid = targetJid.replace(/[^0-9]/g, '') + '@g.us';
        }

        // 2. DEFINE DEFAULT MESSAGES (Randomized)
        const defaults = [
            `╭━━━〔 📡 *VEX: DAILY FEED* 〕━━━╮\n┃ 🟢 *System:* Optimal\n┃ 🧬 *Focus:* IT & Cybersecurity\n┃ 💡 *Insight:* Encryption is not a crime; it is a digital right.\n╰━━━━━━━━━━━━━━━━━━━━╯`,
            `╭━━━〔 🛡️ *VEX: CORE SEC* 〕━━━╮\n┃ ⚡ *Status:* Monitoring Nodes\n┃ 🛠️ *Update:* Version 19.0 Engaged\n┃ 💡 *Insight:* The best defense is a well-informed offense.\n╰━━━━━━━━━━━━━━━━━━━━╯`,
            `╭━━━〔 🧠 *VEX: INTELLIGENCE* 〕━━━╮\n┃ 🌟 *Master:* Lupin Starnley\n┃ 📍 *Origin:* Tanzania (TZ)\n┃ 💡 *Insight:* Coding is the language of the future. Master it.\n╰━━━━━━━━━━━━━━━━━━━━╯`
        ];

        // 3. CONSTRUCT PAYLOAD
        let finalMessage = customMessage ? 
            `╭━━━〔 🛰️ *VEX BROADCAST* 〕━━━╮\n\n${customMessage}\n\n╰━━━━━━━━━━━━━━━━━━━━╯\n_Sent via VEX MINI BOT_` : 
            defaults[Math.floor(Math.random() * defaults.length)];

        try {
            // 4. CHECK FOR QUOTED MEDIA
            const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quoted) {
                const mimeType = getContentType(quoted);
                if (mimeType === 'imageMessage' || mimeType === 'videoMessage') {
                    // Send with Media
                    await sock.sendMessage(targetJid, { 
                        [mimeType === 'imageMessage' ? 'image' : 'video']: { url: 'quoted' }, 
                        caption: finalMessage 
                    });
                }
            } else {
                // Send Text Only
                await sock.sendMessage(targetJid, { text: finalMessage });
            }

            await m.reply("✅ *TRANSMISSION SUCCESS:* Data successfully pushed to the channel.");

        } catch (e) {
            console.error("CHN ERROR:", e);
            m.reply("❌ *TRANSMISSION FAIL:* System could not push data. Verify admin permissions.");
        }
    }
};
