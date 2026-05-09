const axios = require('axios');

// =========================
// ENV - AI APIs ZILIZOPO RENDER
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
// 100+ HISTORICAL FIGURES - WOTE MAJAMAA WAKUBWA
// =========================
const SCIENTISTS = [
    'Nikola Tesla', 'Albert Einstein', 'Isaac Newton', 'Marie Curie', 'Thomas Edison',
    'Galileo Galilei', 'Stephen Hawking', 'Charles Darwin', 'Alan Turing', 'Leonardo da Vinci',
    'Alexander Graham Bell', 'Michael Faraday', 'James Clerk Maxwell', 'Max Planck', 'Niels Bohr',
    'Richard Feynman', 'Werner Heisenberg', 'Erwin Schrödinger', 'Paul Dirac', 'Enrico Fermi',
    'Louis Pasteur', 'Gregor Mendel', 'Alfred Nobel', 'Dmitri Mendeleev', 'Robert Oppenheimer',
    'Rosalind Franklin', 'Ada Lovelace', 'Grace Hopper', 'Katherine Johnson', 'Chien-Shiung Wu',
    'Archimedes', 'Pythagoras', 'Aristotle', 'Copernicus', 'Johannes Kepler',
    'Blaise Pascal', 'Gottfried Leibniz', 'Carl Friedrich Gauss', 'Leonhard Euler', 'Bernhard Riemann',
    'John von Neumann', 'Norbert Wiener', 'Claude Shannon', 'Dennis Ritchie', 'Linus Torvalds',
    'Tim Berners-Lee', 'Vint Cerf', 'Robert Kahn', 'Steve Jobs', 'Bill Gates',
    'Elon Musk', 'Steve Wozniak', 'Larry Page', 'Sergey Brin', 'Mark Zuckerberg',
    'Benjamin Franklin', 'George Washington Carver', 'Percy Julian', 'Mae Jemison', 'Neil deGrasse Tyson',
    'Carl Sagan', 'Edwin Hubble', 'Vera Rubin', 'Jocelyn Bell Burnell', 'Kip Thorne',
    'James Watson', 'Francis Crick', 'Jonas Salk', 'Edward Jenner', 'Alexander Fleming',
    'Rachel Carson', 'Jane Goodall', 'Dian Fossey', 'Wangari Maathai', 'Tu Youyou',
    'Ibn al-Haytham', 'Al-Khwarizmi', 'Avicenna', 'Omar Khayyam', 'Al-Biruni',
    'Srinivasa Ramanujan', 'C. V. Raman', 'Homi J. Bhabha', 'A. P. J. Abdul Kalam', 'Venkatraman Ramakrishnan',
    'Zhang Heng', 'Shen Kuo', 'Su Song', 'Yuan Longping', 'Qian Xuesen',
    'Hypatia', 'Émilie du Châtelet', 'Sophie Germain', 'Emmy Noether', 'Maryam Mirzakhani',
    'Antonie van Leeuwenhoek', 'Robert Hooke', 'Antoine Lavoisier', 'John Dalton', 'Amedeo Avogadro',
    'William Thomson', 'Lord Kelvin', 'James Prescott Joule', 'Hermann von Helmholtz', 'Ludwig Boltzmann',
    'Guglielmo Marconi', 'Heinrich Hertz', 'Wilhelm Röntgen', 'Henri Becquerel', 'Pierre Curie',
    'J. J. Thomson', 'Ernest Rutherford', 'James Chadwick', 'Lise Meitner', 'Otto Hahn',
    'Subrahmanyan Chandrasekhar', 'Satyendra Nath Bose', 'Meghnad Saha', 'Jagadish Chandra Bose', 'Prafulla Chandra Ray',
    'Abdus Salam', 'Ahmed Zewail', 'Farouk El-Baz', 'Sameera Moussa', 'Mostafa El-Sayed'
];

module.exports = {
    command: "history",
    alias: ["hist", "scientist", "inventor", "tesla", "einstein", "newton", "curie"],
    category: "events",
    description: "VEX AI History - Random or specific scientist/inventor biography using AI fallback",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style?.value || userSettings?.style || 'normal';
        const lang = detectLang(m, args.join(" "));
        const query = args.join(" ").trim();

        const ui = {
            harsh: { react: "⚡", prefix: "⚡ 𝙑𝙀𝙓 𝙃𝙄𝙎𝙏𝙊𝙍𝙔:" },
            normal: { react: "📚", prefix: "📚 VEX HISTORY:" },
            girl: { react: "💖", prefix: "💖 𝑽𝑬𝑿 𝑯𝑰𝑺𝑻𝑶𝑹𝒀:" }
        };

        const current = ui[style] || ui.normal;
        await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

        try {
            let person;

            // =========================
            // 1. CHAGUA MTU - RANDOM AU SPECIFIC
            // =========================
            if (!query || query.toLowerCase() === 'random' || query.toLowerCase() === 'any') {
                person = SCIENTISTS[Math.floor(Math.random() * SCIENTISTS.length)];
            } else {
                // Check alias kama.tesla
                const cmdName = m.body?.split(' ')[0]?.replace(/^[./!]/, '').toLowerCase();
                const matched = SCIENTISTS.find(s => s.toLowerCase().includes(cmdName));
                if (matched && ['tesla', 'einstein', 'newton', 'curie'].includes(cmdName)) {
                    person = matched;
                } else {
                    // Tafuta kwenye list
                    const found = SCIENTISTS.find(s => s.toLowerCase().includes(query.toLowerCase()));
                    person = found || query;
                }
            }

            // =========================
            // 2. AI FALLBACK - API ZA RENDER TU
            // =========================
            const prompt = `You are VEX AI History Expert. Give a concise biography of ${person} in ${lang}.
Include: 1) Birth/Death 2) Major discoveries/inventions 3) Impact on world 4) One interesting fact.
Max 700 characters. Write in ${lang}. If not ${lang}, use English. No intro like "Here is". Start direct.`;

            const history = await callAI(prompt);
            const response = `${current.prefix} *${person}*\n\n${history}`;

            await sock.sendMessage(m.chat, { text: response }, { quoted: m });

        } catch (err) {
            console.log("HISTORY ERROR:", err.message);
            await sock.sendMessage(m.chat, {
                text: `${current.prefix} Failed. Try:.history Tesla`
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
    return "Historical data temporarily unavailable. Try again.";
}

async function callGroq(prompt) {
    if (!ENV.GROQ_API_KEY) throw 'No key';
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'system', content: 'You are VEX AI History Expert. Be concise, factual.' }, { role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.3
    }, { headers: { 'Authorization': `Bearer ${ENV.GROQ_API_KEY}` }, timeout: 4000 });
    return res.data.choices[0].message.content.trim();
}

async function callCerebras(prompt) {
    if (!ENV.CEREBRAS_API_KEY) throw 'No key';
    const res = await axios.post('https://api.cerebras.ai/v1/chat/completions', {
        model: 'llama3.1-8b',
        messages: [{ role: 'system', content: 'You are VEX AI. Expert historian.' }, { role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.3
    }, { headers: { 'Authorization': `Bearer ${ENV.CEREBRAS_API_KEY}` }, timeout: 4000 });
    return res.data.choices[0].message.content.trim();
}

async function callSambaNova(prompt) {
    if (!ENV.SAMBANOVA_API_KEY) throw 'No key';
    const res = await axios.post('https://api.sambanova.ai/v1/chat/completions', {
        model: 'Meta-Llama-3.1-8B-Instruct',
        messages: [{ role: 'system', content: 'You are VEX AI.' }, { role: 'user', content: prompt }],
        max_tokens: 400
    }, { headers: { 'Authorization': `Bearer ${ENV.SAMBANOVA_API_KEY}` }, timeout: 4000 });
    return res.data.choices[0].message.content.trim();
}

async function callGemini(prompt) {
    if (!ENV.GEMINI_API_KEY) throw 'No key';
    const res = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: `You are VEX AI History Expert. ${prompt}` }] }]
    }, { timeout: 4000 });
    return res.data.candidates[0].content.parts[0].text.trim();
}

async function callOpenRouter(prompt) {
    if (!ENV.OPENROUTER_API_KEY) throw 'No key';
    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [{ role: 'system', content: 'You are VEX AI.' }, { role: 'user', content: prompt }],
        max_tokens: 400
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
    if (/\b(ya|na|wa|za|ni|kwa|hii|hiyo|vipi|gani|nini|alikuwa|mwanasayansi|mvumbuzi)\b/i.test(content)) return 'Swahili';
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
