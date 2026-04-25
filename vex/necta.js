// VEX MINI BOT - VEX: necta
// Nova: Real-time NECTA examination results scraper.
// Dev: Lupin Starnley

const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'necta',           
    cyro: 'Tanzania',         
    nova: 'Retrieves NECTA results using Center.Number.Year format',

    async execute(m, sock) {
        // 1. 🎓 UNIQUE REACTION
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🎓", key: m.key } });

        const args = m.text.trim().split(/ +/).slice(1);
        const input = args[0]; // Format: S0388.0001.2025

        if (!input || !input.includes('.')) {
            const warningMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n` +
                               `┃ ⚠️ *Status:* Warning\n` +
                               `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                               `*❌ INVALID FORMAT ❌*\n` +
                               `| ◈ *Usage:* .necta [Center.No.Year] |\n` +
                               `| ◈ *Example:* .necta S0388.0001.2025 |\n\n` +
                               `_VEX MINI BOT: Academic Data Engine_`;
            return await sock.sendMessage(m.key.remoteJid, { text: warningMsg }, { quoted: m });
        }

        const [center, number, year] = input.split('.');

        try {
            // 2. CONSTRUCT URL (Example for CSEE - Form Four)
            // Note: URL structures may change slightly per year/level
            const url = `https://matokeo.necta.go.tz/csee${year}/results/${center.toLowerCase()}.htm`;

            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            // 3. SCRAPING LOGIC
            const schoolName = $('h3').first().text() || 'Unknown School';
            let studentData = null;

            // Target the results table
            $('table tr').each((i, el) => {
                const cols = $(el).find('td');
                const candidateId = $(cols[0]).text().trim();
                
                if (candidateId.includes(number)) {
                    studentData = {
                        id: candidateId,
                        gender: $(cols[1]).text().trim(),
                        points: $(cols[2]).text().trim(),
                        division: $(cols[3]).text().trim(),
                        subjects: $(cols[4]).text().trim()
                    };
                }
            });

            if (!studentData) throw new Error("Student not found");

            // 4. FORMATTING THE MESSAGE
            const sender = m.sender;
            let nectaText = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
            nectaText += `┃ 🌟 *Status:* Data Fetched\n`;
            nectaText += `┃ 👤 *Master:* Lupin Starnley\n`;
            nectaText += `┃ 🎓 *Exam:* CSEE (Form 4)\n`;
            nectaText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            nectaText += `Hello @${sender.split('@')[0]}, results found!\n\n`;
            nectaText += `✨ *CYRO: TOOLS* ✨\n`;
            nectaText += `| ◈ *School:* ${schoolName} |\n`;
            nectaText += `| ◈ *Number:* ${studentData.id} |\n`;
            nectaText += `| ◈ *Division:* ${studentData.division} |\n`;
            nectaText += `| ◈ *Points:* ${studentData.points} |\n\n`;

            nectaText += `*📊 SUBJECTS LIST*\n`;
            // Formatting subjects vertically as requested
            const subjectList = studentData.subjects.split(',').map(s => `| ◈ ${s.trim()} |`).join('\n');
            nectaText += subjectList + `\n\n`;

            nectaText += `*📈 INFO*\n`;
            nectaText += `┃ 💠 *Year:* ${year}\n`;
            nectaText += `┃ 🛰️ *Source:* NECTA Official Server\n`;
            nectaText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            nectaText += `_VEX MINI BOT: Precision Analytics_`;

            const botImageUrl = path.join(__dirname, '../assets/images/vex.png');
            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: botImageUrl }, 
                caption: nectaText,
                mentions: [sender]
            }, { quoted: m });

        } catch (e) {
            console.error("VEX NECTA Error:", e);
            const errorMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n` +
                             `┃ ⚠️ *Status:* Error\n` +
                             `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                             `*❌ FETCH FAILED ❌*\n` +
                             `| ◈ *Reason:* Result not found or link broken |\n` +
                             `| ◈ *Solution:* Double-check Center, No, and Year. |`;
            await sock.sendMessage(m.key.remoteJid, { text: errorMsg }, { quoted: m });
        }
    }
};