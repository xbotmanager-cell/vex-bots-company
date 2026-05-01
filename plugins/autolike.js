const translate = require('google-translate-api-x');

module.exports = {
    command: "autolike",
    alias: ["alike", "statuslink"],
    category: "admin",
    description: "Enable or disable the status auto-reaction feature",

    async execute(m, sock, { args, supabase, userSettings }) {
        // 1. EXTRACT PREFERENCES
        const style = userSettings?.style || 'harsh';
        const lang = userSettings?.lang || 'en';
        const action = args[0]?.toLowerCase();

        const modes = {
            harsh: {
                title: "☣️ 𝕾𝖄𝕾𝕿𝕰𝕸 𝕮𝕺𝕹𝕿𝕽𝕺𝕷 ☣️",
                on: "⚙️ 𝕬𝖚𝖙𝖔-𝕷𝖎𝖐𝖊 𝕬𝕮𝕿𝕴𝖁𝕬𝕿𝕰𝕯. 𝕯𝖔𝖓'𝖙 𝖈𝖗𝖞 𝖆𝖇𝖔𝖚𝖙 𝖇𝖆𝖓𝖘.",
                off: "⚙️ 𝕬𝖚𝖙𝖔-𝕷𝖎𝖐𝖊 𝕯𝕰𝕬𝕮𝕿𝕴𝖁𝕬𝕿𝕰𝕯. 𝖂𝖊𝖆𝖐𝖓𝖊𝖘𝖘 𝖈𝖔𝖓𝖋𝖎𝖗𝖒𝖊𝖉.",
                invalid: "☘️ 𝖀𝖘𝖊 '𝖔𝖓' 𝖔𝖗 '𝖔𝖋𝖋', 𝖞𝖔𝖚 𝖎𝖉𝖎𝖔𝖙!",
                react: "☣️"
            },
            normal: {
                title: "💠 VEX Feature Toggle 💠",
                on: "✅ Auto-Like feature is now ENABLED.",
                off: "❌ Auto-Like feature is now DISABLED.",
                invalid: "❓ Please specify 'on' or 'off'.",
                react: "💠"
            },
            girl: {
                title: "🫧 𝐿𝓊𝓅𝑒𝓇'𝓈 𝒫𝒾𝓃𝓀 𝒮𝓌𝒾𝓉𝒸𝒽 🫧",
                on: "🫧 𝒶𝓊𝓉𝑜-𝓁𝒾𝓀𝑒 𝒾𝓈 𝑜𝓃! 𝓉𝒾𝓂𝑒 𝓉𝑜 𝓈𝓅𝓇𝑒𝒶𝒹 𝓁𝑜𝓋𝑒~ 🫧",
                off: "🫧 𝒶u𝓉𝑜-𝓁𝒾𝓀𝑒 𝒾𝓈 𝑜𝒻𝒻. 𝓃𝑜 𝓂𝑜𝓇𝑒 𝒽𝑒𝒶𝓇𝓉𝓈 𝒻𝑜𝓇 𝓃𝑜𝓌. 🫧",
                invalid: "🫧 𝓅𝓁𝑒𝒶𝓈𝑒 𝓈𝒶𝓎 '𝑜𝓃' 𝑜𝓇 '𝑜𝒻𝒻', 𝓅𝓇𝒾𝓃𝒸𝑒𝓈𝓈! 🫧",
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
                .update({ is_active: newState, last_modified: new Date() })
                .eq("config_key", "status_autolike_feature");

            if (error) throw error;

            // 4. TRANSLATE AND REPLY
            const responseText = `*${current.title}*\n\n${newState ? current.on : current.off}`;
            const { text: translatedMsg } = await translate(responseText, { to: lang });

            await m.reply(translatedMsg);

        } catch (error) {
            console.error("TOGGLE ERROR:", error);
            await m.reply("☣️ Database Sync Failed. Feature state unchanged.");
        }
    }
};
