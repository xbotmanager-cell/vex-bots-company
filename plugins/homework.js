const axios = require('axios');
const fs = require('fs');
const path = require('path');

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// =========================
// DATABASE - RAM ONLY
// =========================
const homeworkDB = new Map(); // userId -> [homework items]
const reminderQueue = new Map(); // userId -> timeouts

// =========================
// AUTO REMINDER SYSTEM
// =========================
function scheduleReminder(userId, homeworkId, dueDate, sock) {
    const now = Date.now();
    const dueTime = new Date(dueDate).getTime();
    const reminderTime = dueTime - (24 * 60 * 60 * 1000); // 1 day before

    if (reminderTime > now) {
        const timeout = setTimeout(async () => {
            const userHW = homeworkDB.get(userId);
            const hw = userHW?.find(h => h.id === homeworkId);
            if (hw &&!hw.completed) {
                await sock.sendMessage(userId, {
                    text: `⏰ *VEX AI REMINDER*\n\n📚 Homework due TOMORROW!\n\n*Subject:* ${hw.subject}\n*Task:* ${hw.task}\n*Due:* ${hw.dueDate}\n*Priority:* ${hw.priority}\n\nDon't forget! - VEX AI`
                });
            }
            reminderQueue.delete(`${userId}_${homeworkId}`);
        }, reminderTime - now);

        reminderQueue.set(`${userId}_${homeworkId}`, timeout);
    }
}

module.exports = {
    command: "homework",
    category: "education",
    description: "VEX AI Homework Tracker - Smart deadline manager with AI parsing",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'harsh';
        const userId = m.sender;
        const userName = m.pushName || userId.split('@')[0];
        const input = args.join(' ').trim();

        // 1. REACT BY STYLE - NO PRE MESSAGE
        const reacts = { harsh: "📚", normal: "📖", girl: "🎀" };
        await sock.sendMessage(m.chat, { react: { text: reacts[style], key: m.key } });

        // Initialize user DB
        if (!homeworkDB.has(userId)) {
            homeworkDB.set(userId, []);
        }

        const userHW = homeworkDB.get(userId);

        try {
            // =========================
            // 1. ADD HOMEWORK - AI PARSE
            // =========================
            if (input.toLowerCase().startsWith('add') || (!input.startsWith('list') &&!input.startsWith('done') &&!input.startsWith('delete') &&!input.startsWith('clear') && input.length > 0)) {

                const homeworkText = input.replace(/^add\s+/i, '');

                if (!GROQ_API_KEY) {
                    throw new Error('GROQ_API_KEY required for AI parsing');
                }

                // AI Parse natural language
                const aiData = await parseHomeworkWithAI(homeworkText);

                const newHW = {
                    id: Date.now().toString(),
                    subject: aiData.subject,
                    task: aiData.task,
                    dueDate: aiData.dueDate,
                    priority: aiData.priority || 'Medium',
                    completed: false,
                    created: new Date().toISOString(),
                    createdBy: 'VEX AI'
                };

                userHW.push(newHW);
                homeworkDB.set(userId, userHW);

                // Schedule reminder
                if (aiData.dueDate) {
                    scheduleReminder(userId, newHW.id, aiData.dueDate, sock);
                }

                const output = formatAddSuccess(style, newHW, userHW.length);
                await sock.sendMessage(m.chat, { text: output }, { quoted: m });
                return;
            }

            // =========================
            // 2. LIST HOMEWORK
            // =========================
            if (input.toLowerCase().startsWith('list') || input === '') {
                if (userHW.length === 0) {
                    await m.reply(formatEmptyList(style));
                    return;
                }

                const filter = args[1]?.toLowerCase(); // pending, done, today, week
                let filtered = userHW;

                if (filter === 'pending') {
                    filtered = userHW.filter(h =>!h.completed);
                } else if (filter === 'done' || filter === 'completed') {
                    filtered = userHW.filter(h => h.completed);
                } else if (filter === 'today') {
                    const today = new Date().toDateString();
                    filtered = userHW.filter(h => new Date(h.dueDate).toDateString() === today);
                } else if (filter === 'week') {
                    const weekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
                    filtered = userHW.filter(h => new Date(h.dueDate).getTime() <= weekFromNow);
                }

                const output = formatHomeworkList(style, filtered, userName);
                await sock.sendMessage(m.chat, { text: output }, { quoted: m });
                return;
            }

            // =========================
            // 3. MARK DONE
            // =========================
            if (input.toLowerCase().startsWith('done')) {
                const idOrSubject = args[1];
                if (!idOrSubject) throw new Error('Specify homework:.homework done Math');

                const hwIndex = userHW.findIndex(h =>
                    h.id === idOrSubject ||
                    h.subject.toLowerCase().includes(idOrSubject.toLowerCase()) ||
                    h.task.toLowerCase().includes(idOrSubject.toLowerCase())
                );

                if (hwIndex === -1) throw new Error('Homework not found');

                userHW[hwIndex].completed = true;
                userHW[hwIndex].completedAt = new Date().toISOString();
                homeworkDB.set(userId, userHW);

                // Cancel reminder
                const reminderKey = `${userId}_${userHW[hwIndex].id}`;
                if (reminderQueue.has(reminderKey)) {
                    clearTimeout(reminderQueue.get(reminderKey));
                    reminderQueue.delete(reminderKey);
                }

                const output = formatDoneSuccess(style, userHW[hwIndex]);
                await sock.sendMessage(m.chat, { text: output }, { quoted: m });
                return;
            }

            // =========================
            // 4. DELETE HOMEWORK
            // =========================
            if (input.toLowerCase().startsWith('delete') || input.toLowerCase().startsWith('del')) {
                const idOrSubject = args[1];
                if (!idOrSubject) throw new Error('Specify homework to delete');

                const hwIndex = userHW.findIndex(h =>
                    h.id === idOrSubject ||
                    h.subject.toLowerCase().includes(idOrSubject.toLowerCase())
                );

                if (hwIndex === -1) throw new Error('Homework not found');

                const deleted = userHW.splice(hwIndex, 1)[0];
                homeworkDB.set(userId, userHW);

                await m.reply(formatDeleteSuccess(style, deleted));
                return;
            }

            // =========================
            // 5. CLEAR ALL
            // =========================
            if (input.toLowerCase() === 'clear' || input.toLowerCase() === 'clear all') {
                const count = userHW.length;
                homeworkDB.set(userId, []);

                // Clear all reminders
                reminderQueue.forEach((timeout, key) => {
                    if (key.startsWith(userId)) {
                        clearTimeout(timeout);
                        reminderQueue.delete(key);
                    }
                });

                await m.reply(formatClearSuccess(style, count));
                return;
            }

            throw new Error('Invalid command');

        } catch (error) {
            await m.reply(`❌ *VEX AI ERROR*\n\n${error.message}\n\n${getHelpText(style)}`);
        }
    }
};

// =========================
// AI PARSER - GROQ
// =========================

async function parseHomeworkWithAI(text) {
    const today = new Date().toISOString().split('T')[0];

    const prompt = `You are VEX AI, a homework assistant made by Lupin Starnley. Parse this homework request and return ONLY valid JSON.

User input: "${text}"
Today is: ${today}

Extract:
1. subject: Math, Science, English, History, etc (capitalize first letter)
2. task: What to do (e.g., "page 45 exercises 1-5", "read chapter 3")
3. dueDate: Convert to YYYY-MM-DD format. "tomorrow" = ${new Date(Date.now() + 86400000).toISOString().split('T')[0]}, "Friday" = next Friday, "next week" = 7 days from now. If no date, use 3 days from now.
4. priority: High/Medium/Low based on urgency words or due date

Return JSON only:
{"subject": "", "task": "", "dueDate": "", "priority": ""}`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 200
    }, {
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    const content = response.data.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI parsing failed');

    return JSON.parse(jsonMatch[0]);
}

// =========================
// FORMATTERS
// =========================

function formatAddSuccess(style, hw, total) {
    const modes = {
        harsh: {
            title: "☣️ 𝕳𝕺𝕸𝕰𝖂𝕺𝕽𝕶 𝕷𝕺𝕲𝕰𝕯 ☣️",
            line: "━"
        },
        normal: {
            title: "📚 VEX AI - HOMEWORK ADDED 📚",
            line: "─"
        },
        girl: {
            title: "🫧 𝒱𝑒𝓍 𝒜𝐼 𝐻𝑜𝓂𝑒𝓌𝑜𝓇𝓀 𝒯𝓇𝒶𝒸𝓀𝑒𝓇 🫧",
            line: "┄"
        }
    };

    const current = modes[style];
    const dueIn = getDaysUntil(hw.dueDate);

    return `*${current.title}*\n${current.line.repeat(25)}\n\n` +
        `✅ *Added Successfully!*\n\n` +
        `📖 *Subject:* ${hw.subject}\n` +
        `📝 *Task:* ${hw.task}\n` +
        `📅 *Due:* ${hw.dueDate} (${dueIn})\n` +
        `⚡ *Priority:* ${hw.priority}\n` +
        `🆔 *ID:* ${hw.id}\n\n` +
        `${current.line.repeat(25)}\n` +
        `Total homework: ${total} | Powered by VEX AI\n` +
        `_Created by Lupin Starnley_`;
}

function formatHomeworkList(style, homeworks, userName) {
    const modes = {
        harsh: { title: "☣️ 𝖄𝕺𝖀𝕽 𝕸𝕴𝕾𝕴𝕺𝕹𝕾 ☣️", line: "━" },
        normal: { title: "📚 YOUR HOMEWORK LIST 📚", line: "─" },
        girl: { title: "🫧 𝒴𝑜𝓊𝓇 𝒮𝓉𝓊𝒹𝓎 𝐿𝒾𝓈𝓉 🫧", line: "┄" }
    };

    const current = modes[style];

    if (homeworks.length === 0) {
        return `*${current.title}*\n${current.line.repeat(25)}\n\n✅ No homework found!\n\nYou're all caught up, ${userName}!`;
    }

    // Sort by due date
    homeworks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    let output = `*${current.title}*\n${current.line.repeat(25)}\n\n`;
    output += `👤 *Student:* ${userName}\n📊 *Total:* ${homeworks.length}\n\n`;

    homeworks.forEach((hw, i) => {
        const status = hw.completed? '✅' : getPriorityEmoji(hw.priority);
        const dueIn = getDaysUntil(hw.dueDate);
        const overdue = new Date(hw.dueDate) < new Date() &&!hw.completed;

        output += `${i + 1}. ${status} *${hw.subject}*\n`;
        output += ` 📝 ${hw.task}\n`;
        output += ` 📅 Due: ${hw.dueDate} ${overdue? '⚠️ OVERDUE' : `(${dueIn})`}\n`;
        output += ` 🆔 ${hw.id}\n\n`;
    });

    output += `${current.line.repeat(25)}\n_VEX AI by Lupin Starnley_`;
    return output;
}

function formatDoneSuccess(style, hw) {
    return `✅ *COMPLETED!*\n\n📖 ${hw.subject}\n📝 ${hw.task}\n\n🎉 Good job! Keep it up!\n\n- VEX AI`;
}

function formatDeleteSuccess(style, hw) {
    return `🗑️ *DELETED*\n\n📖 ${hw.subject}\n📝 ${hw.task}\n\nRemoved from tracker.`;
}

function formatClearSuccess(style, count) {
    return `🗑️ *CLEARED*\n\nDeleted ${count} homework items.\n\nFresh start! - VEX AI`;
}

function formatEmptyList(style) {
    return `📚 *NO HOMEWORK*\n\nYou have no homework tracked.\n\nAdd one:.homework add Math pg 45 due Friday\n\n- VEX AI`;
}

function getHelpText(style) {
    return `📚 *VEX AI HOMEWORK TRACKER*\n\n*ADD:*\n.homework add Math page 45 due Friday\n.homework Math exercises 1-5 tomorrow\n.homework Science project due next week\n\n*MANAGE:*\n.homework list - Show all\n.homework list pending - Show incomplete\n.homework list today - Due today\n.homework done Math - Mark complete\n.homework delete Math - Remove\n.homework clear - Delete all\n\n*AI FEATURES:*\n✅ Understands natural language\n✅ Auto-detects dates\n✅ Smart reminders\n✅ Priority detection\n\n_Powered by VEX AI - Created by Lupin Starnley_`;
}

function getPriorityEmoji(priority) {
    const map = { High: '🔴', Medium: '🟡', Low: '🟢' };
    return map[priority] || '⚪';
}

function getDaysUntil(dateStr) {
    const due = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

    if (diff < 0) return `${Math.abs(diff)} days overdue`;
    if (diff === 0) return 'Due today';
    if (diff === 1) return 'Due tomorrow';
    return `Due in ${diff} days`;
}
