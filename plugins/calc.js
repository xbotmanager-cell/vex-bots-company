const math = require('mathjs');
const axios = require('axios');

// GROQ for natural language understanding
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Style reactions
const STYLE_REACTS = {
    harsh: "⚛️",
    normal: "📐",
    girl: "🎀"
};

module.exports = {
    command: "calc",
    category: "education",
    description: "VEX Pro Math Solver - Solves ANY math with AI fallback, shows steps",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'harsh';
        let expression = args.join(' ').trim();

        if (!expression) {
            return m.reply(getHelpText(style));
        }

        // 1. REACT IMMEDIATELY BY STYLE - NO PRE MESSAGE
        await sock.sendMessage(m.chat, { react: { text: STYLE_REACTS[style], key: m.key } });

        try {
            let result;
            let steps = [];
            let usedAI = false;
            let finalExpression = expression;

            // 2. TRY MATHJS FIRST
            try {
                result = await solveWithMathJS(expression, steps);
            } catch (mathError) {
                // 3. MATHJS FAILED - USE GROQ AI TO UNDERSTAND & FIX
                if (!GROQ_API_KEY) {
                    throw new Error(`${mathError.message}\n\nTip: Check syntax or add GROQ_API_KEY for AI help`);
                }

                steps.push(`MathJS failed: ${mathError.message}`);
                steps.push(`Asking AI to interpret...`);

                const aiResult = await interpretWithAI(expression, steps);
                finalExpression = aiResult.correctedExpression;
                usedAI = true;

                steps.push(`AI interpreted as: ${finalExpression}`);

                // Try mathjs again with corrected expression
                try {
                    result = await solveWithMathJS(finalExpression, steps);
                } catch (aiError) {
                    throw new Error(`AI tried but failed: ${aiError.message}`);
                }
            }

            // 4. FORMAT & SEND - NO PRE MESSAGE
            const output = formatOutput(style, expression, finalExpression, result, steps, usedAI);
            await sock.sendMessage(m.chat, { text: output }, { quoted: m });

        } catch (error) {
            await m.reply(`❌ *FINAL ERROR*\n\n${error.message}\n\n${getHelpText(style)}`);
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
    } else if (expr.match(/derivative|diff/i)) {
        result = solveDerivative(expr, steps);
    } else if (expr.match(/integrate|integral/i)) {
        result = solveIntegral(expr, steps);
    } else if (expr.includes('matrix') || expr.includes('[')) {
        result = solveMatrix(expr, steps);
    } else if (expr.match(/mean|median|std|var|mode/i)) {
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
    } else {
        result = solveArithmetic(expr, steps);
    }

    return {...result, isGraph, graphData };
}

// =========================
// AI FALLBACK - GROQ
// =========================

async function interpretWithAI(userInput, steps) {
    const prompt = `You are a math expression parser. User input: "${userInput}"

Convert this to valid mathjs syntax. Rules:
1. If it's a word problem, extract the math
2. If syntax is wrong, fix it
3. If it's natural language like "what is 2 plus 3", convert to "2 + 3"
4. If equation missing "solve", add it: "2x = 10" -> "solve 2x = 10 for x"
5. If derivative, use format: "derivative of x^2"
6. If integral, use format: "integrate x^2 from 0 to 1"
7. For matrices, use: [[1,2],[3,4]]
8. Return ONLY the corrected mathjs expression, no explanation

Corrected expression:`;

    try {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.1-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 100
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const corrected = response.data.choices[0].message.content.trim().replace(/`/g, '');
        return { correctedExpression: corrected };
    } catch (error) {
        throw new Error('AI service unavailable');
    }
}

// =========================
// SOLVERS
// =========================

function solveArithmetic(expr, steps) {
    steps.push(`Input: ${expr}`);
    const node = math.parse(expr);
    steps.push(`Parsed: ${node.toString()}`);

    const result = math.evaluate(expr);
    steps.push(`Evaluated: ${result}`);

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

    steps.push(`Equation: ${equation}`);
    steps.push(`Variable: ${variable}`);

    const sides = equation.split('=');
    if (sides.length!== 2) throw new Error('Equation must have = sign');

    const left = math.parse(sides[0].trim());
    const right = math.parse(sides[1].trim());

    steps.push(`Left: ${left.toString()}`);
    steps.push(`Right: ${right.toString()}`);

    // Use mathjs solve
    const solutions = math.solve(equation, variable);
    steps.push(`Solutions: ${JSON.stringify(solutions)}`);

    return {
        type: 'equation',
        result: solutions,
        latex: `${left.toTex()} = ${right.toTex()}`
    };
}

function solveDerivative(expr, steps) {
    const match = expr.match(/derivative\s+of\s+(.+)/i) || expr.match(/diff\s+(.+)/i);
    if (!match) throw new Error('Use: derivative of x^2 + 3x');

    const func = match[1];
    steps.push(`f(x) = ${func}`);

    const node = math.parse(func);
    const derivative = math.derivative(node, 'x');
    steps.push(`f'(x) = ${derivative.toString()}`);

    const simplified = math.simplify(derivative);
    steps.push(`Simplified: ${simplified.toString()}`);

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
    steps.push(`f(x) = ${func}`);

    const node = math.parse(func);

    if (expr.includes('from')) {
        const boundsMatch = expr.match(/from\s+([\d.-]+)\s+to\s+([\d.-]+)/i);
        if (boundsMatch) {
            const a = parseFloat(boundsMatch[1]);
            const b = parseFloat(boundsMatch[2]);

            // Numeric integration using mathjs
            const f = math.compile(func);
            let sum = 0;
            const n = 1000;
            const dx = (b - a) / n;

            for (let i = 0; i < n; i++) {
                const x = a + i * dx;
                sum += f.evaluate({ x: x }) * dx;
            }

            steps.push(`Definite integral [${a}, ${b}]: ${sum.toFixed(6)}`);
            return {
                type: 'integral',
                result: sum.toFixed(6),
                latex: `\\int_{${a}}^{${b}} ${node.toTex()} \\, dx = ${sum.toFixed(6)}`
            };
        }
    }

    steps.push(`Indefinite integral: Symbolic integration limited in mathjs`);
    return {
        type: 'integral',
        result: `∫ ${func} dx + C`,
        latex: `\\int ${node.toTex()} \\, dx`
    };
}

function solveMatrix(expr, steps) {
    steps.push(`Matrix: ${expr}`);
    const result = math.evaluate(expr);
    steps.push(`Result: ${math.format(result)}`);

    return {
        type: 'matrix',
        result: math.format(result, { precision: 6 }),
        latex: math.parse(expr).toTex()
    };
}

function solveStatistics(expr, steps) {
    steps.push(`Statistics: ${expr}`);
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
    if (!match) throw new Error('Use: simplify (x^2 + 2x + 1)/(x + 1)');

    const func = match[1];
    steps.push(`Expression: ${func}`);

    const simplified = math.simplify(func);
    steps.push(`Simplified: ${simplified.toString()}`);

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
    steps.push(`Expression: ${func}`);

    // mathjs doesn't have factor, use simplify + rationalize
    const simplified = math.simplify(func);
    steps.push(`Attempting to factor: ${simplified.toString()}`);

    return {
        type: 'factor',
        result: simplified.toString(),
        latex: math.parse(func).toTex()
    };
}

function prepareGraph(expr, steps) {
    const match = expr.match(/plot\s+(.+?)\s+from\s+([\d.-]+)\s+to\s+([\d.-]+)/i);
    if (!match) throw new Error('Use: plot x^2 from -5 to 5');

    const func = match[1];
    const xMin = parseFloat(match[2]);
    const xMax = parseFloat(match[3]);

    steps.push(`y = ${func}`);
    steps.push(`Domain: [${xMin}, ${xMax}]`);

    const points = [];
    const step = (xMax - xMin) / 30;
    const compiled = math.compile(func);

    for (let x = xMin; x <= xMax; x += step) {
        try {
            const y = compiled.evaluate({ x: x });
            if (isFinite(y)) points.push({ x: x.toFixed(2), y: y.toFixed(2) });
        } catch (e) {}
    }

    steps.push(`Generated ${points.length} valid points`);

    return {
        result: `Graph of y = ${func}`,
        data: points
    };
}

// =========================
// OUTPUT FORMATTER
// =========================

function formatOutput(style, originalExpr, finalExpr, result, steps, usedAI) {
    const modes = {
        harsh: {
            title: "☣️ 𝖁𝕰𝖃 𝕸𝕬𝕿𝕳 𝕾𝕺𝕷𝖁𝕰𝕽 ☣️",
            line: "━"
        },
        normal: {
            title: "📐 VEX MATH SOLVER PRO 📐",
            line: "─"
        },
        girl: {
            title: "🫧 𝒱𝑒𝓍 𝑀𝒶𝓉𝒽 𝒢𝑒𝓃𝒾𝓊𝓈 🫧",
            line: "┄"
        }
    };

    const current = modes[style] || modes.normal;
    let output = `*${current.title}*\n${current.line.repeat(22)}\n\n`;

    if (usedAI) {
        output += `🤖 *AI INTERPRETED*\n`;
        output += `Original: \`${originalExpr}\`\n`;
        output += `Understood: \`${finalExpr}\`\n\n`;
    } else {
        output += `📝 *Problem:*\n\`${finalExpr}\`\n\n`;
    }

    output += `*SOLUTION STEPS:*\n`;
    steps.forEach((step, i) => {
        output += `${i + 1}. ${step}\n`;
    });

    output += `\n${current.line.repeat(22)}\n`;
    output += `✅ *FINAL ANSWER:*\n`;

    if (result.type === 'equation') {
        output += `\`\`\`${JSON.stringify(result.result, null, 2)}\`\`\`\n`;
    } else if (result.type === 'matrix') {
        output += `\`\`\`\n${result.result}\n\`\`\`\n`;
    } else {
        output += `\`${result.result}\`\n`;
    }

    if (result.latex) {
        output += `\n📊 *LaTeX:*\n$${result.latex}$\n`;
    }

    if (result.isGraph && result.graphData) {
        output += `\n📈 *GRAPH DATA:*\n\`\`\`\n`;
        output += result.graphData.slice(0, 15).map(p => `(${p.x}, ${p.y})`).join('\n');
        output += `\n... ${result.graphData.length} points\n\`\`\`\n`;
    }

    output += `\n${current.line.repeat(22)}\n_VEX Math Engine - mathjs + AI_`;

    return output;
}

function getHelpText(style) {
    return `📐 *VEX MATH SOLVER PRO*\n\n*NATURAL LANGUAGE SUPPORTED!*\n\n*Examples:*\n. calc 2 + 3 * 4\n. calc what is 15% of 200\n. calc solve 2x + 5 = 15 for x\n. calc derivative of x^3 + 2x\n. calc integrate x^2 from 0 to 1\n. calc det [[1,2],[3,4]]\n. calc mean of 10,20,30,40\n. calc plot sin(x) from 0 to 6.28\n. calc simplify (x^2-1)/(x-1)\n. calc sqrt(-4)\n. calc 5 inch to cm\n\n*FEATURES:*\n✅ Arithmetic, Algebra, Calculus\n✅ Matrices, Statistics, Units\n✅ Complex Numbers, Trigonometry\n✅ AI understands typos & words\n✅ Step-by-step solutions\n✅ LaTeX output\n\nPowered by mathjs + Groq AI`;
}
