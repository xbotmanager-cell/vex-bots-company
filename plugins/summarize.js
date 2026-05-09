const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Style reactions
const STYLE_REACTS = {
    harsh: "📝",
    normal: "📋",
    girl: "🎀"
};

module.exports = {
    command: "summarize",
    alias: ["smr","summary"], // <-- ALIAS HAPA
    category: "education",
    description: "VEX AI Summary Pro - Condense long notes into key revision points",

    async execute(m, sock, { args, userSettings, quoted }) {
        const style = userSettings?.style || 'harsh';

        // 1. REACT IMMEDIATELY - NO PRE MESSAGE
        await sock.sendMessage(m.chat, { react: { text: STYLE_REACTS[style], key: m.key } });

        try {
            // 2. GET TEXT TO SUMMARIZE
            let textToSummarize = '';

            // Check if replying to a message
            if (quoted && quoted.text) {
                textToSummarize = quoted.text;
            } else if (args.length > 0) {
                textToSummarize = args.join(' ');
            } else {
                throw new Error('Reply to a long text or provide text after command');
            }

            if (textToSummarize.length < 50) {
                throw new Error('Text too short to summarize. Need at least 50 characters');
            }

            if (!GROQ_API_KEY) {
                throw new Error('GROQ_API_KEY required for AI summarization');
            }

            // 3. AI SUMMARIZE - VEX AI
            const summary = await summarizeWithAI(textToSummarize, style);

            // 4. SEND RESULT - ONE MESSAGE ONLY
            const output = formatSummary(style, summary, textToSummarize.length);
            await sock.sendMessage(m.chat, { text: output }, { quoted: m });

        } catch (error) {
            await m.reply(`❌ *VEX AI SUMMARY ERROR*\n\n${error.message}\n\n*Usage:*\n.reply to long text with.summary\n.summary your long text here\n\n_Powered by VEX AI - Created by Lupin Starnley_`);
        }
    }
};

// =========================
// AI SUMMARIZER - GROQ
// =========================

async function summarizeWithAI(text, style) {
    const stylePrompts = {
        harsh: "Extract 5-7 KEY POINTS for exam revision. Be direct, brutal, no fluff. Focus on facts, formulas, dates, definitions. Use aggressive tone.",
        normal: "Extract 5-7 key points for student revision. Clear, concise, educational. Focus on main ideas, concepts, and important details.",
        girl: "Extract 5-7 cute key points for studying~ Make it easy to remember and girly~ Focus on main ideas but keep it soft~"
    };

    const prompt = `You are VEX AI, an educational summarizer made by Lupin Starnley.

Text to summarize:
"""
${text}
"""

Task: ${stylePrompts[style]}

Rules:
1. Return EXACTLY 5-7 bullet points
2. Each point must be 1-2 sentences max
3. Start each with "•"
4. No introduction or conclusion
5. Extract only the MOST IMPORTANT information for exams
6. If there are formulas/dates/names, include them

Summary:`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 400
    }, {
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`, // <-- KEY INATUMIKA HAPA
            'Content-Type': 'application/json'
        }
    });

    return response.data.choices[0].message.content.trim();
}

// =========================
// FORMATTER
// =========================

function formatSummary(style, summary, originalLength) {
    const modes = {
        harsh: {
            title: "☣️ 𝖁𝕰𝖃 𝕬𝕴 𝕾𝖀𝕸𝕬𝕽𝖄 ☣️",
            line: "━"
        },
        normal: {
            title: "📋 VEX AI SUMMARY PRO 📋",
            line: "─"
        },
        girl: {
            title: "🫧 𝒱𝑒𝓍 𝒜𝐼 𝒮𝓊𝓂𝓂𝒶𝓇𝓎 🫧",
            line: "┄"
        }
    };

    const current = modes[style];
    const compression = ((1 - summary.length / originalLength) * 100).toFixed(0);

    let output = `*${current.title}*\n${current.line.repeat(25)}\n\n`;
    output += `${summary}\n\n`;
    output += `${current.line.repeat(25)}\n`;
    output += `📊 *Stats:* Compressed ${compression}% | ${originalLength} → ${summary.length} chars\n`;
    output += `_VEX AI by Lupin Starnley_`;

    return output;
}
