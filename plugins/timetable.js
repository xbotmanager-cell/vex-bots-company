const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// =========================
// RAM STORAGE - MAP ONLY
// =========================
const timetables = new Map(); // userId -> timetable data
const conversations = new Map(); // userId -> conversation state

// Style reactions
const STYLE_REACTS = {
    harsh: "📅",
    normal: "📚",
    girl: "🎀"
};

module.exports = {
    command: "timetable",
    category: "education",
    description: "VEX AI Timetable Builder - Conversational AI study planner with image export",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'harsh';
        const userId = m.sender;
        const userName = m.pushName || userId.split('@')[0];
        const input = args.join(' ').trim();

        // 1. REACT IMMEDIATELY
        await sock.sendMessage(m.chat, { react: { text: STYLE_REACTS[style], key: m.key } });

        try {
            // Check if in conversation mode
            if (conversations.has(userId)) {
                await handleConversation(m, sock, userId, input, style);
                return;
            }

            // =========================
            // 1. LIST EXISTING
            // =========================
            if (input.toLowerCase() === 'list' || input.toLowerCase() === 'show') {
                const userTT = timetables.get(userId);
                if (!userTT) throw new Error('No timetable found. Create one:.timetable Math Mon 8pm');

                const output = formatTimetableText(style, userTT, userName);
                await sock.sendMessage(m.chat, { text: output }, { quoted: m });
                return;
            }

            // =========================
            // 2. DELETE
            // =========================
            if (input.toLowerCase() === 'delete' || input.toLowerCase() === 'clear') {
                timetables.delete(userId);
                conversations.delete(userId);
                await m.reply(`🗑️ *TIMETABLE DELETED*\n\nRAM cleared. Create new:.timetable\n\n- VEX AI`);
                return;
            }

            // =========================
            // 3. DIRECT INPUT - TRY PARSE
            // =========================
            if (input.length > 0 &&!input.toLowerCase().startsWith('create')) {
                const parsed = await parseTimetableWithAI(input, style);

                if (parsed.needsMoreInfo) {
                    // Start conversation
                    conversations.set(userId, {
                        step: 'collecting',
                        data: parsed.partialData || {},
                        questions: parsed.questions,
                        currentQ: 0
                    });

                    await m.reply(formatQuestion(style, parsed.questions[0], userName));
                    return;
                }

                // Got complete data
                timetables.set(userId, parsed.timetable);
                await sendTimetableOutput(m, sock, parsed.timetable, style, userName);
                return;
            }

            // =========================
            // 4. START CONVERSATION MODE
            // =========================
            conversations.set(userId, {
                step: 'init',
                data: { subjects: [] },
                questions: [
                    "Ni masomo gani unataka kuweka kwa timetable? (e.g., Math, Science, English)",
                    "Una masaa mangapi kwa siku ya kusoma?",
                    "Unapendelea kusoma asubuhi, mchana, au jioni?",
                    "Una siku gani za wiki za kusoma? (Mon-Sun)",
                    "Una mtihani wowote karibuni? Taja subject na tarehe"
                ],
                currentQ: 0
            });

            await m.reply(formatQuestion(style, conversations.get(userId).questions[0], userName));

        } catch (error) {
            await m.reply(`❌ *VEX AI ERROR*\n\n${error.message}\n\n*Usage:*\n.timetable Math Mon 8pm, Science Tue 7pm\n.timetable create - Start conversation\n.timetable list - Show current\n\n_Powered by VEX AI - Lupin Starnley_`);
        }
    }
};

// =========================
// CONVERSATION HANDLER
// =========================

async function handleConversation(m, sock, userId, input, style) {
    const conv = conversations.get(userId);

    if (input.toLowerCase() === 'cancel' || input.toLowerCase() === 'stop') {
        conversations.delete(userId);
        await m.reply(`❌ Conversation cancelled. Start again:.timetable`);
        return;
    }

    // Store answer
    const qIndex = conv.currentQ;
    if (qIndex === 0) conv.data.subjects = input.split(',').map(s => s.trim());
    if (qIndex === 1) conv.data.hoursPerDay = input;
    if (qIndex === 2) conv.data.preferredTime = input;
    if (qIndex === 3) conv.data.days = input;
    if (qIndex === 4) conv.data.exams = input;

    conv.currentQ++;

    // More questions?
    if (conv.currentQ < conv.questions.length) {
        await m.reply(formatQuestion(style, conv.questions[conv.currentQ], m.pushName));
        return;
    }

    // All done - Generate timetable with AI
    conversations.delete(userId);
    const timetable = await generateTimetableWithAI(conv.data, style);

    timetables.set(userId, timetable);
    await sendTimetableOutput(m, sock, timetable, style, m.pushName);
}

// =========================
// AI PARSER
// =========================

async function parseTimetableWithAI(text, style) {
    if (!GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY required for AI parsing');
    }

    const prompt = `You are VEX AI, timetable assistant made by Lupin Starnley. Parse this timetable request.

User input: "${text}"

Extract subjects, days, times. If missing critical info, return needsMoreInfo=true with questions.
If complete, return full timetable structure.

Return JSON only:
{
  "needsMoreInfo": boolean,
  "partialData": {},
  "questions": ["question1", "question2"],
  "timetable": {
    "subjects": [{"name": "", "day": "", "time": "", "duration": ""}],
    "week": "Mon-Sun",
    "created": "ISO date"
  }
}`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 800
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

async function generateTimetableWithAI(data, style) {
    const prompt = `You are VEX AI by Lupin Starnley. Create optimal weekly study timetable.

User data:
Subjects: ${data.subjects.join(', ')}
Hours per day: ${data.hoursPerDay}
Preferred time: ${data.preferredTime}
Days: ${data.days}
Exams: ${data.exams}

Create balanced timetable with:
1. Spread subjects across week
2. More time for exam subjects
3. Breaks between sessions
4. Peak focus times

Return JSON:
{
  "subjects": [{"name": "", "day": "", "time": "", "duration": "1hr", "priority": "High/Medium/Low"}],
  "week": "Mon-Sun",
  "totalHours": 0,
  "tips": ["tip1", "tip2"]
}`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
    }, {
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    const content = response.data.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch[0]);
}

// =========================
// OUTPUT - IMAGE + TEXT FALLBACK
// =========================

async function sendTimetableOutput(m, sock, timetable, style, userName) {
    try {
        // Try create image with ffmpeg
        const imagePath = await createTimetableImage(timetable, style, userName);

        await sock.sendMessage(m.chat, {
            image: { url: imagePath },
            caption: formatTimetableCaption(style, timetable)
        }, { quoted: m });

        // Clean RAM after sending
        setTimeout(() => {
            fs.unlinkSync(imagePath);
        }, 5000);

    } catch (error) {
        // Fallback to text
        const textOutput = formatTimetableText(style, timetable, userName);
        await sock.sendMessage(m.chat, { text: textOutput }, { quoted: m });
    }
}

async function createTimetableImage(timetable, style, userName) {
    const colors = {
        harsh: { bg: 'black', text: 'white', accent: 'red' },
        normal: { bg: 'white', text: 'black', accent: 'blue' },
        girl: { bg: 'pink', text: 'purple', accent: 'magenta' }
    };

    const c = colors[style];
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const outputPath = path.join(tempDir, `tt_${Date.now()}.png`);

    // Create text file for ffmpeg
    const textContent = formatTimetableText(style, timetable, userName);
    const txtPath = path.join(tempDir, `tt_${Date.now()}.txt`);
    fs.writeFileSync(txtPath, textContent);

    // FFMPEG command to create image from text
    const cmd = `ffmpeg -f lavfi -i color=c=${c.bg}:s=1080x1920:d=1 -vf "drawtext=textfile='${txtPath}':fontcolor=${c.text}:fontsize=32:x=50:y=50" -frames:v 1 -y "${outputPath}"`;

    await execPromise(cmd);
    fs.unlinkSync(txtPath);

    return outputPath;
}

// =========================
// FORMATTERS
// =========================

function formatTimetableText(style, tt, userName) {
    const modes = {
        harsh: { title: "☣️ 𝖁𝕰𝖃 𝕬𝕴 𝕿𝕴𝕸𝕰𝕿𝕬𝕭𝕷𝕰 ☣️", line: "━" },
        normal: { title: "📚 VEX AI STUDY TIMETABLE 📚", line: "─" },
        girl: { title: "🫧 𝒱𝑒𝓍 𝒜𝐼 𝒮𝓉𝓊𝒹𝓎 𝒫𝓁𝒶𝓃 🫧", line: "┄" }
    };

    const current = modes[style];
    let output = `*${current.title}*\n${current.line.repeat(30)}\n\n`;
    output += `👤 *Student:* ${userName}\n📊 *Total Hours:* ${tt.totalHours || 'N/A'}/week\n\n`;

    // Group by day
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const byDay = {};

    tt.subjects.forEach(s => {
        if (!byDay[s.day]) byDay[s.day] = [];
        byDay[s.day].push(s);
    });

    days.forEach(day => {
        if (byDay[day] && byDay[day].length > 0) {
            output += `*${day.toUpperCase()}*\n`;
            byDay[day].forEach(s => {
                const priority = s.priority === 'High'? '🔴' : s.priority === 'Medium'? '🟡' : '🟢';
                output += `${priority} ${s.time} - ${s.name} (${s.duration})\n`;
            });
            output += `\n`;
        }
    });

    if (tt.tips) {
        output += `*💡 VEX AI TIPS:*\n`;
        tt.tips.forEach(tip => output += `• ${tip}\n`);
        output += `\n`;
    }

    output += `${current.line.repeat(30)}\n_Created by VEX AI - Lupin Starnley_`;
    return output;
}

function formatTimetableCaption(style, tt) {
    return `📚 *Your Weekly Study Plan*\n\nTotal: ${tt.totalHours || 'N/A'} hours/week\nSubjects: ${tt.subjects.length}\n\nSave this image!\n\n- VEX AI`;
}

function formatQuestion(style, question, userName) {
    const modes = {
        harsh: `☣️ 𝕼𝖀𝕰𝕾𝕿𝕴𝕺𝕹 ☣️\n\n${question}\n\nAnswer or type 'cancel'`,
        normal: `📚 *VEX AI QUESTION*\n\n${userName}, ${question}\n\nType your answer or 'cancel'`,
        girl: `🫧 𝒱𝑒𝓍 𝒜𝐼 𝒬𝓊𝑒𝓈𝓉𝒾𝑜𝓃 🫧\n\n${question}~\n\nTell me or type 'cancel'~`
    };
    return modes[style];
}
