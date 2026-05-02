const translate = require('google-translate-api-x');

module.exports = {
    command: "antidelete",
    alias: ["ad", "antidel", "lupershield"],
    category: "admin",
    description: "Control the Ultra V3 Anti-Delete Master Switch",

    async execute(m, sock, ctx) {
        const { args, supabase, userSettings, chat } = ctx;
        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";
        const action = args[0]?.toLowerCase();

        const modes = {
            harsh: {
                title: "☣️ 𝕷𝖀𝕻𝕰𝕽 𝖀𝕷𝕿𝕽𝕬 𝖁3 𝕾𝕳𝕴𝕰𝕷𝕯 ☣️",
                on: "🛡️ 𝕸𝖆𝖘𝖙𝖊𝖗 𝕾𝖜𝖎𝖙𝖈𝖍 𝕬𝕮𝕿𝕴𝖁𝕬𝕿𝕰𝕯. 𝕹𝖔𝖙𝖍𝖎𝖓𝖌 𝖉𝖎𝖊𝖘 𝖜𝖎𝖙𝖍𝖔𝖚𝖙 𝖒𝖞 𝖕𝖊𝖗𝖒𝖎𝖘𝖘𝖎𝖔𝖓. 💀",
                off: "🛡️ 𝕸𝖆𝖘𝖙𝖊𝖗 𝕾𝖜𝖎𝖙𝖈𝖍 𝕯𝕰𝕬𝕮𝕿𝕴𝖁𝕬𝕿𝕰𝕯. 𝕿𝖍𝖊 𝖇𝖚𝖋𝖋𝖊𝖗 𝖎𝖘 𝖈𝖑𝖔𝖘𝖊𝖉. 🌑",
                purge: "🧹 𝕭𝖚𝖋𝖋𝖊𝖗 𝕻𝖚𝖗𝖌𝖊𝖉! 𝕬𝖑𝖑 𝖊𝖛𝖎𝖉𝖊𝖓𝖈𝖊 𝖎𝖘 𝖌𝖔𝖓𝖊. 🔥",
                already: "⚠️ 𝕾𝖄𝕾𝕿𝕰𝕸 𝕴𝕾 𝕬𝕷𝕽𝕰𝕬𝕯𝖄 𝕴𝕹 𝕿𝕳𝕴𝕾 𝕾𝕿𝕬𝕿𝕰.",
                invalid: "☘️ 𝖀𝖘𝖊 '𝖔𝖓', '𝖔𝖋𝖋', 𝖔𝖗 '𝖕𝖚𝖗𝖌𝖊'!",
                react: "🛡️"
            },
            normal: {
                title: "💠 Luper-MD Anti-Delete 💠",
                on: "✅ Ultra V3 Observer is now ONLINE.",
                off: "❌ Ultra V3 Observer is now OFFLINE.",
                purge: "🧹 Cleaned all buffered messages successfully.",
                already: "🛡️ System status is already set to this.",
                invalid: "❓ Try: .ad on | .ad off | .ad purge",
                react: "⚙️"
            },
            girl: {
                title: "🫧 𝐿𝓊𝓅𝑒𝓇'𝓈 𝐿𝑜𝓋𝑒 𝐿𝑜𝑔 🫧",
                on: "🫧 𝒰𝓁𝓉𝓇𝒶 𝒱𝟥 𝒾𝓈 𝒶𝓌𝒶𝓀𝑒! 𝐼'𝓁𝓁 𝓈𝒶𝓋𝑒 𝑒𝓋𝑒𝓇𝓎𝓉𝒽𝒾𝓃𝑔~ 🫧",
                off: "🫧 𝒰𝓁𝓉𝓇𝒶 𝒱𝟥 𝒾𝓈 𝓈𝓁𝑒𝑒𝓅𝒾𝓃𝑔. 𝐼 𝓌𝑜𝓃'𝓉 𝓁𝑜𝑜𝓀. 🫧",
                purge: "🎀 𝒯𝒽𝑒 𝓁𝑜𝓋𝑒 𝒷𝓊𝒻𝒻𝑒𝓇 𝒾𝓈 𝒸𝓁𝑒𝒶𝓃 𝓃𝑜𝓌! 🎀",
                already: "🌸 It's already done, silly! 🌸",
                invalid: "🫧 𝑜𝓃, 𝑜𝒻𝒻, 𝑜𝓇 𝓅𝓊𝓇𝑔𝑒? 🫧",
                react: "✨"
            }
        };

        const current = modes[style] || modes.normal;

        // 1. PURGE FEATURE (NEW)
        if (action === 'purge') {
            await sock.sendMessage(m.chat, { react: { text: "🧹", key: m.key } });
            await supabase.from("luper_buffer").delete().neq("msg_id", "0"); // Futa zote
            return await sock.sendMessage(m.chat, { text: current.purge }, { quoted: m });
        }

        if (!action || (action !== 'on' && action !== 'off')) {
            return await sock.sendMessage(m.chat, { text: current.invalid }, { quoted: m });
        }

        const isActivating = (action === 'on');

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 2. SYNC WITH OBSERVER (luper_config table)
            const { data: configData } = await supabase
                .from("luper_config")
                .select("is_active")
                .eq("config_key", "anti_delete_enabled")
                .single();

            const isCurrentlyOn = configData?.is_active === true;

            if (isActivating === isCurrentlyOn) {
                return await sock.sendMessage(m.chat, { text: current.already }, { quoted: m });
            }

            // 3. EXECUTE THE MASTER SWITCH
            const { error } = await supabase
                .from("luper_config")
                .upsert({ 
                    config_key: "anti_delete_enabled", 
                    is_active: isActivating,
                    updated_at: new Date()
                }, { onConflict: 'config_key' });

            if (error) throw error;

            // 4. RESPONSE DESIGN
            const responseBody = isActivating ? current.on : current.off;
            let finalMsg = `*${current.title}*\n\n${responseBody}\n\n` + 
                           `*Status:* ${isActivating ? "RUNNING" : "STOPPED"}\n` +
                           `*Engine:* Ultra V3 (Brute Force Mode)`;

            if (lang !== "en") {
                const { text } = await translate(finalMsg, { to: lang });
                finalMsg = text;
            }

            await sock.sendMessage(m.chat, { text: finalMsg }, { quoted: m });

        } catch (err) {
            console.error("ANTI-DELETE ERROR:", err);
            await sock.sendMessage(m.chat, { text: "☣️ 𝕮𝖔𝖓𝖋𝖎𝖌 𝕾𝖞𝖓𝖈 𝕰𝖗𝖗𝖔𝖗. Check your Supabase tables." });
        }
    }
};
