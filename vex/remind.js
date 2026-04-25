// VEX MINI BOT - VEX: remind
// Nova: Temporal Task Manager & Scheduler
// Dev: Lupin Starnley

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

// Hifadhi ya kumbukumbu
const remindersPath = path.join(__dirname, '../reminders.json');

// Kazi ya kupakia kumbukumbu zilizohifadhiwa bot ikiamka
const loadReminders = () => {
    if (!fs.existsSync(remindersPath)) return [];
    return JSON.parse(fs.readFileSync(remindersPath));
};

module.exports = {
    vex: 'remind',
    cyro: 'tools',
    nova: 'Schedules a personalized reminder with context awareness',

    async execute(m, sock) {
        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || "";
        const args = m.message?.conversation?.split(' ').slice(1) || 
                     m.message?.extendedTextMessage?.text?.split(' ').slice(1);
        
        if (args.length < 2 && !quotedMsg) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Format: `.remind [time][m/h/d] [task]`\nExample: `.remind 10m Launch Time`" 
            }, { quoted: m });
        }

        const timeStr = args[0]; // Mfano: 10m, 2h, 1d
        const task = args.slice(1).join(' ') || "Task from replied message";
        const sender = m.sender || m.key.participant || m.key.remoteJid;

        // Logic ya muda
        const timeValue = parseInt(timeStr);
        const timeUnit = timeStr.replace(/[0-9]/g, '').toLowerCase();
        let delayInMs = 0;

        if (timeUnit === 'm') delayInMs = timeValue * 60 * 1000;
        else if (timeUnit === 'h') delayInMs = timeValue * 60 * 60 * 1000;
        else if (timeUnit === 'd') delayInMs = timeValue * 24 * 60 * 60 * 1000;
        else return await sock.sendMessage(m.key.remoteJid, { text: "*❌ VEX-ERROR:* Use 'm' for minutes, 'h' for hours, or 'd' for days." });

        await sock.sendMessage(m.key.remoteJid, { react: { text: "⏰", key: m.key } });

        // Design ya uthibitisho wa kishua
        let confirmMsg = `╭━━━〔 ⏰ *VEX: SCHEDULER* 〕━━━╮\n`;
        confirmMsg += `┃ 🌟 *Status:* Alert Set\n`;
        confirmMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
        confirmMsg += `┃ 🧬 *Engine:* Chronos-V1\n`;
        confirmMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        confirmMsg += `*⏳ DETAILS*\n`;
        confirmMsg += `| ◈ *Target:* @${sender.split('@')[0]}\n`;
        confirmMsg += `| ◈ *Time:* ${timeValue} ${timeUnit === 'm' ? 'Minutes' : timeUnit === 'h' ? 'Hours' : 'Days'}\n`;
        confirmMsg += `| ◈ *Task:* ${task.substring(0, 20)}... |\n\n`;
        confirmMsg += `_VEX will alert you precisely._`;

        await sock.sendMessage(m.key.remoteJid, { text: confirmMsg, mentions: [sender] }, { quoted: m });

        // Ratiba ya kikumbusho
        setTimeout(async () => {
            let alertMsg = `╭━━━〔 🔔 *VEX: TIME-UP* 〕━━━╮\n`;
            alertMsg += `┃ 🌟 *Alert:* Scheduled Reminder\n`;
            alertMsg += `┃ 👤 *Target:* @${sender.split('@')[0]}\n`;
            alertMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            alertMsg += `*📢 TASK RECALL*\n`;
            alertMsg += `> ${task}\n\n`;
            alertMsg += `┃ 💠 Time objective reached.\n`;
            alertMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            alertMsg += `╰━━━━━━━━━━━━━━━━━━━━╯`;

            await sock.sendMessage(m.key.remoteJid, { text: alertMsg, mentions: [sender] });
            
            // Kama alireply kitu, tunaweza kumtag tena hapo
            if (quotedMsg) {
                await sock.sendMessage(m.key.remoteJid, { text: "*☝️ Hey, remember this!.*" }, { quoted: m });
            }
        }, delayInMs);
    }
};