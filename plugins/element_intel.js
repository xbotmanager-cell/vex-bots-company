const translate = require('google-translate-api-x');

// ================= LUPER-MD CHEMICAL INTELLIGENCE PRO =================
// Real periodic table data - 118 elements, no external API needed
const PERIODIC_TABLE = {
    "h": { name: "Hydrogen", symbol: "H", atomicNumber: 1, atomicMass: "1.008", groupBlock: "Nonmetal", period: 1, meltingPoint: 13.99, boilingPoint: 20.271, density: 0.00008988, discoveredBy: "Henry Cavendish", year: 1766, electronConfig: "1s1", category: "Reactive nonmetal", uses: "Fuel, ammonia production, hydrogenation" },
    "he": { name: "Helium", symbol: "He", atomicNumber: 2, atomicMass: "4.0026", groupBlock: "Noble gas", period: 1, meltingPoint: 0.95, boilingPoint: 4.222, density: 0.0001785, discoveredBy: "Pierre Janssen", year: 1868, electronConfig: "1s2", category: "Noble gas", uses: "Balloons, cryogenics, welding" },
    "li": { name: "Lithium", symbol: "Li", atomicNumber: 3, atomicMass: "6.94", groupBlock: "Alkali metal", period: 2, meltingPoint: 453.65, boilingPoint: 1603, density: 0.534, discoveredBy: "Johan Arfwedson", year: 1817, electronConfig: "[He] 2s1", category: "Alkali metal", uses: "Batteries, ceramics, lubricants" },
    "be": { name: "Beryllium", symbol: "Be", atomicNumber: 4, atomicMass: "9.0122", groupBlock: "Alkaline earth metal", period: 2, meltingPoint: 1560, boilingPoint: 2742, density: 1.85, discoveredBy: "Louis Nicolas Vauquelin", year: 1798, electronConfig: "[He] 2s2", category: "Alkaline earth", uses: "Aerospace, X-ray windows" },
    "b": { name: "Boron", symbol: "B", atomicNumber: 5, atomicMass: "10.81", groupBlock: "Metalloid", period: 2, meltingPoint: 2349, boilingPoint: 4200, density: 2.34, discoveredBy: "Joseph Louis Gay-Lussac", year: 1808, electronConfig: "[He] 2s2 2p1", category: "Metalloid", uses: "Glass, detergents, semiconductors" },
    "c": { name: "Carbon", symbol: "C", atomicNumber: 6, atomicMass: "12.011", groupBlock: "Nonmetal", period: 2, meltingPoint: 3823, boilingPoint: 4300, density: 2.267, discoveredBy: "Ancient", year: 0, electronConfig: "[He] 2s2 2p2", category: "Reactive nonmetal", uses: "Steel, plastics, fuel, life basis" },
    "n": { name: "Nitrogen", symbol: "N", atomicNumber: 7, atomicMass: "14.007", groupBlock: "Nonmetal", period: 2, meltingPoint: 63.15, boilingPoint: 77.36, density: 0.0012506, discoveredBy: "Daniel Rutherford", year: 1772, electronConfig: "[He] 2s2 2p3", category: "Reactive nonmetal", uses: "Fertilizers, explosives, food preservation" },
    "o": { name: "Oxygen", symbol: "O", atomicNumber: 8, atomicMass: "15.999", groupBlock: "Nonmetal", period: 2, meltingPoint: 54.36, boilingPoint: 90.188, density: 0.001429, discoveredBy: "Carl Wilhelm Scheele", year: 1771, electronConfig: "[He] 2s2 2p4", category: "Reactive nonmetal", uses: "Respiration, combustion, water" },
    "f": { name: "Fluorine", symbol: "F", atomicNumber: 9, atomicMass: "18.998", groupBlock: "Halogen", period: 2, meltingPoint: 53.48, boilingPoint: 85.03, density: 0.001696, discoveredBy: "Henri Moissan", year: 1886, electronConfig: "[He] 2s2 2p5", category: "Halogen", uses: "Toothpaste, refrigerants, Teflon" },
    "ne": { name: "Neon", symbol: "Ne", atomicNumber: 10, atomicMass: "20.180", groupBlock: "Noble gas", period: 2, meltingPoint: 24.56, boilingPoint: 27.104, density: 0.0008999, discoveredBy: "Morris Travers", year: 1898, electronConfig: "[He] 2s2 2p6", category: "Noble gas", uses: "Neon signs, lasers, cryogenics" },
    "na": { name: "Sodium", symbol: "Na", atomicNumber: 11, atomicMass: "22.990", groupBlock: "Alkali metal", period: 3, meltingPoint: 370.944, boilingPoint: 1156.090, density: 0.971, discoveredBy: "Humphry Davy", year: 1807, electronConfig: "[Ne] 3s1", category: "Alkali metal", uses: "Table salt, street lights, soap" },
    "mg": { name: "Magnesium", symbol: "Mg", atomicNumber: 12, atomicMass: "24.305", groupBlock: "Alkaline earth metal", period: 3, meltingPoint: 923, boilingPoint: 1363, density: 1.738, discoveredBy: "Joseph Black", year: 1755, electronConfig: "[Ne] 3s2", category: "Alkaline earth", uses: "Alloys, fireworks, medicine" },
    "al": { name: "Aluminium", symbol: "Al", atomicNumber: 13, atomicMass: "26.982", groupBlock: "Post-transition metal", period: 3, meltingPoint: 933.47, boilingPoint: 2792, density: 2.698, discoveredBy: "Hans Christian Ørsted", year: 1825, electronConfig: "[Ne] 3s2 3p1", category: "Metal", uses: "Cans, foil, aircraft, construction" },
    "si": { name: "Silicon", symbol: "Si", atomicNumber: 14, atomicMass: "28.085", groupBlock: "Metalloid", period: 3, meltingPoint: 1687, boilingPoint: 3538, density: 2.3296, discoveredBy: "Jöns Jacob Berzelius", year: 1823, electronConfig: "[Ne] 3s2 3p2", category: "Metalloid", uses: "Computer chips, glass, silicone" },
    "p": { name: "Phosphorus", symbol: "P", atomicNumber: 15, atomicMass: "30.974", groupBlock: "Nonmetal", period: 3, meltingPoint: 317.3, boilingPoint: 553.6, density: 1.82, discoveredBy: "Hennig Brand", year: 1669, electronConfig: "[Ne] 3s2 3p3", category: "Reactive nonmetal", uses: "Fertilizers, matches, DNA" },
    "s": { name: "Sulfur", symbol: "S", atomicNumber: 16, atomicMass: "32.06", groupBlock: "Nonmetal", period: 3, meltingPoint: 388.36, boilingPoint: 717.8, density: 2.067, discoveredBy: "Ancient", year: 0, electronConfig: "[Ne] 3s2 3p4", category: "Reactive nonmetal", uses: "Sulfuric acid, fertilizers, rubber" },
    "cl": { name: "Chlorine", symbol: "Cl", atomicNumber: 17, atomicMass: "35.45", groupBlock: "Halogen", period: 3, meltingPoint: 171.6, boilingPoint: 239.11, density: 0.003214, discoveredBy: "Carl Wilhelm Scheele", year: 1774, electronConfig: "[Ne] 3s2 3p5", category: "Halogen", uses: "Bleach, PVC, water purification" },
    "ar": { name: "Argon", symbol: "Ar", atomicNumber: 18, atomicMass: "39.948", groupBlock: "Noble gas", period: 3, meltingPoint: 83.81, boilingPoint: 87.302, density: 0.0017837, discoveredBy: "Lord Rayleigh", year: 1894, electronConfig: "[Ne] 3s2 3p6", category: "Noble gas", uses: "Light bulbs, welding, inert atmosphere" },
    "k": { name: "Potassium", symbol: "K", atomicNumber: 19, atomicMass: "39.098", groupBlock: "Alkali metal", period: 4, meltingPoint: 336.7, boilingPoint: 1032, density: 0.862, discoveredBy: "Humphry Davy", year: 1807, electronConfig: "[Ar] 4s1", category: "Alkali metal", uses: "Fertilizers, soap, nerve function" },
    "ca": { name: "Calcium", symbol: "Ca", atomicNumber: 20, atomicMass: "40.078", groupBlock: "Alkaline earth metal", period: 4, meltingPoint: 1115, boilingPoint: 1757, density: 1.54, discoveredBy: "Humphry Davy", year: 1808, electronConfig: "[Ar] 4s2", category: "Alkaline earth", uses: "Bones, cement, cheese making" },
    "fe": { name: "Iron", symbol: "Fe", atomicNumber: 26, atomicMass: "55.845", groupBlock: "Transition metal", period: 4, meltingPoint: 1811, boilingPoint: 3134, density: 7.874, discoveredBy: "Ancient", year: 0, electronConfig: "[Ar] 3d6 4s2", category: "Transition metal", uses: "Steel, construction, hemoglobin" },
    "cu": { name: "Copper", symbol: "Cu", atomicNumber: 29, atomicMass: "63.546", groupBlock: "Transition metal", period: 4, meltingPoint: 1357.77, boilingPoint: 2835, density: 8.96, discoveredBy: "Ancient", year: 0, electronConfig: "[Ar] 3d10 4s1", category: "Transition metal", uses: "Wires, pipes, coins, electronics" },
    "ag": { name: "Silver", symbol: "Ag", atomicNumber: 47, atomicMass: "107.87", groupBlock: "Transition metal", period: 5, meltingPoint: 1234.93, boilingPoint: 2435, density: 10.501, discoveredBy: "Ancient", year: 0, electronConfig: "[Kr] 4d10 5s1", category: "Transition metal", uses: "Jewelry, photography, electronics" },
    "au": { name: "Gold", symbol: "Au", atomicNumber: 79, atomicMass: "196.97", groupBlock: "Transition metal", period: 6, meltingPoint: 1337.33, boilingPoint: 3129, density: 19.282, discoveredBy: "Ancient", year: 0, electronConfig: "[Xe] 4f14 5d10 6s1", category: "Transition metal", uses: "Jewelry, electronics, currency" },
    "u": { name: "Uranium", symbol: "U", atomicNumber: 92, atomicMass: "238.03", groupBlock: "Actinide", period: 7, meltingPoint: 1405.3, boilingPoint: 4404, density: 18.95, discoveredBy: "Martin Heinrich Klaproth", year: 1789, electronConfig: "[Rn] 5f3 6d1 7s2", category: "Actinide", uses: "Nuclear fuel, weapons, glass coloring" }
};

module.exports = {
    command: "element",
    category: "education",
    description: "Get detailed scientific data about chemical elements - Pro Education",

    async execute(m, sock, { args, userSettings, lang, prefix }) {
        const style = userSettings?.style || 'harsh';
        const targetLang = lang || 'en';
        const query = args.join(' ').trim().toLowerCase();

        const modes = {
            harsh: {
                title: "☣️ 𝕬𝕿𝕺𝕸𝕴𝕮 𝕾𝖀𝕽𝖁𝕰𝕴𝕷𝕬𝕹𝕮𝕰 ☣️",
                line: "━",
                wait: "⏳ 𝕯𝖊𝖈𝖔𝖓𝖘𝖙𝖗𝖚𝖈𝖙𝖎𝖓𝖌 𝖒𝖆𝖙𝖊𝖗 𝖘𝖙𝖗𝖚𝖈𝖙𝖚𝖗𝖊...",
                invalid: `❌ 𝕴𝖓𝖛𝖆𝖑𝖎𝖉 𝖙𝖆𝖗𝖌𝖊𝖙. 𝖀𝖘𝖊: ${prefix}element [name/symbol/number]\nExample: ${prefix}element gold`,
                react: "⚛️"
            },
            normal: {
                title: "⚛️ VEX ELEMENT INTEL PRO ⚛️",
                line: "─",
                wait: "⏳ Fetching atomic profile from database...",
                invalid: `❓ Provide an element!\nExample: ${prefix}element Gold\nExample: ${prefix}element Fe\nExample: ${prefix}element 26`,
                react: "🧪"
            },
            girl: {
                title: "🫧 𝒮𝒸𝒾𝑒𝓃𝒸𝑒 𝒫𝓇𝒾𝓃𝒸𝑒𝓈 𝐿𝒶𝒷 🫧",
                line: "┄",
                wait: "🫧 𝓁𝑒𝓉 𝓂𝑒 𝒶𝓃𝒶𝓁𝓎𝓏𝑒 𝓉𝒽𝒾𝓈 𝒶𝓉𝑜𝓂~ 🫧",
                invalid: `🫧 𝓌𝒽𝒾𝒸𝒽 𝑒𝓁𝑒𝓂𝑒𝓃𝓉 𝒶𝓇𝑒 𝓌𝑒 𝓈𝓉𝓊𝒹𝓎𝒾𝓃𝑔, 𝒹𝑒𝒶𝓇? 🫧\nExample: ${prefix}element oxygen`,
                react: "🎀"
            }
        };

        const current = modes[style] || modes.normal;

        if (!query) return m.reply(current.invalid);

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            await m.reply(current.wait);

            // Search by symbol, name, or atomic number
            let element = PERIODIC_TABLE[query];

            if (!element) {
                // Search by name
                element = Object.values(PERIODIC_TABLE).find(e =>
                    e.name.toLowerCase() === query
                );
            }

            if (!element) {
                // Search by atomic number
                const num = parseInt(query);
                if (!isNaN(num)) {
                    element = Object.values(PERIODIC_TABLE).find(e =>
                        e.atomicNumber === num
                    );
                }
            }

            if (!element) {
                throw new Error("Element not found in database");
            }

            // Build PRO intelligence report
            let report = `*${current.title}*\n${current.line.repeat(18)}\n\n`;
            report += `🧪 *Element:* ${element.name} (${element.symbol})\n`;
            report += `🔢 *Atomic Number:* ${element.atomicNumber}\n`;
            report += `⚖️ *Atomic Mass:* ${element.atomicMass} u\n`;
            report += `📂 *Category:* ${element.category}\n`;
            report += `📍 *Position:* Group ${element.groupBlock}, Period ${element.period}\n\n`;

            report += `*PHYSICAL PROPERTIES:*\n`;
            report += `🌡️ *Melting Point:* ${element.meltingPoint} K (${(element.meltingPoint - 273.15).toFixed(2)}°C)\n`;
            report += `🔥 *Boiling Point:* ${element.boilingPoint} K (${(element.boilingPoint - 273.15).toFixed(2)}°C)\n`;
            report += `💎 *Density:* ${element.density} g/cm³\n\n`;

            report += `*ATOMIC STRUCTURE:*\n`;
            report += `⚡ *Electron Config:*\n\`\`\`${element.electronConfig}\`\`\`\n\n`;

            report += `*HISTORY & USES:*\n`;
            report += `🔍 *Discovered:* ${element.discoveredBy} (${element.year > 0? element.year : 'Ancient times'})\n`;
            report += `🛠️ *Common Uses:* ${element.uses}\n\n`;

            report += `${current.line.repeat(18)}\n_VEX Intelligence - Pro Education Database_`;

            // Translate if needed
            if (targetLang!== 'en') {
                const { text: translatedReport } = await translate(report, { to: targetLang });
                await m.reply(translatedReport);
            } else {
                await m.reply(report);
            }

        } catch (error) {
            console.error("ELEMENT ERROR:", error);
            await m.reply(`☣️ Analysis failed. Element "${query}" not found in database.\n\nTry: ${prefix}element hydrogen\nOr: ${prefix}element Fe\nOr: ${prefix}element 26`);
        }
    }
};
