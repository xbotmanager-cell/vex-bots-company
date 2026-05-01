const natural = require('natural');
const nlp = require('compromise');
const translate = require('google-translate-api-x');

// Local Memory for context (In-memory fallback)
const chatContext = new Map();

module.exports = {
    name: "ai_engine",

    // TRIGGER: Inahakikisha AI haingilii amri (.command)
    trigger: (m, { body }) => {
        const isText = typeof body === "string" && body.length > 0;
        const isCommand = body.startsWith(".");
        return isText && !isCommand && !m.key.fromMe;
    },

    async onMessage(m, sock, ctx) {
        const { supabase, body, userSettings } = ctx;
        const sender = m.sender;
        const chatJid = m.chat;

        try {
            // 1. PATA SETTINGS KUTOKA SQL (Lupin's SQL Structure)
            const { data: settings } = await supabase
                .from("ai_settings")
                .select("*")
                .eq("jid", chatJid)
                .single();

            // Kama chatbot imezimwa hapa, acha kabisa
            if (settings && !settings.is_chatbot_active) return;

            // 2. LUPIN'S SOUL (Personality & Local Intelligence)
            const { data: traits } = await supabase
                .from("ai_personality")
                .select("trait_key, content");

            const personality = traits.reduce((acc, curr) => {
                acc[curr.trait_key] = curr.content;
                return acc;
            }, {});

            // 3. INTENT RECOGNITION (Local Brain - Natural)
            const tokenizer = new natural.WordTokenizer();
            const tokens = tokenizer.tokenize(body.toLowerCase());
            const doc = nlp(body.toLowerCase());

            let responseText = "";

            // LOGIC: Je, anataka Command? (Command Brain Integration)
            if (doc.has('picha') || doc.has('image') || doc.has('nionyeshe')) {
                // Hapa AI inajua user anataka kitu, inakaa kimya ili Command Brain ichukue mkondo
                return; 
            }

            // 4. GENERATE HUMAN-LIKE REPLY (Digital Twin Logic)
            if (doc.has('mambo') || doc.has('habari') || doc.has('vipi')) {
                responseText = personality.greeting || "Niaje mwanangu, inakuwaje?";
            } else {
                // Hapa ndipo Local AI inafikiri (Simple Example)
                responseText = `Mwanangu, nimekusoma. Kuhusu "${body}", acha nicheki kitaa kwanza.`;
            }

            // 5. STYLE & TRANSLATION
            const style = settings?.response_style || userSettings?.style || "harsh";
            const lang = userSettings?.lang || "en";

            const modes = {
                harsh: (t) => `☣️ ${t.toUpperCase()} ☣️`,
                normal: (t) => `${t}`,
                girl: (t) => `🫧 ${t} ✨`
            };

            let finalText = modes[style] ? modes[style](responseText) : responseText;

            if (lang !== "en") {
                const { text } = await translate(finalText, { to: lang });
                finalText = text;
            }

            // 6. ACTION: REACTIONS & TYPING
            await sock.sendMessage(chatJid, { react: { text: "👁️‍🗨️", key: m.key } });
            
            // Simulation ya binadamu anaandika (RAM Friendly Delay)
            await new Promise(r => setTimeout(r, 1500));

            await sock.sendMessage(chatJid, { 
                text: finalText 
            }, { quoted: m });

            // 7. UPDATE MEMORY (SQL)
            await supabase.from("ai_memory").upsert({
                user_jid: sender,
                last_intent: tokens.slice(0, 3).join(" "),
                updated_at: new Date()
            });

        } catch (err) {
            console.error("AI_ENGINE_ERROR:", err);
        }
    }
};
