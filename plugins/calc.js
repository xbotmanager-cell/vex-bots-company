const math = require('mathjs');
const axios = require('axios');
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
// STYLE REACTS - NINJA STARS
// =========================
const STYLE_REACTS = {
    harsh: "⭒",
    normal: "📐",
    girl: "✧"
};

// =========================
// 6 AI FALLBACK SYSTEM
// =========================
const AI_APIS = [
    {
        name: 'groq',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        key: process.env.GROQ_API_KEY,
        model: 'llama-3.3-70b-versatile'
    },
    {
        name: 'openrouter',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        key: process.env.OPENROUTER_API_KEY,
        model: 'meta-llama/llama-3.1-70b-instruct'
    },
    {
        name: 'gemini',
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        key: process.env.GEMINI_API_KEY,
        model: null
    },
    {
        name: 'sambanova',
        url: 'https://api.sambanova.ai/v1/chat/completions',
        key: process.env.SAMBANOVA_API_KEY,
        model: 'Meta-Llama-3.1-70B-Instruct'
    },
    {
        name: 'cerebras',
        url: 'https://api.cerebras.ai/v1/chat/completions',
        key: process.env.CEREBRAS_API_KEY,
        model: 'llama3.1-70b'
    },
    {
        name: 'cloudflare',
        url: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-70b-instruct`,
        key: process.env.CLOUDFLARE_API_KEY,
        model: null
    }
];

module.exports = {
    command: "calc",
    alias: ["math", "solve", "calculate"],
    category: "education",
    description: "VEX Math Pro - AI Powered Math Solver with 6 AI Fallback",

    async execute(m, sock, { args, userSettings, user }) {
        const style = userSettings?.style || 'harsh';
        const userId = user?.id || m.sender;
        let expression = args.join(' ').trim();

        if (!expression) {
            return m.reply(getHelpText(style));
        }

        // 1. REACT IMMEDIATELY - NO PRE MESSAGE
        await sock.sendMessage(m.chat, { react: { text: STYLE_REACTS[style], key: m.key } });

        try {
            let result;
            let steps = [];
            let usedAI = false;
            let finalExpression = expression;
            let aiSystem = '';

            // 2. TRY MATHJS FIRST
            try {
                result = await solveWithMathJS(expression, steps);
            } catch (mathError) {
                // 3. MATHJS FAILED - USE 6 AI FALLBACK
                steps.push(`MathJS: ${mathError.message.slice(0, 50)}`);
                steps.push(`AI analyzing...`);

                const aiResult = await interpretWithAllAI(expression, steps);
                finalExpression = aiResult.correctedExpression;
                usedAI = true;
                aiSystem = aiResult.system;

                steps.push(`AI fixed: ${finalExpression}`);

                // Try mathjs again with corrected expression
                try {
                    result = await solveWithMathJS(finalExpression, steps);
                } catch (aiError) {
                    throw new Error(`AI corrected but still failed: ${aiError.message}`);
                }
            }

            // 4. SAVE TO SUPABASE
            if (supabase) {
                try {
                    await supabase.from('e_math_history').insert({
                        user_id: userId,
                        chat_id: m.chat,
                        expression: expression.slice(0, 500),
                        corrected: finalExpression.slice(0, 500),
                        result: JSON.stringify(result.result).slice(0, 1000),
                        ai_used: usedAI,
                        ai_system: aiSystem
                    });
                } catch {}
            }

            // 5. FORMAT & SEND - SHORT + DETAILED
            const output = formatOutput(style, expression, finalExpression, result, steps, usedAI, aiSystem);
            await sock.sendMessage(m.chat, { text: output }, { quoted: m });

        } catch (error) {
            await m.reply(formatError(style, error.message));
        }
    }
};

// =========================
// MATHJS SOLVER ENGINE
// =========================
async function solveWithMathJS(expr, steps) {
    let result;
    let isGraph = false;
    let graphData = null;

    // Detect type
    if (expr.match(/solve\s+(.+?)\s+for\s+(\w+)/i)) {
        result = solveEquation(expr, steps);
    } else if (expr.match(/derivative|diff|d\/dx/i)) {
        result = solveDerivative(expr, steps);
    } else if (expr.match(/integrate|integral|∫/i)) {
        result = solveIntegral(expr, steps);
    } else if (expr.includes('matrix') || expr.includes('[')) {
        result = solveMatrix(expr, steps);
    } else if (expr.match(/mean|median|std|var|mode|variance/i)) {
        result = solveStatistics(expr, steps);
    } else if (expr.match(/plot|graph/i)) {
        const graphResult = prepareGraph(expr, steps);
        result = graphResult.result;
        isGraph = true;
        graphData = graphResult.data;
    } else if (expr.match(/simplify/i)) {
        result = solveSimplify(expr, steps);
    } else if (expr.match(/factor/i)) {
        result = solveFactor(expr, steps);
    } else if (expr.match(/limit/i)) {
        result = solveLimit(expr, steps);
    } else {
        result = solveArithmetic(expr, steps);
    }

    return {...result, isGraph, graphData };
}

// =========================
// 6 AI FALLBACK SYSTEM
// =========================
async function interpretWithAllAI(userInput, steps) {
    const prompt = `Convert to valid mathjs syntax. Rules:
1. Word problem → extract math
2. Fix syntax errors
3. "what is 2 plus 3" → "2 + 3"
4. "2x = 10" → "solve 2x = 10 for x"
5. "derivative of x^2" → "derivative of x^2"
6. "integrate x^2 from 0 to 1" → "integrate x^2 from 0 to 1"
7. Matrix: [[1,2],[3,4]]
8. Return ONLY expression, no explanation

Input: "${userInput}"
Corrected:`;

    for (const api of AI_APIS) {
        if (!api.key) continue;
        try {
            let data, headers = { 'Content-Type': 'application/json' };

            if (api.name === 'gemini') {
                data = { contents: [{ parts: [{ text: prompt }] }] };
            } else if (api.name === 'cloudflare') {
                headers['Authorization'] = `Bearer ${api.key}`;
                data = { messages: [{ role: 'user', content: prompt }] };
            } else {
                headers['Authorization'] = `Bearer ${api.key}`;
                data = {
                    model: api.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.1,
                    max_tokens: 100
                };
            }

            const res = await axios.post(api.url, data, { headers, timeout: 15000 });

            let corrected;
            if (api.name === 'gemini') {
                corrected = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
            } else if (api.name === 'cloudflare') {
                corrected = res.data?.result?.response;
            } else {
                corrected = res.data?.choices?.[0]?.message?.content;
            }

            if (corrected) {
                corrected = corrected.trim().replace(/`/g, '').replace(/^["']|["']$/g, '');
                steps.push(`AI ${api.name} fixed`);
                return { correctedExpression: corrected, system: api.name };
            }
        } catch (e) {
            steps.push(`${api.name} failed`);
            continue;
        }
    }
    throw new Error('All 6 AI systems failed');
}

// =========================
// SOLVERS - SHORT STEPS
// =========================
function solveArithmetic(expr, steps) {
    steps.push(`Parse: ${expr}`);
    const node = math.parse(expr);
    const result = math.evaluate(expr);
    steps.push(`Result: ${result}`);
    return {
        type: 'arithmetic',
        result: result,
        latex: node.toTex()
    };
}

function solveEquation(expr, steps) {
    const match = expr.match(/solve\s+(.+?)\s+for\s+(\w+)/i);
    if (!match) throw new Error('Use: solve 2x + 3 = 7 for x');

    const equation = match[1];
    const variable = match[2];
    steps.push(`${equation} =?`);

    const solutions = math.solve(equation, variable);
    steps.push(`x = ${JSON.stringify(solutions)}`);

    return {
        type: 'equation',
        result: solutions,
        latex: `${math.parse(equation).toTex()}`
    };
}

function solveDerivative(expr, steps) {
    const match = expr.match(/derivative\s+of\s+(.+)/i) || expr.match(/diff\s+(.+)/i) || expr.match(/d\/dx\s+(.+)/i);
    if (!match) throw new Error('Use: derivative of x^2 + 3x');

    const func = match[1];
    steps.push(`f(x) = ${func}`);

    const node = math.parse(func);
    const derivative = math.derivative(node, 'x');
    const simplified = math.simplify(derivative);
    steps.push(`f'(x) = ${simplified.toString()}`);

    return {
        type: 'derivative',
        result: simplified.toString(),
        latex: `\\frac{d}{dx}(${node.toTex()}) = ${simplified.toTex()}`
    };
}

function solveIntegral(expr, steps) {
    const match = expr.match(/integrate\s+(.+)/i) || expr.match(/integral\s+(.+)/i);
    if (!match) throw new Error('Use: integrate x^2 from 0 to 1');

    const func = match[1];
    steps.push(`∫ ${func} dx`);

    if (expr.includes('from')) {
        const boundsMatch = expr.match(/from\s+([\d.-]+)\s+to\s+([\d.-]+)/i);
        if (boundsMatch) {
            const a = parseFloat(boundsMatch[1]);
            const b = parseFloat(boundsMatch[2]);
            const f = math.compile(func);
            let sum = 0;
            const n = 1000;
            const dx = (b - a) / n;

            for (let i = 0; i < n; i++) {
                const x = a + i * dx;
                sum += f.evaluate({ x: x }) * dx;
            }

            steps.push(`[${a},${b}] = ${sum.toFixed(4)}`);
            return {
                type: 'integral',
                result: sum.toFixed(6),
                latex: `\\int_{${a}}^{${b}} ${math.parse(func).toTex()} \\, dx = ${sum.toFixed(4)}`
            };
        }
    }

    steps.push(`Indefinite: ∫${func} dx + C`);
    return {
        type: 'integral',
        result: `∫ ${func} dx + C`,
        latex: `\\int ${math.parse(func).toTex()} \\, dx`
    };
}

function solveMatrix(expr, steps) {
    steps.push(`Matrix calc`);
    const result = math.evaluate(expr);
    steps.push(`Done`);
    return {
        type: 'matrix',
        result: math.format(result, { precision: 4 }),
        latex: math.parse(expr).toTex()
    };
}

function solveStatistics(expr, steps) {
    steps.push(`Stats calc`);
    const result = math.evaluate(expr);
    steps.push(`Result: ${result}`);
    return {
        type: 'statistics',
        result: result,
        latex: math.parse(expr).toTex()
    };
}

function solveSimplify(expr, steps) {
    const match = expr.match(/simplify\s+(.+)/i);
    if (!match) throw new Error('Use: simplify (x^2-1)/(x-1)');

    const func = match[1];
    steps.push(`Simplify: ${func}`);
    const simplified = math.simplify(func);
    steps.push(`Result: ${simplified.toString()}`);

    return {
        type: 'simplify',
        result: simplified.toString(),
        latex: `${math.parse(func).toTex()} = ${simplified.toTex()}`
    };
}

function solveFactor(expr, steps) {
    const match = expr.match(/factor\s+(.+)/i);
    if (!match) throw new Error('Use: factor x^2 + 5x + 6');

    const func = match[1];
    steps.push(`Factor: ${func}`);
    const simplified = math.simplify(func);
    steps.push(`Result: ${simplified.toString()}`);

    return {
        type: 'factor',
        result: simplified.toString(),
        latex: math.parse(func).toTex()
    };
}

function solveLimit(expr, steps) {
    const match = expr.match(/limit\s+(.+?)\s+as\s+(\w+)\s+->\s+(.+)/i);
    if (!match) throw new Error('Use: limit (x^2-1)/(x-1) as x -> 1');

    const func = match[1];
    const variable = match[2];
    const value = parseFloat(match[3]);

    steps.push(`lim ${variable}→${value} ${func}`);
    const result = math.evaluate(func, { [variable]: value });
    steps.push(`Result: ${result}`);

    return {
        type: 'limit',
        result: result,
        latex: `\\lim_{${variable} \\to ${value}} ${math.parse(func).toTex()} = ${result}`
    };
}

function prepareGraph(expr, steps) {
    const match = expr.match(/plot\s+(.+?)\s+from\s+([\d.-]+)\s+to\s+([\d.-]+)/i);
    if (!match) throw new Error('Use: plot x^2 from -5 to 5');

    const func = match[1];
    const xMin = parseFloat(match[2]);
    const xMax = parseFloat(match[3]);

    steps.push(`y = ${func} [${xMin},${xMax}]`);

    const points = [];
    const step = (xMax - xMin) / 20;
    const compiled = math.compile(func);

    for (let x = xMin; x <= xMax; x += step) {
        try {
            const y = compiled.evaluate({ x: x });
            if (isFinite(y)) points.push({ x: x.toFixed(2), y: y.toFixed(2) });
        } catch (e) {}
    }

    steps.push(`${points.length} points`);
    return {
        result: `Graph y = ${func}`,
        data: points
    };
}

// =========================
// OUTPUT FORMATTER - SHORT + DETAILED
// =========================
function formatOutput(style, originalExpr, finalExpr, result, steps, usedAI, aiSystem) {
    const modes = {
        harsh: {
            title: "⭒ ☣️ 𝖁𝕰𝖃 𝕸𝕬𝕿𝕳 𝕻𝕽𝕺 ☣️ ⭒",
            line: "━"
        },
        normal: {
            title: "⭒ 📐 VEX MATH PRO 📐 ⭒",
            line: "─"
        },
        girl: {
            title: "✧ 🫧 𝒱𝑒𝓍 𝑀𝒶𝓉𝒽 𝒫𝓇𝑜 🫧 ✧",
            line: "┄"
        }
    };

    const current = modes[style] || modes.normal;
    let output = `*${current.title}*\n${current.line.repeat(25)}\n\n`;

    // AI Info - Short
    if (usedAI) {
        output += `✧ 🤖 *AI Fixed* (${aiSystem})\n`;
        output += `✧ ❋ Original: \`${originalExpr.slice(0, 40)}\`\n`;
        output += `✧ ❋ Parsed: \`${finalExpr.slice(0, 40)}\`\n\n`;
    } else {
        output += `✧ 📝 *Problem:* \`${finalExpr.slice(0, 50)}\`\n\n`;
    }

    // Steps - Max 4 steps, short
    output += `✦ *STEPS* ✦\n`;
    steps.slice(-4).forEach((step, i) => {
        output += `✧ ${i + 1}. ${step.slice(0, 60)}\n`;
    });

    output += `\n${current.line.repeat(25)}\n`;

    // Answer - Bold & Clear
    output += `✧ ✅ *ANSWER* ✅ ✧\n`;
    if (result.type === 'equation') {
        output += `✧ ❋ \`\`${JSON.stringify(result.result)}\`\`\`\n`;
    } else if (result.type === 'matrix') {
        output += `✧ ❋ \`\`\`\n${result.result}\n\`\`\`\n`;
    } else {
        output += `✧ ❋ \`${result.result}\`\n`;
    }

    // LaTeX - Short
    if (result.latex) {
        output += `\n✧ 📊 *LaTeX:* \`$${result.latex.slice(0, 80)}$\`\n`;
    }

    // Graph - Top 10 points only
    if (result.isGraph && result.graphData) {
        output += `\n✧ 📈 *GRAPH* (${result.graphData.length} pts)\n`;
        output += `✧ ❋ \`\`\`\n`;
        output += result.graphData.slice(0, 10).map(p => `(${p.x},${p.y})`).join(' ');
        output += `\n\`\`\`\n`;
    }

    output += `\n${current.line.repeat(25)}\n`;
    output += `✧ _VEX Math + 6 AI Systems_ ✧`;

    return output;
}

function formatError(style, message) {
    const modes = {
        harsh: "⭒ ☣️ 𝖁𝕰𝖃 𝕱𝕬𝕴𝕷𝕰𝕯 ☣️ ⭒",
        normal: "⭒ ❌ VEX ERROR ⭒",
        girl: "✧ 💔 𝒱𝑒𝓍 𝐸𝓇𝑜𝓇 ✧"
    };

    const title = modes[style] || modes.normal;
    return `*${title}*\n\n✧ ❋ ${message.slice(0, 200)}\n\n${getHelpText(style)}`;
}

function getHelpText(style) {
    return `✧ 📐 *VEX MATH PRO* ✧\n\n✦ *Examples:*\n✧ ❋ 2 + 3 * 4\n✧ ❋ what is 15% of 200\n✧ ❋ solve 2x + 5 = 15 for x\n✧ ❋ derivative of x^3 + 2x\n✧ ❋ integrate x^2 from 0 to 1\n✧ ❋ det [[1,2],[3,4]]\n✧ ❋ mean of 10,20,30,40\n✧ ❋ plot sin(x) from 0 to 6.28\n✧ ❋ simplify (x^2-1)/(x-1)\n✧ ❋ limit (x^2-1)/(x-1) as x -> 1\n\n✦ *Features:*\n✧ ❋ 6 AI Fallback Systems\n✧ ❋ Step-by-step Solutions\n✧ ❋ LaTeX Output\n✧ ❋ Graph Data\n✧ ❋ Natural Language\n\n_Powered by mathjs + AI_`;
}
