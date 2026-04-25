// VEX MINI BOT - VEX: whois
// Nova: Domain Intelligence & Network Recon
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'whois',
    cyro: 'tools',
    nova: 'Retrieves domain registration details and ownership info',

    async execute(m, sock) {
        // 1. KUPATA DOMAIN (Kutoka mbele ya command au kwenye reply)
        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || "";
        const argsText = m.message?.conversation?.split(' ').slice(1).join(' ') || 
                         m.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ');
        
        let rawInput = argsText || quotedText;

        if (!rawInput) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Please provide a domain or reply to a link!\nExample: `.whois google.com`" 
            }, { quoted: m });
        }

        // Clean domain: Ondoa http/https na slash za mbele
        const domain = rawInput.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔍", key: m.key } });

        try {
            // 2. FETCHING WHOIS DATA
            const response = await axios.get(`https://api.devs-group.com/tools/whois?domain=${domain}`);
            const data = response.data.result;

            if (!data || response.data.status !== 200) {
                throw new Error("Invalid domain or API error");
            }

            // 3. CONSTRUCTING THE REPORT (Design ya Mabox)
            const sender = m.sender || m.key.participant || m.key.remoteJid;
            let whoisMsg = `╭━━━〔 🔍 *VEX: WHOIS-INTEL* 〕━━━╮\n`;
            whoisMsg += `┃ 🌟 *Status:* Recon Complete\n`;
            whoisMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            whoisMsg += `┃ 🧬 *Engine:* Network-Scanner V1\n`;
            whoisMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            whoisMsg += `*🌐 DOMAIN PROFILE*\n`;
            whoisMsg += `| ◈ *Domain:* ${domain}\n`;
            whoisMsg += `| ◈ *Registrar:* ${data.registrar || 'N/A'}\n`;
            whoisMsg += `| ◈ *Owner:* ${data.registrant_name || 'Private/Protected'}\n`;
            whoisMsg += `| ◈ *Organization:* ${data.registrant_organization || 'N/A'}\n\n`;

            whoisMsg += `*📅 TIMELINE ANALYSIS*\n`;
            whoisMsg += `| ◈ *Created On:* ${data.creation_date || 'N/A'}\n`;
            whoisMsg += `| ◈ *Updated On:* ${data.updated_date || 'N/A'}\n`;
            whoisMsg += `| ◈ *Expiry Date:* ${data.expiration_date || 'N/A'}\n\n`;

            whoisMsg += `*🛰️ SERVER DATA*\n`;
            whoisMsg += `| ◈ *Name Servers:* ${data.name_servers ? data.name_servers.join(', ') : 'N/A'}\n`;
            whoisMsg += `| ◈ *Status:* ${data.status ? data.status[0] : 'Active'}\n\n`;

            whoisMsg += `*📢 SECURITY NOTE*\n`;
            whoisMsg += `┃ 💠 Domain registry data successfully retrieved.\n`;
            whoisMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            whoisMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            whoisMsg += `_VEX MINI BOT: Privacy is Power_`;

            // 4. SEND MESSAGE
            await sock.sendMessage(m.key.remoteJid, { 
                text: whoisMsg, 
                mentions: [sender] 
            }, { quoted: m });

        } catch (error) {
            console.error("Whois Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Failed to retrieve intelligence for this domain. Ensure it is valid (e.g., google.com)." 
            }, { quoted: m });
        }
    }
};