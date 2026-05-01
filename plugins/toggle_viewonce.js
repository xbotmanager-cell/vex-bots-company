const translate = require('google-translate-api-x');

module.exports = {
    command: "viewonce",
    alias: ["vo", "vospy"],
    category: "admin",
    description: "Enable or disable the Global View-Once Spy system",

    async execute(m, sock, { args, supabase, userSettings }) {
        // 1. EXTRACT PREFERENCES FROM CACHE
        const style = userSettings?.style || 'harsh';
        const lang = userSettings?.lang || 'en';
        const action = args[0]?.toLowerCase();

        const modes = {
            harsh: {
                title: "☣️ 𝖁𝕴𝕰𝖂-𝕺𝕹𝕮𝕰 𝕾𝖄𝕾𝕿𝕰𝕸 𝕮𝕺𝕹𝕿𝕽𝕺𝕷 ☣️",
                on: "⚙️ 𝖁𝖎𝖊𝖜-𝕺𝖓𝖈𝖊 𝕾𝖕𝖞: 𝕬𝕮𝕿𝕴𝖁𝕬𝕿𝕰𝕯. 𝕴 𝖘𝖊𝖊 𝖊𝖛𝖊𝖗𝖞𝖙𝖍𝖎𝖓𝖌.",
                off: "⚙️ 𝖁𝖎𝖊𝖜-𝕺𝖓𝖈𝖊 𝕾𝖕𝖞: 𝕯𝕰𝕬𝕿𝕴𝖁𝕬𝕿𝕰𝕯. 𝕿𝖍𝖊𝖎𝖗 𝖘𝖊𝖈𝖗𝖊𝖙𝖘 𝖆𝖗𝖊 𝖘𝖆𝖋𝖊... 𝖋𝖔𝖗 𝖓𝖔𝖜.",
                invalid: "☘️ 𝖀𝖘𝖊 '𝖔𝖓' 𝖔𝖗 '𝖔𝖋𝖋', 𝖞𝖔𝖚 𝖇𝖑𝖎𝖓𝖉 𝖋𝖔𝖔𝖑!",
                react: "☣️"
            },
            normal: {
                title: "💠 VEX View-Once Switch 💠",
                on: "✅ Global View-Once monitoring is now ENABLED.",
                off: "❌ Global View-Once monitoring is now DISABLED.",
                invalid: "❓ Please specify 'on' or 'off'.",
                react: "💠"
            },
            girl: {
                title: "🫧 𝐿𝓊𝓅𝑒𝓇'𝓈 𝐻𝒾𝒹𝒹𝑒𝓃 𝐸𝓎𝑒 🫧",
                on: "🫧 𝓋𝒾𝑒𝓌-𝑜𝓃𝒸𝑒 𝓈𝓅𝓎 𝒾𝓈 𝑜𝓃! 𝓃𝑜 𝓂𝑜𝓇𝑒 𝒽𝒾𝒹𝒾𝓃𝑔 𝒻𝓇𝑜𝓂 𝓂𝑒~ 🫧",
                off: "🫧 𝓋𝒾𝑒𝓌-𝑜𝓃𝒸𝑒 𝓈𝓅𝓎 𝒾𝓈 𝑜𝒻𝒻. 𝐼'𝓁𝓁 𝒸𝓁𝑜𝓈𝑒 𝓂𝓎 𝑒𝓎𝑒𝓈 𝒻𝑜𝓇 𝒶 𝒷𝒾𝓉. 🫧",
                invalid: "🫧 𝓅𝓁𝑒𝒶𝓈𝑒 𝓉𝓎𝓅𝑒 '𝑜𝓃' 𝑜𝓇 '𝑜𝒻𝒻', 𝓈𝓌𝖊𝑒𝓉𝒾𝑒! 🫧",
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
                .eq("config_key", "view_once_global_catch");

            if (error) throw error;

            // 4. TRANSLATE AND NOTIFY
            const responseText = `*${current.title}*\n\n${newState ? current.on : current.off}`;
            const { text: translatedMsg } = await translate(responseText, { to: lang });

            await m.reply(translatedMsg);

        } catch (error) {
            console.error("VIEW-ONCE TOGGLE ERROR:", error);
            await m.reply("☣️ Database Sync Failed. Could not change Spy status.");
        }
    }
};
