const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Style reactions
const STYLE_REACTS = {
    harsh: "📐",
    normal: "🧮",
    girl: "🎀"
};

module.exports = {
    command: "formula",
    category: "education",
    description: "VEX AI Formula Pro - Any math/physics/chemistry formula with solved examples",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'harsh';
        const query = args.join(' ').trim();

        // 1. REACT IMMEDIATELY
        await sock.sendMessage(m.chat, { react: { text: STYLE_REACTS[style], key: m.key } });

        if (!query) {
            return m.reply(getHelpText(style));
        }

        if (!GROQ_API_KEY) {
            return m.reply(`❌ *VEX AI ERROR*\n\nGROQ_API_KEY required for formula database.\n\n_Powered by VEX AI - Lupin Starnley_`);
        }

        try {
            // 2. AI FORMULA ENGINE
            const result = await getFormulaWithAI(query, style);

            // 3. SEND RESULT
            const output = formatFormula(style, result);
            await sock.sendMessage(m.chat, { text: output }, { quoted: m });

        } catch (error) {
            await m.reply(`❌ *VEX AI FORMULA ERROR*\n\n${error.message}\n\n*Try:*\n.formula area of circle\n.formula quadratic formula\n.formula E=mc2\n.formula ohm's law\n\n_Powered by VEX AI - Lupin Starnley_`);
        }
    }
};

// =========================
// AI FORMULA ENGINE
// =========================

async function getFormulaWithAI(query, style) {
    const stylePrompts = {
        harsh: "Be brutal, direct, no fluff. Focus on core formula and critical example. Oxford level accepted.",
        normal: "Clear, educational, step-by-step. Suitable for high school to university level.",
        girl: "Make it cute and easy to understand~ Use simple words but keep accuracy~"
    };

    const prompt = `You are VEX AI, an advanced formula database created by Lupin Starnley. You know ALL formulas from middle school to Oxford University PhD level.

User request: "${query}"
Style: ${stylePrompts[style]}

Provide comprehensive formula data. Return ONLY valid JSON:

{
  "name": "Formula name",
  "category": "Math/Physics/Chemistry/Engineering/Finance/etc",
  "level": "Middle School/High School/University/Oxford PhD",
  "formula": "Main formula in LaTeX or plain text",
  "variables": [
    {"symbol": "A", "meaning": "Area", "unit": "m²"},
    {"symbol": "r", "meaning": "Radius", "unit": "m"}
  ],
  "explanation": "What this formula does and when to use it",
  "derivation": "Brief how it's derived (if important)",
  "example": {
    "problem": "Find area of circle with radius 5m",
    "given": "r = 5m",
    "solution": ["Step 1: A = πr²", "Step 2: A = π(5)²", "Step 3: A = π(25)", "Step 4: A = 78.54 m²"],
    "answer": "78.54 m²"
  },
  "relatedFormulas": ["Circumference = 2πr", "Volume of sphere = 4/3πr³"],
  "applications": ["Engineering", "Architecture", "Physics"],
  "notes": "Important tips or common mistakes"
}

If formula not found, return closest match. Support: algebra, geometry, trigonometry, calculus, statistics, mechanics, thermodynamics, electricity, quantum, chemistry, finance, etc.`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1500
    }, {
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    const content = response.data.choices[0].message.content.trim();
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI formula generation failed');

    return JSON.parse(jsonMatch[0]);
}

// =========================
// FORMATTER
// =========================

function formatFormula(style, data) {
    const modes = {
        harsh: {
            title: "☣️ 𝖁𝕰𝖃 𝕬𝕴 𝕱𝕺𝕽𝕸𝖀𝕷𝕬 𝕯𝕬𝕿𝕬𝕭𝕬𝕾𝕰 ☣️",
            line: "━"
        },
        normal: {
            title: "📐 VEX AI FORMULA PRO 📐",
            line: "─"
        },
        girl: {
            title: "🫧 𝒱𝑒𝓍 𝒜𝐼 𝐹𝑜𝓇𝓂𝓊𝓁𝒶 𝒟𝐵 🫧",
            line: "┄"
        }
    };

    const current = modes[style];
    let output = `*${current.title}*\n${current.line.repeat(32)}\n\n`;

    // Header
    output += `📊 *FORMULA:* ${data.name}\n`;
    output += `📚 *Category:* ${data.category}\n`;
    output += `🎓 *Level:* ${data.level}\n\n`;

    // Main Formula
    output += `*FORMULA:*\n\`\`\`\n${data.formula}\n\`\`\`\n\n`;

    // Variables
    if (data.variables && data.variables.length > 0) {
        output += `*VARIABLES:*\n`;
        data.variables.forEach(v => {
            output += `• ${v.symbol} = ${v.meaning}${v.unit? ` (${v.unit})` : ''}\n`;
        });
        output += `\n`;
    }

    // Explanation
    output += `*EXPLANATION:*\n${data.explanation}\n\n`;

    // Derivation
    if (data.derivation) {
        output += `*DERIVATION:*\n${data.derivation}\n\n`;
    }

    // Solved Example
    if (data.example) {
        output += `*SOLVED EXAMPLE:*\n`;
        output += `📝 *Problem:* ${data.example.problem}\n`;
        output += `📋 *Given:* ${data.example.given}\n\n`;
        output += `*Solution:*\n`;
        data.example.solution.forEach(step => {
            output += `${step}\n`;
        });
        output += `\n✅ *Answer:* ${data.example.answer}\n\n`;
    }

    // Related Formulas
    if (data.relatedFormulas && data.relatedFormulas.length > 0) {
        output += `*RELATED FORMULAS:*\n`;
        data.relatedFormulas.forEach(f => output += `• ${f}\n`);
        output += `\n`;
    }

    // Applications
    if (data.applications && data.applications.length > 0) {
        output += `*APPLICATIONS:* ${data.applications.join(', ')}\n\n`;
    }

    // Notes
    if (data.notes) {
        output += `*💡 NOTE:* ${data.notes}\n\n`;
    }

    output += `${current.line.repeat(32)}\n_VEX AI by Lupin Starnley_`;

    return output;
}

function getHelpText(style) {
    return `📐 *VEX AI FORMULA PRO*\n\n*Usage:*\n.formula area of circle\n.formula quadratic formula\n.formula E=mc2\n.formula ohm's law\n.formula newton's second law\n.formula compound interest\n.formula schrodinger equation\n\n*Categories:*\n✅ Math: Algebra, Geometry, Calculus, Stats\n✅ Physics: Mechanics, Electricity, Quantum\n✅ Chemistry: Moles, Gas Laws, Reactions\n✅ Engineering: Fluid, Thermodynamics\n✅ Finance: Interest, NPV, ROI\n✅ Oxford Level: Advanced formulas\n\n*Features:*\n• Formula + Explanation\n• Solved Example Step-by-Step\n• Variables with Units\n• Derivation & Applications\n• Related Formulas\n\n_Powered by VEX AI - Created by Lupin Starnley_`;
}
