// VEX MINI BOT - VEX: getjid
// Nova: High-precision metadata extractor for JID and Group/Channel Intel.
// Dev: Lupin Starnley

module.exports = {
    vex: 'getjid',
    cyro: 'supreme',
    nova: 'Extracts specific JID, Metadata, and Profile visuals from links or nodes.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1).join(" ");
        let target = m.quoted ? (m.quoted.text || m.quoted.sender) : args;

        // Default: Kama hakuna input, inakupa ID ya chat uliyomo
        if (!target && !m.quoted && !m.mentionedJid?.[0]) {
            return m.reply(`╭━━━〔 📡 *VEX: NODE ID* 〕━━━╮\n┃ 🆔 *Current JID:* ${m.chat}\n╰━━━━━━━━━━━━━━━━━━━━╯`);
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔍", key: m.key } });

        try {
            // 1. RESOLVE GROUP LINK METADATA
            if (target.includes('chat.whatsapp.com/')) {
                const code = target.split('chat.whatsapp.com/')[1].split(' ')[0];
                const metadata = await sock.groupGetInviteInfo(code);
                
                let picUrl;
                try { 
                    picUrl = await sock.profilePictureUrl(metadata.id, 'image'); 
                } catch { 
                    picUrl = 'https://telegra.ph/file/af55d8f3ec608d4888be6.jpg'; 
                }

                let report = `╭━━━〔 🕵️ *VEX: METADATA EXTRACTOR* 〕━━━╮\n`;
                report += `┃ 🌟 *Status:* Optimization Complete\n`;
                report += `┃ 🧬 *Type:* WhatsApp Group\n`;
                report += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
                report += `*📊 NODE INTELLIGENCE*\n`;
                report += `| ◈ *Name:* ${metadata.subject} |\n`;
                report += `| ◈ *JID:* ${metadata.id} |\n`;
                report += `| ◈ *Creator:* ${metadata.owner ? metadata.owner.split('@')[0] : 'Restricted'} |\n`;
                report += `| ◈ *Capacity:* ${metadata.size || 'N/A'} members |\n`;
                report += `| ◈ *Created:* ${new Date(metadata.creation * 1000).toLocaleString()} |\n\n`;
                report += `*📝 DESCRIPTION:*\n${metadata.desc || "No description provided."}\n\n`;
                report += `_VEX MINI BOT: Vision Beyond Limits_`;

                return await sock.sendMessage(m.key.remoteJid, { image: { url: picUrl }, caption: report }, { quoted: m });
            }

            // 2. RESOLVE MENTIONED USERS OR QUOTED SENDER
            if (m.mentionedJid?.[0] || m.quoted) {
                const jid = m.mentionedJid?.[0] || m.quoted.sender;
                return m.reply(`╭━━━〔 👤 *VEX: USER JID* 〕━━━╮\n┃ 🆔 *JID:* ${jid}\n╰━━━━━━━━━━━━━━━━━━━━╯`);
            }

            // 3. RESOLVE INDIVIDUAL NUMBERS
            const cleanNum = target.replace(/[^0-9]/g, '');
            if (cleanNum.length >= 10) {
                const jid = cleanNum + '@s.whatsapp.net';
                return m.reply(`╭━━━〔 👤 *VEX: USER JID* 〕━━━╮\n┃ 🆔 *JID:* ${jid}\n╰━━━━━━━━━━━━━━━━━━━━╯`);
            }

            m.reply("⚠️ *VEX ERROR:* Unsupported node format. Provide a valid Group Link, Tag a user, or input a JID.");

        } catch (e) {
            console.error("GETJID ERROR:", e);
            m.reply("❌ *SCAN FAIL:* Imeshindikana kupata metadata. Huenda link imekufa (reset) au node ipo kwenye high-level encryption.");
        }
    }
};
