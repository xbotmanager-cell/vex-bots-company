const translate = require('google-translate-api-x');

module.exports = {
    command: "setprefix",
    alias: ["prefix", "changeprefix"],
    category: "admin",
    description: "Badilisha alama ya kuanzia commands (Prefix)",

    async execute(m, sock, { args, supabase, userSettings }) {
        // 1. EXTRACT PREFERENCES
        const style = userSettings?.style || 'harsh';
        const lang = userSettings?.lang || 'en';
        const newPrefix = args[0];

        const modes = {
            harsh: {
                title: "☣️ 𝕾𝖄𝕾𝕿𝕰𝕸 𝕮𝕺𝕹𝕿𝕽𝕺𝕷 ☣️",
                success: `⚙️ 𝕻𝖗𝖊𝖋𝖎e𝖝 𝖀𝖕𝖉𝖆𝖙𝖊𝖉 𝖙𝖔: [ ${newPrefix} ]. 𝕯𝖔𝖓'𝖙 𝖋𝖔𝖗𝖌𝖊𝖙 𝖎𝖙, 𝖑𝖔𝖘𝖊𝖗.`,
                invalid: "☘️ 𝕻𝖑𝖊𝖆𝖘𝖊 𝖕𝖗𝖔𝖛𝖎𝖉𝖊 𝖆 𝖓𝖊𝖜 𝖕𝖗𝖊𝖋𝖎𝖝!",
                react: "☣️"
            },
            normal: {
                title: "💠 VEX Prefix System 💠",
                success: `✅ Bot prefix has been changed to: ${newPrefix}`,
                invalid: "❓ Please type the new prefix after the command.",
                react: "💠"
            },
            girl: {
                title: "🫧 𝐿𝓊𝓅𝑒𝓇'𝓈 𝒫𝒾𝓃𝓀 𝒮𝓌𝒾𝓉𝒸𝒽 🫧",
                success: `🫧 𝓃𝑒𝓌 𝓅𝓇𝑒𝓋𝒾𝓍 𝒾𝓈 [ ${newPrefix} ]! 𝓈𝑜 𝒸𝓊𝓉𝑒~ 🫧`,
                invalid: "🫧 𝓅𝓁𝑒𝒶𝓈𝑒 𝓉𝑒𝓁𝓁 𝓂𝑒 𝓉𝒽𝑒 𝓃𝑒𝓌 𝓅𝓇𝑒𝒻𝒾formatting𝓍, 𝓅𝓇𝒾𝓃𝒸𝑒𝓈𝓈! 🫧",
                react: "🫧"
            }
        };

        const current = modes[style] || modes.normal;

        // 2. VALIDATE INPUT
        if (!newPrefix) {
            return m.reply(current.invalid);
        }

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 3. UPDATE VEX_SETTINGS TABLE (SQL)
            // Tunabadilisha 'current' ndani ya JSON ya extra_data
            const { error } = await supabase
                .from("vex_settings")
                .update({ 
                    extra_data: { current: newPrefix },
                    created_at: new Date() 
                })
                .eq("setting_name", "prefix");

            if (error) throw error;

            // 4. TRANSLATE AND REPLY
            const responseText = `*${current.title}*\n\n${current.success}`;
            const { text: translatedMsg } = await translate(responseText, { to: lang });

            await m.reply(translatedMsg);

        } catch (error) {
            console.error("PREFIX UPDATE ERROR:", error);
            await m.reply("☣️ Database Sync Failed. Prefix remained unchanged.");
        }
    }
};
