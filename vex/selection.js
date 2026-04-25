// VEX MINI BOT - VEX: selection
// Nova: Academic Placement & NECTA Intelligence
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'selection',
    cyro: 'Tanzania',
    nova: 'Retrieves school selection and placement results based on exam number',

    async execute(m, sock) {
        // 1. KUPATA DATA (Kutoka mbele ya command au kwenye reply)
        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || "";
        const argsText = m.message?.conversation?.split(' ').slice(1).join(' ') || 
                         m.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ');
        
        const examNumber = argsText || quotedText;

        if (!examNumber) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Please provide an exam number or reply to one!\nExample: `.selection S0388.0001.2025`" 
            }, { quoted: m });
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🎓", key: m.key } });

        try {
            // 2. FETCHING SELECTION DATA
            // Kumbuka: Hapa inatumia API inayopokea namba ya mtihani
            const response = await axios.get(`https://necta-api.selfmade.u1.com/selection?number=${examNumber.trim()}`);
            const data = response.data;

            if (!data || !data.success) {
                throw new Error("Candidate not found");
            }

            // 3. CONSTRUCTING THE REPORT (Design ya Kishua)
            const sender = m.sender || m.key.participant || m.key.remoteJid;
            let selectMsg = `╭━━━〔 🎓 *VEX: SELECTION-INTEL* 〕━━━╮\n`;
            selectMsg += `┃ 🌟 *Status:* Data Decoded\n`;
            selectMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            selectMsg += `┃ 🧬 *Engine:* Academic-Sync V1\n`;
            selectMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            selectMsg += `*👤 STUDENT PROFILE*\n`;
            selectMsg += `| ◈ *Name:* ${data.name || 'N/A'}\n`;
            selectMsg += `| ◈ *Exam No:* ${examNumber.toUpperCase()}\n`;
            selectMsg += `| ◈ *Gender:* ${data.gender || 'N/A'}\n\n`;

            selectMsg += `*🏫 PLACEMENT INFO*\n`;
            selectMsg += `| ◈ *School:* ${data.selected_school || 'NOT SELECTED'}\n`;
            selectMsg += `| ◈ *Level:* ${data.level || 'Form Five / College'}\n`;
            selectMsg += `| ◈ *Combination:* ${data.combination || 'N/A'}\n\n`;

            selectMsg += `*📍 LOCATION*\n`;
            selectMsg += `| ◈ *Region:* ${data.region || 'N/A'}\n`;
            selectMsg += `| ◈ *District:* ${data.district || 'N/A'}\n\n`;

            selectMsg += `*📢 SYSTEM NOTE*\n`;
            selectMsg += `┃ 💠 Academic records successfully retrieved.\n`;
            selectMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            selectMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            selectMsg += `_VEX MINI BOT: Building The Future_`;

            // 4. SEND MESSAGE
            await sock.sendMessage(m.key.remoteJid, { 
                text: selectMsg, 
                mentions: [sender] 
            }, { quoted: m });

        } catch (error) {
            console.error("Selection Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Student records not found. Ensure the number and year are correct (e.g., S0388.0001.2025)." 
            }, { quoted: m });
        }
    }
};