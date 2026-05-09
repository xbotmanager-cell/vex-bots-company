const axios = require('axios');

// =========================
// ENV - AI APIs ZA RENDER
// =========================
const ENV = {
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SAMBANOVA_API_KEY: process.env.SAMBANOVA_API_KEY,
    CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
    CLOUDFLARE_API_KEY: process.env.CLOUDFLARE_API_KEY,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
};

let aiCallCount = {};

// =========================
// 100+ FAMOUS CASES - REAL & FICTIONAL
// =========================
const CASES = [
    'Jack the Ripper', 'Zodiac Killer', 'D.B. Cooper', 'Black Dahlia', 'Lizzie Borden',
    'Al Capone', 'Bonnie and Clyde', 'Jesse James', 'Pablo Escobar', 'El Chapo',
    'Charles Manson', 'Ted Bundy', 'Jeffrey Dahmer', 'John Wayne Gacy', 'Ed Gein',
    'H.H. Holmes', 'Richard Ramirez', 'Aileen Wuornos', 'BTK Killer', 'Green River Killer',
    'O.J. Simpson Trial', 'Amanda Knox', 'Casey Anthony', 'Scott Peterson', 'Jodi Arias',
    'Menendez Brothers', 'JonBenét Ramsey', 'Madeleine McCann', 'Natalee Holloway', 'Elisa Lam',
    'Dyatlov Pass Incident', 'Taman Shud Case', 'Somerton Man', 'Isdal Woman', 'Yuba County Five',
    'Bermuda Triangle', 'MH370', 'DB Cooper Hijacking', 'Lindbergh Kidnapping', 'Kennedy Assassination',
    'Watergate Scandal', 'Enron Scandal', 'Bernie Madoff', 'Jordan Belfort', 'Anna Delvey',
    'Theranos Elizabeth Holmes', 'Fyre Festival', 'Wirecard Scandal', 'Panama Papers', 'Paradise Papers',
    'Silk Road Ross Ulbricht', 'Mt. Gox Hack', 'DAO Hack', 'Poly Network Hack', 'FTX Collapse',
    'Sherlock Holmes', 'Hercule Poirot', 'Miss Marple', 'Columbo', 'Inspector Morse',
    'The Maltese Falcon', 'Murder on Orient Express', 'And Then There Were None', 'The Godfather', 'Scarface',
    'Ocean\'s Eleven', 'The Italian Job', 'Heat', 'The Town', 'Baby Driver',
    'Breaking Bad', 'The Wire', 'Narcos', 'Mindhunter', 'True Detective',
    'Jack Reacher', 'Jason Bourne', 'James Bond', 'Ethan Hunt', 'John Wick',
    'Professor Moriarty', 'Lex Luthor', 'The Joker', 'Kingpin', 'Walter White',
    'The Zodiac Cipher', 'Beale Ciphers', 'Voynich Manuscript', 'Kryptos', 'Rongorongo',
    'Tylenol Murders', 'Chicago Tylenol', 'Anthrax Letters', 'Unabomber', 'Oklahoma City Bombing',
    'Boston Marathon Bombing', '9/11 Attacks', 'Lockerbie Bombing', 'Pan Am 103', 'Air India 182',
    'Titanic Sinking', 'Hindenburg Disaster', 'Chernobyl Disaster', 'Bhopal Gas Tragedy', 'Deepwater Horizon',
    'Triangle Shirtwaist Fire', 'Great Chicago Fire', 'San Francisco Earthquake', 'Pompeii Eruption', 'Krakatoa Eruption'
];

module.exports = {
    command: "case",
    alias: ["file", "report", "xfile", "mystery", "unsolved"],
    category: "crime",
    description: "VEX AI Case Files - Random or specific crime/mystery cases using AI fallback",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style?.value || userSettings?.style || 'normal';
        const lang = detectLang(m, args.join(" "));
        const query = args.join(" ").trim();

        const ui = {
            harsh: { react: "🕵️", prefix: "🕵️ 𝙑𝙀𝙓 𝘾𝘼𝙎𝙀 𝙁𝙄𝙇𝙀𝙎:" },
            normal: { react: "🔍", prefix: "🔍 VEX CASE FILES:" },
            girl: { react: "💖", prefix: "💖 𝑽𝑬𝑿 𝑪𝑨𝑺𝑬 𝑭𝑰𝑳𝑬𝑺:" }
        };

        const current = ui[style] || ui.normal;
        await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

        try {
            let caseName;

            // =========================
            // 1. CHAGUA CASE - RANDOM AU SPECIFIC
            // =========================
            if (!query || query.toLowerCase() === 'random' || query.toLowerCase() === 'any') {
                caseName = CASES[Math.floor(Math.random() * CASES.length)];
            } else {
                // Tafuta kwenye list
                const found = CASES.find(c => c.toLowerCase().includes(query.toLowerCase()));
                caseName = found || query;
            }

            // =========================
            // 2. AI FALLBACK - API ZA RENDER TU
            // =========================
            const prompt = `You are VEX AI Case Files Expert. Give a concise case summary of "${caseName}" in ${lang}.
Include: 1) What happened 2) When/Where 3) Key suspects/facts 4) Status: Solved/Unsolved 5) One strange fact.
Max 750 characters. Write in ${lang}. If not ${lang}, use English. No intro. Start direct. If fictional, say so.`;

            const caseData = await callAI(prompt);
            const response = `${current.prefix} *${caseName}*\n\n${caseData}`;

            await sock.sendMessage(m.chat, { text: response }, { quoted: m });

        } catch (err) {
            console.log("CASE ERROR:", err.message);
            await sock.sendMessage(m.chat, {
                text: `${current.prefix} Case file corrupted. Try:.case random`
            }, { quoted: m });
        }
    }
};

// =========================
// AI FALLBACK CHAIN - APIS ZA RENDER TU
// =========================
async function callAI(prompt) {
    const models = [
        { name: 'GROQ', fn: callGroq },
        { name: 'CEREBRAS', fn: callCerebras },
        { name: 'SAMBANOVA', fn: callSambaNova },
        { name: 'GEMINI', fn: callGemini },
        { name: 'OPENROUTER', fn: callOpenRouter },
        { name: 'CLOUDFLARE', fn: callCloudflare }
    ];

    for (const model of models) {
        try {
            if (aiCallCount[model.name] >= 200) continue;

            const result = await Promise.race([
                model.fn(prompt),
                new Promise((_, rej) => setTimeout(() => rej('Timeout'), 3500))
            ]);

            aiCallCount[model.name] = (aiCallCount[model.name] || 0) + 1;
            if (result && result.length > 50) return result;
        } catch (e) {
            continue;
        }
    }
    return "Case file classified. Access denied. Try another case.";
}

async function callGroq(prompt) {
    if (!ENV.GROQ_API_KEY) throw 'No key';
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'system', content: 'You are VEX AI Case Files. Factual, concise, no disclaimers.' }, { role: 'user', content: prompt }],
        max_tokens: 450,
        temperature: 0.4
    }, { headers: { 'Authorization': `Bearer ${ENV.GROQ_API_KEY}` }, timeout: 4000 });
    return res.data.choices[0].message.content.trim();
}

async function callCerebras(prompt) {
    if (!ENV.CEREBRAS_API_KEY) throw 'No key';
    const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
        model: 'llama3.1-8b',
        messages: [{ role: 'system', content: 'You are VEX AI. Expert investigator.' }, { role: 'user', content: prompt }],
        max_tokens: 450,
        temperature: 0.4
    }, { headers: { 'Authorization': `Bearer ${ENV.CEREBRAS_API_KEY}` }, timeout: 4000 });
    return res.data.choices[0].message.content.trim();
}

async function callSambaNova(prompt) {
    if (!ENV.SAMBANOVA_API_KEY) throw 'No key';
    const res = await axios.post('https://api.sambanova.ai/v1/chat/completions', {
        model: 'Meta-Llama-3.1-8B-Instruct',
        messages: [{ role: 'system', content: 'You are VEX AI.' }, { role: 'user', content: prompt }],
        max_tokens: 450
    }, { headers: { 'Authorization': `Bearer ${ENV.SAMBANOVA_API_KEY}` }, timeout: 4000 });
    return res.data.choices[0].message.content.trim();
}

async function callGemini(prompt) {
    if (!ENV.GEMINI_API_KEY) throw 'No key';
    const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: `You are VEX AI Case Files Expert. ${prompt}` }] }]
    }, { timeout: 4000 });
    return res.data.candidates[0].content.parts[0].text.trim();
}

async function callOpenRouter(prompt) {
    if (!ENV.OPENROUTER_API_KEY) throw 'No key';
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'system', content: 'You are VEX AI.' }, { role: 'user', content: prompt }],
        max_tokens: 450
    }, { headers: { 'Authorization': `Bearer ${ENV.OPENROUTER_API_KEY}` }, timeout: 4000 });
    return res.data.choices[0].message.content.trim();
}

async function callCloudflare(prompt) {
    if (!ENV.CLOUDFLARE_API_KEY ||!ENV.CLOUDFLARE_ACCOUNT_ID) throw 'No key';
    const res = await axios.post(`https://api.cloudflare.com/client/v4/accounts/${ENV.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
        messages: [{ role: 'system', content: 'You are VEX AI.' }, { role: 'user', content: prompt }]
    }, { headers: { 'Authorization': `Bearer ${ENV.CLOUDFLARE_API_KEY}` }, timeout: 4000 });
    return res.data.result.response.trim();
}

// =========================
// LANGUAGE DETECTION
// =========================
function detectLang(m, text = '') {
    const content = text || m.body || m.message?.conversation || '';
    if (/[\u0B80-\u0BFF]/.test(content)) return 'Tamil';
    if (/[\u0C00-\u0C7F]/.test(content)) return 'Telugu';
    if (/[\u0900-\u097F]/.test(content)) return 'Hindi';
    if (/[ء-ي]/.test(content)) return 'Arabic';
    if (/\b(ya|na|wa|za|ni|kwa|hii|hiyo|vipi|gani|nini|kesi|mauaji|siri)\b/i.test(content)) return 'Swahili';
    if (/[àáâãäåæçèéêëìíîïñòóôõöùúûüý]/.test(content)) return 'Spanish';
    if (/[àâçéèêëîïôûùüÿ]/.test(content)) return 'French';
    if (/[äöüß]/.test(content)) return 'German';
    if (/[а-яА-Я]/.test(content)) return 'Russian';
    if (/[你我他]/.test(content)) return 'Chinese';
    if (/[あ-ん]/.test(content)) return 'Japanese';
    return 'English';
}

// Reset AI count daily
setInterval(() => { aiCallCount = {}; }, 86400000);
