const translate = require('google-translate-api-x');

module.exports = {
    command: "antidelete",
    alias: ["ad", "antidel"],
    category: "admin",
    description: "Enable or disable the Anti-Delete V2.0 system",

    async execute(m, sock, { args, supabase, userSettings }) {
        // 1. EXTRACT PREFERENCES FROM CACHE
        const style = userSettings?.style || 'harsh';
        const lang = userSettings?.lang || 'en';
        const action = args[0]?.toLowerCase();

        const modes = {
            harsh: {
                title: "☣️ 𝕬𝕹𝕿𝕴-𝕯𝕰𝕷𝕰𝕿𝕰 𝕮𝕺𝕹𝕿𝕽𝕺𝕷 ☣️",
                on: "⚙️ 𝕬𝖓𝖙𝖎-𝕯𝖊𝖑𝖊𝖙𝖊 𝕾𝖞𝖘𝖙𝖊𝖒: 𝕺𝕹. 𝕹𝖔𝖜𝖍𝖊𝖗𝖊 𝖙𝖔 𝖍𝖎𝖉𝖊.",
                off: "⚙️ 𝕬𝖓𝖙𝖎-𝕯𝖊𝖑𝖊𝖙𝖊 𝕾𝖞𝖘𝖙𝖊𝖒: 𝕺𝕱𝕱. 𝕰𝖛𝖎𝖉𝖊𝖓𝖈𝖊 𝖜𝖎𝖑𝖑 𝖇𝖊 𝖑𝖔𝖘𝖙.",
                invalid: "☘️ 𝖂AKE 𝖀𝕻! 𝖀𝖘𝖊 '𝖔𝖓' 𝖔𝖗 '𝖔𝖋𝖋'!",
                react: "☣️"
            },
            normal: {
                title: "💠 VEX Anti-Delete Switch 💠",
                on: "✅ Anti-Delete system is now ACTIVE.",
                off: "❌ Anti-Delete system is now INACTIVE.",
                invalid: "❓ Invalid input. Use: .antidelete on/off",
                react: "💠"
            },
            girl: {
                title: "🫧 𝐿𝓊𝓅𝑒𝓇'𝓈 𝒫𝒾𝓃𝓀 𝑅𝑒𝒸𝑜𝓋𝑒𝓇𝓎 🫧",
                on: "🫧 𝒶𝓃𝓉𝒾-𝒹𝑒𝓁𝑒𝓉𝑒 𝒾𝓈 𝑜𝓃! 𝓃𝑜 𝓂𝑜𝓇𝑒 𝓁𝑜𝓈𝓉 𝓈𝑒𝒸𝓇𝑒𝓉𝓈~ 🫧",
                off: "🫧 𝒶𝓃𝓉𝒾-𝒹𝑒𝓁𝑒𝓉𝑒 𝒾𝓈 𝑜𝒻𝒻. 𝓁𝑒𝓉'𝓈 𝑔𝒾𝓋𝑒 𝓉𝒽𝑒𝓂 𝓅𝓇𝒾𝓋𝒶𝒸𝓎. 🫧",
                invalid: "🫧 𝑜𝑜𝓅𝓈𝒾𝑒! 𝓅𝓁𝑒𝒶𝓈𝑒 𝓉𝓎𝓅𝑒 '𝑜n' 𝑜𝓇 '𝑜𝒻𝒻' 𝒷𝒶𝒷𝑒! 🫧",
                react: "🫧"
            }
        };

        const current = modes[style] || modes.normal;

        // 2. VALIDATE INPUT
        if (!action || (action !== 'on' && action !== 'off')) {
            return m.reply(current.invalid);
        }

        const newState = (action === 'on');

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 3. UPDATE LUPER_CONFIG TABLE
            const { error } = await supabase
                .from("luper_config")
                .update({ 
                    is_active: newState, 
                    last_modified: new Date() 
                })
                .eq("config_key", "anti_delete_enabled");

            if (error) throw error;

            // 4. TRANSLATE AND NOTIFY
            const responseText = `*${current.title}*\n\n${newState ? current.on : current.off}`;
            const { text: translatedMsg } = await translate(responseText, { to: lang });

            await m.reply(translatedMsg);

        } catch (error) {
            console.error("ANTI-DELETE TOGGLE ERROR:", error);
            await m.reply("☣️ Database Failure: Could not sync Anti-Delete status.");
        }
    }
};
