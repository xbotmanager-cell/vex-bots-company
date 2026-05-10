const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const { createClient } = require('@supabase/supabase-js');

// =========================
// SUPABASE - FORCED
// =========================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROY_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false }
    });
}

// =========================
// CONFIG
// =========================
const TIMETABLE_IMAGE = 'https://i.ibb.co/Myk40VZF/Chat-GPT-Image-May-10-2026-12-07-48-PM.png';
const TMP_DIR = path.join(__dirname, '../tmp');

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
}

// =========================
// RAM STORAGE - MAP ONLY
// =========================
const timetables = new Map(); // userId -> timetable data
const conversations = new Map(); // userId -> conversation state

// Style reactions - NINJA STARS
const STYLE_REACTS = {
    harsh: "⭒",
    normal: "📚",
    girl: "✧"
};

module.exports = {
    command: "timetable",
    alias: ["tm", "schedule", "study"],
    category: "education",
    description: "VEX AI Timetable Pro - 6 AI Systems, Image Export, Smart Planning",

    async execute(m, sock, { args, userSettings, user }) {
        const style = userSettings?.style || 'harsh';
        const userId = m.sender;
        const userName = m.pushName || userId.split('@')[0];
        const lang = userSettings?.lang || 'en';
        const input = args.join(' ').trim();

        // 1. REACT IMMEDIATELY
        await sock.sendMessage(m.chat, { react: { text: STYLE_REACTS[style], key: m.key } });

        try {
            // Check if in conversation mode
            if (conversations.has(userId)) {
                await handleConversation(m, sock, userId, input, style, lang, userName);
                return;
            }

            // =========================
            // 0. MENU / HELP
            // =========================
            if (!input || input.toLowerCase() === 'help' || input.toLowerCase() === 'menu') {
                await sendMenu(m, sock, style, lang);
                return;
            }

            // =========================
            // 1. LIST EXISTING
            // =========================
            if (input.toLowerCase() === 'list' || input.toLowerCase() === 'show') {
                const userTT = await getTimetable(userId);
                if (!userTT) throw new Error(lang === 'sw'? 'Hakuna ratiba. Unda:.timetable Math Mon 8pm' : 'No timetable found. Create:.timetable Math Mon 8pm');

                const output = formatTimetableText(style, userTT, userName, lang);
                await sock.sendMessage(m.chat, { text: output }, { quoted: m });
                return;
            }

            // =========================
            // 2. DELETE
            // =========================
            if (input.toLowerCase() === 'delete' || input.toLowerCase() === 'clear') {
                await deleteTimetable(userId);
                timetables.delete(userId);
                conversations.delete(userId);
                await m.reply(formatDelete(style, lang));
                return;
            }

            // =========================
            // 3. EXPORT
            // =========================
            if (input.toLowerCase() === 'export' || input.toLowerCase() === 'image') {
                const userTT = await getTimetable(userId);
                if (!userTT) throw new Error(lang === 'sw'? 'Hakuna ratiba ya export' : 'No timetable to export');
                await sendTimetableOutput(m, sock, userTT, style, userName, lang);
                return;
            }

            // =========================
            // 4. DIRECT INPUT - TRY PARSE
            // =========================
            if (input.length > 0 &&!input.toLowerCase().startsWith('create')) {
                const parsed = await parseTimetableWithAI(input, style, lang, userName);

                if (parsed.needsMoreInfo) {
                    conversations.set(userId, {
                        step: 'collecting',
                        data: parsed.partialData || {},
                        questions: parsed.questions,
                        currentQ: 0,
                        lang: lang,
                        userName: userName
                    });

                    await m.reply(formatQuestion(style, parsed.questions[0], userName, lang));
                    return;
                }

                // Got complete data
                await saveTimetable(userId, m.chat, parsed.timetable);
                timetables.set(userId, parsed.timetable);
                await sendTimetableOutput(m, sock, parsed.timetable, style, userName, lang);
                return;
            }

            // =========================
            // 5. START CONVERSATION MODE
            // =========================
            const questions = lang === 'sw'? [
                "Ni masomo gani unataka kuweka? (mf: Math, Science, English)",
                "Una masaa mangapi kwa siku ya kusoma?",
                "Unapendelea asubuhi, mchana, au jioni?",
                "Siku gani za wiki? (Jumatatu-Jumapili)",
                "Mtihani wowote karibuni? Taja subject na tarehe"
            ] : [
                "What subjects do you want in your timetable? (e.g., Math, Science, English)",
                "How many hours per day can you study?",
                "Do you prefer morning, afternoon, or evening?",
                "Which days of the week? (Mon-Sun)",
                "Any upcoming exams? Mention subject and date"
            ];

            conversations.set(userId, {
                step: 'init',
                data: { subjects: [] },
                questions: questions,
                currentQ: 0,
                lang: lang,
                userName: userName
            });

            await m.reply(formatQuestion(style, questions[0], userName, lang));

        } catch (error) {
            await m.reply(formatError(style, error.message, lang));
        }
    }
};

// =========================
// CONVERSATION HANDLER
// =========================
async function handleConversation(m, sock, userId, input, style, lang, userName) {
    const conv = conversations.get(userId);

    if (['cancel', 'stop', 'acha', 'sitisha'].includes(input.toLowerCase())) {
        conversations.delete(userId);
        await m.reply(lang === 'sw'? `✧ ❌ Imefutwa. Anza tena:.timetable` : `✧ ❌ Cancelled. Start again:.timetable`);
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
        await m.reply(formatQuestion(style, conv.questions[conv.currentQ], userName, lang));
        return;
    }

    // All done - Generate timetable with AI
    conversations.delete(userId);
    const timetable = await generateTimetableWithAI(conv.data, style, lang, userName);

    await saveTimetable(userId, m.chat, timetable);
    timetables.set(userId, timetable);
    await sendTimetableOutput(m, sock, timetable, style, userName, lang);
}

// =========================
// 6 AI FALLBACK SYSTEM
// =========================
async function callAIWithFallback(prompt, systemPrompt) {
    const apis = [
        { name: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' },
        { name: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions', key: process.env.OPENROUTER_API_KEY, model: 'meta-llama/llama-3.1-70b-instruct' },
        { name: 'gemini', url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, key: process.env.GEMINI_API_KEY, model: null },
        { name: 'sambanova', url: 'https://api.sambanova.ai/v1/chat/completions', key: process.env.SAMBANOVA_API_KEY, model: 'Meta-Llama-3.1-70B-Instruct' },
        { name: 'cerebras', url: 'https://api.cerebras.ai/v1/chat/completions', key: process.env.CEREBRAS_API_KEY, model: 'llama3.1-70b' },
        { name: 'cloudflare', url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-70b-instruct`, key: process.env.CLOUDFLARE_API_KEY, model: null }
    ];

    for (const api of apis) {
        if (!api.key) continue;
        try {
            let data, headers = { 'Content-Type': 'application/json' };
            if (api.name === 'gemini') {
                data = { contents: [{ parts: [{ text: `${systemPrompt}\n\nUser: ${prompt}` }] }] };
            } else if (api.name === 'cloudflare') {
                headers['Authorization'] = `Bearer ${api.key}`;
                data = { messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }] };
            } else {
                headers['Authorization'] = `Bearer ${api.key}`;
                data = { model: api.model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], temperature: 0.2, max_tokens: 1200 };
            }
            const res = await axios.post(api.url, data, { headers, timeout: 20000 });
            if (api.name === 'gemini') return { text: res.data?.candidates?.[0]?.content?.parts?.[0]?.text, system: api.name };
            if (api.name === 'cloudflare') return { text: res.data?.result?.response, system: api.name };
            return { text: res.data?.choices?.[0]?.message?.content, system: api.name };
        } catch (e) {
            console.log(`VEX AI Fallback: ${api.name} failed`);
            continue;
        }
    }
    throw new Error('All 6 AI systems failed');
}

// =========================
// AI PARSER
// =========================
async function parseTimetableWithAI(text, style, lang, userName) {
    const systemPrompt = `You are Vex AI, timetable assistant by Lupin Starnley. Parse timetable request.
CRITICAL: Answer in ${lang === 'sw'? 'Swahili' : 'English'}. Be SHORT. User: ${userName}`;

    const prompt = `User input: "${text}"

Extract subjects, days, times. If missing critical info, return needsMoreInfo=true with questions.
If complete, return full timetable structure.

Return JSON only:
{
  "needsMoreInfo": boolean,
  "partialData": {},
  "questions": ["question1", "question2"],
  "timetable": {
    "subjects": [{"name": "", "day": "", "time": "", "duration": "", "priority": "High/Medium/Low"}],
    "week": "Mon-Sun",
    "created": "ISO date",
    "totalHours": 0,
    "tips": ["tip1", "tip2"]
  }
}`;

    const result = await callAIWithFallback(prompt, systemPrompt);
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI parsing failed');
    return JSON.parse(jsonMatch[0]);
}

async function generateTimetableWithAI(data, style, lang, userName) {
    const systemPrompt = `You are Vex AI by Lupin Starnley. Create optimal weekly study timetable.
CRITICAL: Answer in ${lang === 'sw'? 'Swahili' : 'English'}. Be CONCISE. User: ${userName}`;

    const prompt = `User data:
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
  "tips": ["tip1", "tip2", "tip3"]
}`;

    const result = await callAIWithFallback(prompt, systemPrompt);
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    const tt = JSON.parse(jsonMatch[0]);
    tt.aiSystem = result.system;
    tt.created = new Date().toISOString();
    return tt;
}

// =========================
// SUPABASE FUNCTIONS - tm_ PREFIX
// =========================
async function saveTimetable(userId, chatId, timetable) {
    if (!supabase) return;

    try {
        // 1. Save main timetable
        const { data: ttData } = await supabase.from('tm_timetables').upsert({
            user_id: userId,
            chat_id: chatId,
            week: timetable.week,
            total_hours: timetable.totalHours,
            ai_system: timetable.aiSystem,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' }).select().single();

        // 2. Delete old subjects
        await supabase.from('tm_subjects').delete().eq('timetable_id', ttData.id);

        // 3. Insert new subjects
        const subjects = timetable.subjects.map(s => ({
            timetable_id: ttData.id,
            user_id: userId,
            name: s.name,
            day: s.day,
            time: s.time,
            duration: s.duration,
            priority: s.priority
        }));

        await supabase.from('tm_subjects').insert(subjects);

        // 4. Save tips
        if (timetable.tips) {
            await supabase.from('tm_tips').delete().eq('timetable_id', ttData.id);
            const tips = timetable.tips.map(t => ({
                timetable_id: ttData.id,
                user_id: userId,
                tip: t
            }));
            await supabase.from('tm_tips').insert(tips);
        }

    } catch (e) {
        console.error('Supabase save error:', e.message);
    }
}

async function getTimetable(userId) {
    // Check RAM first
    if (timetables.has(userId)) return timetables.get(userId);

    if (!supabase) return null;

    try {
        // Get timetable
        const { data: tt } = await supabase
           .from('tm_timetables')
           .select('*')
           .eq('user_id', userId)
           .single();

        if (!tt) return null;

        // Get subjects
        const { data: subjects } = await supabase
           .from('tm_subjects')
           .select('*')
           .eq('timetable_id', tt.id)
           .order('day', { ascending: true });

        // Get tips
        const { data: tips } = await supabase
           .from('tm_tips')
           .select('tip')
           .eq('timetable_id', tt.id);

        const timetable = {
            subjects: subjects || [],
            week: tt.week,
            totalHours: tt.total_hours,
            tips: tips?.map(t => t.tip) || [],
            aiSystem: tt.ai_system,
            created: tt.created_at
        };

        timetables.set(userId, timetable);
        return timetable;

    } catch (e) {
        console.error('Supabase get error:', e.message);
        return null;
    }
}

async function deleteTimetable(userId) {
    if (!supabase) return;

    try {
        await supabase.from('tm_timetables').delete().eq('user_id', userId);
    } catch (e) {
        console.error('Supabase delete error:', e.message);
    }
}

// =========================
// IMAGE MENU
// =========================
async function sendMenu(m, sock, style, lang) {
    const imgPath = await downloadImage(TIMETABLE_IMAGE);
    const caption = formatMenu(style, lang);

    if (imgPath) {
        await sock.sendMessage(m.chat, {
            image: fs.readFileSync(imgPath),
            caption: caption
        }, { quoted: m });
        setTimeout(() => { try { fs.unlinkSync(imgPath); } catch {} }, 5000);
    } else {
        await m.reply(caption);
    }
}

async function downloadImage(url) {
    const imgPath = path.join(TMP_DIR, `tt_menu_${Date.now()}.png`);
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            timeout: 10000
        });

        const writer = fs.createWriteStream(imgPath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(imgPath));
            writer.on('error', reject);
        });
    } catch {
        return null;
    }
}

// =========================
// OUTPUT - IMAGE + TEXT FALLBACK
// =========================
async function sendTimetableOutput(m, sock, timetable, style, userName, lang) {
    try {
        const imagePath = await createTimetableImage(timetable, style, userName, lang);

        await sock.sendMessage(m.chat, {
            image: { url: imagePath },
            caption: formatTimetableCaption(style, timetable, lang)
        }, { quoted: m });

        setTimeout(() => {
            try { fs.unlinkSync(imagePath); } catch {}
        }, 5000);

    } catch (error) {
        const textOutput = formatTimetableText(style, timetable, userName, lang);
        await sock.sendMessage(m.chat, { text: textOutput }, { quoted: m });
    }
}

async function createTimetableImage(timetable, style, userName, lang) {
    const colors = {
        harsh: { bg: 'black', text: 'white', accent: 'red' },
        normal: { bg: 'white', text: 'black', accent: 'blue' },
        girl: { bg: 'pink', text: 'purple', accent: 'magenta' }
    };

    const c = colors[style];
    const outputPath = path.join(TMP_DIR, `tt_${Date.now()}.png`);
    const textContent = formatTimetableText(style, timetable, userName, lang);
    const txtPath = path.join(TMP_DIR, `tt_${Date.now()}.txt`);
    fs.writeFileSync(txtPath, textContent);

    const cmd = `ffmpeg -f lavfi -i color=c=${c.bg}:s=1080x1920:d=1 -vf "drawtext=textfile='${txtPath}':fontcolor=${c.text}:fontsize=32:x=50:y=50" -frames:v 1 -y "${outputPath}"`;

    await execPromise(cmd);
    fs.unlinkSync(txtPath);
    return outputPath;
}

// =========================
// FORMATTERS - NINJA STARS
// =========================
function formatMenu(style, lang) {
    const modes = {
        harsh: {
            title: "⭒ ☣️ 𝖁𝕰𝖃 𝕬𝕴 𝕿𝕴𝕸𝕰𝕿𝕬𝕭𝕷𝕰 ☣️ ⭒",
            line: "━"
        },
        normal: {
            title: "⭒ 📚 VEX AI TIMETABLE PRO 📚 ⭒",
            line: "─"
        },
        girl: {
            title: "✧ 🫧 𝒱𝑒𝓍 𝒜𝐼 𝒯𝒾𝓂𝑒𝓉𝒶𝒷𝓁𝑒 🫧 ✧",
            line: "┄"
        }
    };

    const current = modes[style];

    if (lang === 'sw') {
        return `*${current.title}*\n${current.line.repeat(30)}\n\n` +
            `✧ ⚡ *RATIBA YA KUSOMA* ⚡ ✧\n\n` +
            `✧ ❋.timetable Math Jumatatu 8pm - Unda haraka\n` +
            `✧ ❋.timetable create - Mazungumzo AI\n` +
            `✧ ❋.timetable list - Onyesha yako\n` +
            `✧ ❋.timetable export - Pata picha\n` +
            `✧ ❋.timetable delete - Futa\n\n` +
            `✧ ❋ *VIPENGELE:*\n` +
            `✧ ❋ 6 AI Systems Fallback\n` +
            `✧ ❋ Picha ya Ratiba\n` +
            `✧ ❋ Mazungumzo ya Akili\n` +
            `✧ ❋ Hifadhi Supabase\n\n` +
            `${current.line.repeat(30)}\n_Imejengwa na VEX AI - Lupin Starnley_`;
    }

    return `*${current.title}*\n${current.line.repeat(30)}\n\n` +
        `✧ ⚡ *STUDY PLANNER* ⚡ ✧\n\n` +
        `✧ ❋.timetable Math Mon 8pm - Quick create\n` +
        `✧ ❋.timetable create - AI conversation\n` +
        `✧ ❋.timetable list - Show yours\n` +
        `✧ ❋.timetable export - Get image\n` +
        `✧ ❋.timetable delete - Clear\n\n` +
        `✧ ❋ *FEATURES:*\n` +
        `✧ ❋ 6 AI Systems Fallback\n` +
        `✧ ❋ Image Export\n` +
        `✧ ❋ Smart Conversation\n` +
        `✧ ❋ Supabase Storage\n\n` +
        `${current.line.repeat(30)}\n_Powered by VEX AI - Lupin Starnley_`;
}

function formatTimetableText(style, tt, userName, lang) {
    const modes = {
        harsh: { title: "⭒ ☣️ 𝖁𝕰𝖃 𝕬𝕴 𝕿𝕴𝕸𝕰𝕿𝕬𝕭𝕷𝕰 ☣️ ⭒", line: "━" },
        normal: { title: "⭒ 📚 VEX AI STUDY TIMETABLE 📚 ⭒", line: "─" },
        girl: { title: "✧ 🫧 𝒱𝑒𝓍 𝒜𝐼 𝒮𝓉𝓊𝒹𝓎 𝒫𝓁𝒶𝓃 🫧 ✧", line: "┄" }
    };

    const current = modes[style];
    let output = `*${current.title}*\n${current.line.repeat(30)}\n\n`;
    output += lang === 'sw'? `✧ 👤 *Mwanafunzi:* ${userName}\n✧ 📊 *Masaa:* ${tt.totalHours || 'N/A'}/wiki\n✧ ⚡ *AI:* ${tt.aiSystem || 'N/A'}\n\n` : `✧ 👤 *Student:* ${userName}\n✧ 📊 *Total Hours:* ${tt.totalHours || 'N/A'}/week\n✧ ⚡ *AI:* ${tt.aiSystem || 'N/A'}\n\n`;

    // Group by day
    const days = lang === 'sw'
       ? ['Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi', 'Jumapili']
        : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const byDay = {};

    tt.subjects.forEach(s => {
        if (!byDay[s.day]) byDay[s.day] = [];
        byDay[s.day].push(s);
    });

    days.forEach(day => {
        if (byDay[day] && byDay[day].length > 0) {
            output += `✧ *${day.toUpperCase()}*\n`;
            byDay[day].forEach(s => {
                const priority = s.priority === 'High' || s.priority === 'Juu'? '🔴' : s.priority === 'Medium' || s.priority === 'Kati'? '🟡' : '🟢';
                output += `✧ ❋ ${priority} ${s.time} - ${s.name} (${s.duration})\n`;
            });
            output += `\n`;
        }
    });

    if (tt.tips && tt.tips.length > 0) {
        output += lang === 'sw'? `✧ 💡 *VIDOKEZO VEX AI:*\n` : `✧ 💡 *VEX AI TIPS:*\n`;
        tt.tips.slice(0, 3).forEach(tip => output += `✧ ❋ ${tip}\n`);
        output += `\n`;
    }

    output += `${current.line.repeat(30)}\n_Created by VEX AI - Lupin Starnley_`;
    return output;
}

function formatTimetableCaption(style, tt, lang) {
    return lang === 'sw'
       ? `✧ 📚 *Ratiba Yako ya Wiki*\n\n✧ Jumla: ${tt.totalHours || 'N/A'} masaa/wiki\n✧ Masomo: ${tt.subjects.length}\n✧ AI: ${tt.aiSystem || 'N/A'}\n\nHifadhi picha hii!\n\n- VEX AI`
        : `✧ 📚 *Your Weekly Study Plan*\n\n✧ Total: ${tt.totalHours || 'N/A'} hours/week\n✧ Subjects: ${tt.subjects.length}\n✧ AI: ${tt.aiSystem || 'N/A'}\n\nSave this image!\n\n- VEX AI`;
}

function formatQuestion(style, question, userName, lang) {
    const modes = {
        harsh: `⭒ ☣️ 𝕼𝖀𝕰𝕾𝕿𝕴𝕺𝕹 ☣️ ⭒\n\n✧ ${question}\n\nJibu au andika 'cancel'`,
        normal: `⭒ 📚 *VEX AI QUESTION* ⭒\n\n✧ ${userName}, ${question}\n\nType your answer or 'cancel'`,
        girl: `✧ 🫧 𝒱𝑒𝓍 𝒜𝐼 𝒬𝓊𝑒𝓈𝓉𝒾𝑜𝓃 🫧 ✧\n\n✧ ${question}~\n\nTell me or type 'cancel'~`
    };
    return modes[style];
}

function formatDelete(style, lang) {
    return lang === 'sw'
       ? `✧ 🗑️ *RATIBA IMEFUTWA*\n\n✧ RAM cleared. Unda mpya:.timetable\n\n- VEX AI`
        : `✧ 🗑️ *TIMETABLE DELETED*\n\n✧ RAM cleared. Create new:.timetable\n\n- VEX AI`;
}

function formatError(style, message, lang) {
    const modes = {
        harsh: "⭒ ☣️ 𝖁𝕰𝖃 𝕱𝕬𝕴𝕷𝕰𝕯 ☣️ ⭒",
        normal: "⭒ ❌ VEX ERROR ⭒",
        girl: "✧ 💔 𝒱𝑒𝓍 𝐸𝓇𝑜𝓇 ✧"
    };
    const title = modes[style] || modes.normal;
    return `*${title}*\n\n✧ ❋ ${message.slice(0, 200)}\n\n${getHelpText(style, lang)}`;
}

function getHelpText(style, lang) {
    if (lang === 'sw') {
        return `✧ 📐 *VEX TIMETABLE PRO* ✧\n\n✦ *Mifano:*\n✧ ❋.timetable Math Jumatatu 8pm\n✧ ❋.timetable create - Anza mazungumzo\n✧ ❋.timetable list - Onyesha yako\n✧ ❋.timetable export - Pata picha\n✧ ❋.timetable delete - Futa\n\n✦ *Vipengele:*\n✧ ❋ 6 AI Systems Fallback\n✧ ❋ Mazungumzo ya Akili\n✧ ❋ Picha ya Ratiba\n✧ ❋ Hifadhi Supabase\n✧ ❋ Lugha ya Asili\n\n_Imejengwa na VEX AI - Lupin Starnley_`;
    }
    return `✧ 📐 *VEX TIMETABLE PRO* ✧\n\n✦ *Examples:*\n✧ ❋.timetable Math Mon 8pm\n✧ ❋.timetable create - Start conversation\n✧ ❋.timetable list - Show current\n✧ ❋.timetable export - Get image\n✧ ❋.timetable delete - Clear\n\n✦ *Features:*\n✧ ❋ 6 AI Systems Fallback\n✧ ❋ Smart Conversation\n✧ ❋ Image Export\n✧ ❋ Supabase Storage\n✧ ❋ Natural Language\n\n_Powered by VEX AI - Lupin Starnley_`;
}
