const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Style reactions
const STYLE_REACTS = {
    harsh: "📖",
    normal: "📚",
    girl: "🎀"
};

module.exports = {
    command: "dictionary",
    alias: ["dict", "define", "meaning"],
    category: "education",
    description: "VEX AI Dictionary Pro - Multi-language definitions with examples & synonyms",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'harsh';
        const input = args.join(' ').trim();

        // 1. REACT IMMEDIATELY
        await sock.sendMessage(m.chat, { react: { text: STYLE_REACTS[style], key: m.key } });

        if (!input) {
            return m.reply(getHelpText(style));
        }

        if (!GROQ_API_KEY) {
            return m.reply(`❌ *VEX AI ERROR*\n\nGROQ_API_KEY required for dictionary.\n\n_Powered by VEX AI - Lupin Starnley_`);
        }

        try {
            // 2. AI DICTIONARY LOOKUP
            const result = await lookupWordWithAI(input);

            // 3. FORMAT & SEND
            const output = formatDictionary(style, result);
            await sock.sendMessage(m.chat, { text: output }, { quoted: m });

        } catch (error) {
            await m.reply(`❌ *VEX AI DICTIONARY ERROR*\n\n${error.message}\n\nTry:.dictionary photosynthesis\n.dict habari\n\n_Powered by VEX AI - Lupin Starnley_`);
        }
    }
};

// =========================
// AI DICTIONARY ENGINE
// =========================

async function lookupWordWithAI(word) {
    const prompt = `You are VEX AI, a multilingual dictionary created by Lupin Starnley.

User wants definition for: "${word}"

Detect the language of this word. Then provide:

1. word: The word
2. language: Detected language (English, Swahili, French, Spanish, etc)
3. pronunciation: IPA or simple phonetic
4. partOfSpeech: noun, verb, adjective, etc
5. definitions: Array of 1-3 main definitions
6. examples: Array of 2-3 example sentences using the word
7. synonyms: Array of 3-5 synonyms in SAME language
8. antonyms: Array of 2-3 antonyms if applicable
9. translation: If not English, provide English translation. If English, provide Swahili translation
10. etymology: Brief word origin if interesting
11. usage: Formal/Informal/Slang/Technical

Return ONLY valid JSON:
{
  "word": "",
  "language": "",
  "pronunciation": "",
  "partOfSpeech": "",
  "definitions": [""],
  "examples": [""],
  "synonyms": [""],
  "antonyms": [""],
  "translation": "",
  "etymology": "",
  "usage": ""
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
    if (!jsonMatch) throw new Error('AI dictionary failed to parse response');

    return JSON.parse(jsonMatch[0]);
}

// =========================
// FORMATTER
// =========================

function formatDictionary(style, data) {
    const modes = {
        harsh: {
            title: "☣️ 𝖁𝕰𝖃 𝕬𝕴 𝕯𝕴𝕮𝕿𝕴𝕺𝕹𝕬𝕽𝖄 ☣️",
            line: "━"
        },
        normal: {
            title: "📚 VEX AI DICTIONARY PRO 📚",
            line: "─"
        },
        girl: {
            title: "🫧 𝒱𝑒𝓍 𝒜𝐼 𝒟𝒾𝒸𝓉𝒾𝑜𝓃𝒶𝓇𝓎 🫧",
            line: "┄"
        }
    };

    const current = modes[style];
    let output = `*${current.title}*\n${current.line.repeat(30)}\n\n`;

    // Word header
    output += `📖 *WORD:* ${data.word}\n`;
    output += `🌍 *Language:* ${data.language}\n`;
    output += `🔊 *Pronunciation:* ${data.pronunciation}\n`;
    output += `📝 *Part of Speech:* ${data.partOfSpeech}\n`;
    output += `💬 *Usage:* ${data.usage}\n\n`;

    // Definitions
    output += `*DEFINITIONS:*\n`;
    data.definitions.forEach((def, i) => {
        output += `${i + 1}. ${def}\n`;
    });
    output += `\n`;

    // Examples
    if (data.examples && data.examples.length > 0) {
        output += `*EXAMPLES:*\n`;
        data.examples.forEach((ex, i) => {
            output += `• ${ex}\n`;
        });
        output += `\n`;
    }

    // Synonyms
    if (data.synonyms && data.synonyms.length > 0) {
        output += `*SYNONYMS:* ${data.synonyms.join(', ')}\n\n`;
    }

    // Antonyms
    if (data.antonyms && data.antonyms.length > 0) {
        output += `*ANTONYMS:* ${data.antonyms.join(', ')}\n\n`;
    }

    // Translation
    if (data.translation) {
        output += `*TRANSLATION:* ${data.translation}\n\n`;
    }

    // Etymology
    if (data.etymology) {
        output += `*ORIGIN:* ${data.etymology}\n\n`;
    }

    output += `${current.line.repeat(30)}\n_VEX AI by Lupin Starnley_`;

    return output;
}

function getHelpText(style) {
    return `📚 *VEX AI DICTIONARY PRO*\n\n*Usage:*\n.dictionary photosynthesis\n.dict habari\n.define beautiful\n.meaning bonjour\n\n*Features:*\n✅ Any language detected automatically\n✅ Definitions, examples, synonyms\n✅ Pronunciation & etymology\n✅ Translations\n✅ Part of speech\n\n*Examples:*\n.dict serendipity\n.dict mapenzi\n.dict ordinateur\n\n_Powered by VEX AI - Created by Lupin Starnley_`;
}
