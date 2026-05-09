const fs = require('fs');
const path = require('path');

// =========================
// SCHEDULER STATE - RAM
// =========================
const activeSchedules = new Map(); // chatId -> { userId, messages, endTime, interval, count, timer }
const SCHEDULE_DIR = path.join(__dirname, '../tmp/schedules');

if (!fs.existsSync(SCHEDULE_DIR)) {
    fs.mkdirSync(SCHEDULE_DIR, { recursive: true });
}

module.exports = {
    command: "send",
    alias: ["schedule", "timed", "scheduler"],
    category: "owner",
    description: "VEX Scheduler - Send timed messages with anti-ban delays",

    async execute(m, sock, { args, userSettings, prefix, command }) {
        const chatId = m.chat;
        const userId = m.sender;
        const userRole = ctx.userRole || 'user';
        const style = userSettings?.style || 'harsh';

        // =========================
        // STYLE CONFIG
        // =========================
        const themes = {
            harsh: {
                react: "⏱️",
                title: "☣️ 𝖁𝕰𝖃 𝕾𝕮𝕳𝕰𝕯𝖀𝕷𝕰𝕽 ☣️",
                line: "━",
                success: "☣️ 𝕾𝕮𝕳𝕰𝕯𝖀𝕷𝕰 𝕬𝕮𝕿𝕴𝖁𝕬𝕿𝕰𝕯",
                stop: "☣️ 𝕾𝕮𝕳𝕰𝕯𝖀𝕷𝕰 𝕿𝕰𝕽𝕸𝕴𝕹𝕬𝕿𝕰𝕯",
                done: "☣️ 𝕾𝕮𝕳𝕰𝕯𝖀𝕷𝕰 𝕮𝕺𝕸𝕻𝕷𝕰𝕿𝕰",
                error: "☣️ 𝕬𝕮𝕰𝕾 𝕯𝕰𝕹𝕴𝕰𝕯"
            },
            normal: {
                react: "📅",
                title: "📅 VEX SCHEDULER 📅",
                line: "─",
                success: "✅ Schedule Activated",
                stop: "🛑 Schedule Stopped",
                done: "✅ Schedule Completed",
                error: "❌ Access Denied"
            },
            girl: {
                react: "⏰",
                title: "🫧 𝒱𝑒𝓍 𝒮𝒸𝒽𝑒𝒹𝓊𝓁𝑒𝓇 🫧",
                line: "┄",
                success: "💖 𝒮𝒸𝒽𝑒𝒹𝓊𝓁𝑒 𝒜𝒸𝓉𝒾𝓋𝒶𝓉𝑒𝒹~",
                stop: "💔 𝒮𝒸𝒽𝑒𝒹𝓊𝓁𝑒 𝒮𝓉𝑜𝓅𝑒𝒹~",
                done: "💖 𝒮𝒸𝒽𝑒𝒹𝓊𝓁𝑒 𝒞𝑜𝓂𝓅𝓁𝑒𝓉𝑒~",
                error: "💔 𝒜𝒸𝑒𝓈 𝒟𝑒𝓃𝒾𝑒𝒹~"
            }
        };

        const ui = themes[style] || themes.normal;
        await sock.sendMessage(chatId, { react: { text: ui.react, key: m.key } });

        // =========================
        // CANCEL COMMAND
        // =========================
        if (args[0]?.toLowerCase() === 'cancel' || args[0]?.toLowerCase() === 'stop') {
            if (!activeSchedules.has(chatId)) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ No active schedule in this chat.\n\n_VEX Scheduler v2.0_`);
            }

            const schedule = activeSchedules.get(chatId);
            if (schedule.timer) clearTimeout(schedule.timer);
            activeSchedules.delete(chatId);

            const elapsed = Date.now() - schedule.startTime;
            const remaining = schedule.endTime - Date.now();

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `${ui.stop}\n\n`;
            response += `┌─ *SCHEDULE DATA* ${ui.line.repeat(10)}\n`;
            response += `│\n`;
            response += `│ 👤 *User:* ${schedule.userName}\n`;
            response += `│ 📨 *Messages Sent:* ${schedule.sentCount}\n`;
            response += `│ ⏱️ *Time Elapsed:* ${formatTime(elapsed)}\n`;
            response += `│ ⏳ *Time Remaining:* ${formatTime(remaining)}\n`;
            response += `│ 🔄 *Delays Used:* ${schedule.delays.join(', ')}s\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `_VEX Scheduler - Created by Lupin Starnley_`;

            return m.reply(response);
        }

        // =========================
        // STATUS COMMAND
        // =========================
        if (args[0]?.toLowerCase() === 'status' || args[0]?.toLowerCase() === 'list') {
            if (!activeSchedules.has(chatId)) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n✅ No active schedule.\n\n_VEX Scheduler v2.0_`);
            }

            const schedule = activeSchedules.get(chatId);
            const elapsed = Date.now() - schedule.startTime;
            const remaining = schedule.endTime - Date.now();
            const progress = Math.round((elapsed / (schedule.endTime - schedule.startTime)) * 100);

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `📊 *ACTIVE SCHEDULE*\n\n`;
            response += `┌─ *STATUS* ${ui.line.repeat(12)}\n`;
            response += `│\n`;
            response += `│ 👤 *User:* ${schedule.userName}\n`;
            response += `│ 📨 *Messages:* ${schedule.sentCount}/${schedule.totalMessages}\n`;
            response += `│ 📈 *Progress:* ${progress}%\n`;
            response += `│ ⏱️ *Elapsed:* ${formatTime(elapsed)}\n`;
            response += `│ ⏳ *Remaining:* ${formatTime(remaining)}\n`;
            response += `│ 🔄 *Next Delay:* ${schedule.nextDelay}s\n`;
            response += `│ 📝 *Messages:* ${schedule.messages.length}\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `_Use ${prefix}send cancel to stop_`;

            return m.reply(response);
        }

        // =========================
        // PARSE COMMAND
        // =========================
        const fullText = args.join(' ');
        if (!fullText) {
            return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n*Usage:*\n${prefix}send <msg1> then <msg2> for <duration>\n${prefix}send <msg> for <duration>\n${prefix}send cancel\n${prefix}send status\n\n*Examples:*\n${prefix}send buy bank then sell candle for 5m\n${prefix}send hello world for 1h\n${prefix}send test message for 2d\n\n*Duration:* 1m, 5m, 1h, 2h, 1d, 7d\n\n_VEX Scheduler v2.0_`);
        }

        // Check if already running
        if (activeSchedules.has(chatId)) {
            return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n⚠️ Schedule already running!\n\nUse ${prefix}send cancel to stop it first.\n\n_VEX Scheduler v2.0_`);
        }

        // Parse: "send msg1 then msg2 for 5m" OR "send msg for 5m"
        const forMatch = fullText.match(/(.+?)\s+for\s+(\d+[mhd])/i);
        if (!forMatch) {
            return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Invalid format!\n\n*Correct:*\n${prefix}send <message> for <duration>\n${prefix}send <msg1> then <msg2> for <duration>\n\n*Duration:* 1m, 5m, 1h, 2h, 1d\n\n_VEX Scheduler v2.0_`);
        }

        const messagePart = forMatch[1].trim();
        const durationStr = forMatch[2].toLowerCase();

        // Parse messages
        let messages = [];
        if (messagePart.includes(' then ')) {
            messages = messagePart.split(' then ').map(m => m.trim()).filter(m => m);
        } else {
            messages = [messagePart];
        }

        if (messages.length === 0) {
            return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ No message provided!\n\n_VEX Scheduler v2.0_`);
        }

        // Parse duration
        const durationMatch = durationStr.match(/^(\d+)([mhd])$/);
        if (!durationMatch) {
            return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Invalid duration!\n\n*Valid:* 1m, 5m, 1h, 2h, 1d, 7d\n\n_VEX Scheduler v2.0_`);
        }

        const value = parseInt(durationMatch[1]);
        const unit = durationMatch[2];
        const multipliers = { m: 60000, h: 3600000, d: 86400000 };
        const totalMs = value * multipliers[unit];

        if (totalMs < 60000) {
            return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Minimum duration: 1m\n\n_VEX Scheduler v2.0_`);
        }

        if (totalMs > 604800000) {
            return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Maximum duration: 7d\n\n_VEX Scheduler v2.0_`);
        }

        // Calculate safe delays - anti-ban
        const minDelay = 8000; // 8 seconds minimum
        const maxMessages = Math.floor(totalMs / minDelay);
        const totalMessages = Math.min(maxMessages, 200); // Cap at 200 messages

        if (totalMessages < 2) {
            return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Duration too short for multiple messages!\n\nMinimum: ${Math.ceil(16000 / 60000)}m for 2 messages\n\n_VEX Scheduler v2.0_`);
        }

        const avgDelay = Math.floor(totalMs / totalMessages);

        // =========================
        // START SCHEDULE
        // =========================
        const userName = m.pushName || userId.split('@')[0];
        const schedule = {
            userId,
            userName,
            messages,
            startTime: Date.now(),
            endTime: Date.now() + totalMs,
            totalMessages,
            sentCount: 0,
            delays: [],
            nextDelay: 0,
            timer: null
        };

        activeSchedules.set(chatId, schedule);

        // Send confirmation
        let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
        response += `${ui.success}\n\n`;
        response += `┌─ *SCHEDULE DATA* ${ui.line.repeat(10)}\n`;
        response += `│\n`;
        response += `│ 👤 *User:* ${userName}\n`;
        response += `│ 📨 *Messages:* ${messages.length}\n`;
        response += `│ 🔄 *Total Sends:* ~${totalMessages}\n`;
        response += `│ ⏱️ *Duration:* ${durationStr}\n`;
        response += `│ 🛡️ *Avg Delay:* ${Math.round(avgDelay / 1000)}s\n`;
        response += `│ 🎯 *Target:* ${chatId.includes('@g.us')? 'Group' : chatId.includes('@newsletter')? 'Channel' : 'DM'}\n`;
        response += `│\n`;
        response += `└${ui.line.repeat(25)}\n\n`;
        response += `*Messages:*\n`;
        messages.forEach((msg, i) => {
            response += `${i + 1}. ${msg}\n`;
        });
        response += `\n_VEX Scheduler - Created by Lupin Starnley_`;

        await m.reply(response);

        // Start sending loop
        scheduleLoop(chatId, sock);
    }
};

// =========================
// SCHEDULE LOOP
// =========================
async function scheduleLoop(chatId, sock) {
    const schedule = activeSchedules.get(chatId);
    if (!schedule) return;

    const now = Date.now();

    // Check if time expired
    if (now >= schedule.endTime) {
        const elapsed = now - schedule.startTime;
        const avgDelay = schedule.delays.length > 0
           ? Math.round(schedule.delays.reduce((a, b) => a + b, 0) / schedule.delays.length)
            : 0;

        let response = `☣️ 𝖁𝕰𝖃 𝕾𝕮𝕳𝕰𝕯𝖀𝕷𝕰𝕽 ☣️\n${'━'.repeat(30)}\n\n`;
        response += `✅ 𝕾𝕮𝕳𝕰𝕯𝖀𝕷𝕰 𝕮𝕺𝕸𝕻𝕷𝕰𝕿𝕰\n\n`;
        response += `┌─ *FINAL REPORT* ${'━'.repeat(10)}\n`;
        response += `│\n`;
        response += `│ 👤 *User:* ${schedule.userName}\n`;
        response += `│ 📨 *Total Sent:* ${schedule.sentCount}\n`;
        response += `│ ⏱️ *Duration:* ${formatTime(elapsed)}\n`;
        response += `│ 🔄 *Avg Delay:* ${avgDelay}s\n`;
        response += `│ 📊 *Delays Used:* ${schedule.delays.slice(-5).join(', ')}s\n`;
        response += `│\n`;
        response += `└${'━'.repeat(25)}\n\n`;
        response += `_VEX Scheduler - Created by Lupin Starnley_`;

        await sock.sendMessage(chatId, { text: response });
        activeSchedules.delete(chatId);
        return;
    }

    // Send message
    const msgIndex = schedule.sentCount % schedule.messages.length;
    const messageToSend = schedule.messages[msgIndex];

    try {
        await sock.sendMessage(chatId, { text: messageToSend });
        schedule.sentCount++;
    } catch (err) {
        console.error('SCHEDULE SEND ERROR:', err);
    }

    // Calculate next delay - anti-ban with randomization
    const remaining = schedule.endTime - Date.now();
    const remainingMessages = schedule.totalMessages - schedule.sentCount;

    let nextDelay;
    if (remainingMessages <= 1) {
        nextDelay = remaining;
    } else {
        const baseDelay = remaining / remainingMessages;
        // Randomize ±30% for anti-ban
        const variance = baseDelay * 0.3;
        nextDelay = Math.max(8000, Math.floor(baseDelay + (Math.random() * variance * 2 - variance)));
    }

    schedule.delays.push(Math.round(nextDelay / 1000));
    schedule.nextDelay = Math.round(nextDelay / 1000);

    // Schedule next send
    schedule.timer = setTimeout(() => scheduleLoop(chatId, sock), nextDelay);
}

// =========================
// HELPERS
// =========================
function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
