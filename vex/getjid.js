// VEX MINI BOT - VEX: getjid
// Nova: High-precision metadata extractor for JID and Group/Channel Intel.
// Dev: Lupin Starnley

module.exports = {
    vex: 'getjid',
    cyro: 'supreme',
    nova: 'Extracts specific JID, Metadata, and Profile visuals from links or nodes.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        let text = m.quoted ? m.quoted.text : args;

        if (!text && !m.quoted) {
            // Default: Kama hakuna input, inakupa ID ya chat uliyomo
            return m.reply(`╭━━━〔 📡 *VEX: NODE ID* 〕━━━╮\n┃ 🆔 *Current JID:* ${m.chat}\n╰━━━━━━━━━━━━━━━━━━━━╯`);
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔍", key: m.key } });

        try {
            // 1. RESOLVE GROUP LINK METADATA
            if (text.includes('chat.whatsapp.com/')) {
                const code = text.split('chat.whatsapp.com/').split(' ');
                const metadata = await sock.groupGetInviteInfo(code);
                
                let picUrl;
                try { picUrl = await sock.profilePictureUrl(metadata.id, 'image'); } catch { picUrl = 'https://telegra.ph/file/03e49e6e053f063d5995e.jpg'; }

                let report = `╭━━━〔 🕵️ *VEX: METADATA EXTRACTOR* 〕━━━╮\n`;
                report += `┃ 🌟 *Status:* Optimization Complete\n`;
                report += `┃ 🧬 *Type:* WhatsApp Group\n`;
                report += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
                report += `*📊 NODE INTELLIGENCE*\n`;
                report += `| ◈ *Name:* ${metadata.subject} |\n`;
                report += `| ◈ *JID:* ${metadata.id} |\n`;
                report += `| ◈ *Creator:* ${metadata.owner ? metadata.owner.split('@') : 'Unknown'} |\n`;
                report += `| ◈ *Capacity:* ${metadata.size} members |\n`;
                report += `| ◈ *Created:* ${new Date(metadata.creation * 1000).toLocaleString()} |\n\n`;
                report += `*📝 DESCRIPTION:*\n${metadata.desc || "No description provided."}\n\n`;
                report += `_VEX MINI BOT: Vision Beyond Limits_`;

                return await sock.sendMessage(m.key.remoteJid, { image: { url: picUrl }, caption: report }, { quoted: m });
            }

            // 2. RESOLVE CHANNEL (NEWSLETTER) LINKS
            if (text.includes('whatsapp.com/channel/')) {
                return m.reply("🛰️ *VEX INFO:* This is a WhatsApp Channel link. \n\n*Note:* Direct Metadata scraping for Channels via link is restricted by WhatsApp encryption. To get the JID, the Bot must be an admin or have previously interacted with the node.");
            }

            // 3. RESOLVE INDIVIDUAL NUMBERS
            if (text.match(/^\d+$/)) {
                const jid = text + '@s.whatsapp.net';
                return m.reply(`╭━━━〔 👤 *VEX: USER JID* 〕━━━╮\n┃ 🆔 *JID:* ${jid}\n╰━━━━━━━━━━━━━━━━━━━━╯`);
            }

            m.reply("⚠️ *VEX ERROR:* Unsupported node format. Provide a valid Group Link or JID.");

        } catch (e) {
            console.error("GETJID ERROR:", e);
            m.reply("❌ *SCAN FAIL:* High-level encryption detected or link has expired.");
        }
    }
};
