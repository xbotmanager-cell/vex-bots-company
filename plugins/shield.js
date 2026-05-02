const translate = require('google-translate-api-x');

module.exports = {
    command: "shield",
    alias: ["anticall", "ad", "ac"],
    category: "admin",
    description: "Master control for Anti-Delete and Anti-Call systems",

    async execute(m, sock, ctx) {
        const { args, supabase, userSettings } = ctx;
        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";
        
        const type = args[0]?.toLowerCase(); // 'delete' au 'call'
        const action = args[1]?.toLowerCase(); // 'on' au 'off' au 'purge'

        const modes = {
            harsh: {
                title: "☣️ 𝕷𝖀𝕻𝕰𝕽 𝖁3 𝕾𝕳𝕴𝕰𝕷𝕯 ☣️",
                on: (sys) => `🛡️ ${sys} 𝕬𝕮𝕿𝕴𝖁𝕬𝕿𝕰𝕯. 𝖂𝖆𝖙𝖈𝖍𝖎𝖓𝖌 𝖊𝖛𝖊𝖗𝖞 𝖒𝖔𝖛𝖊. 💀`,
                off: (sys) => `🛡️ ${sys} 𝕯𝕰𝕬𝕮𝕿𝕴𝖁𝕬𝕿𝕰𝕯. 𝕿𝖍𝖊 𝖌𝖚𝖆𝖗𝖉 𝖎𝖘 𝖆𝖘𝖑𝖊𝖊𝖕. 🌑`,
                purge: "🧹 𝕭𝖚𝖋𝖋𝖊𝖗 𝖜𝖎𝖕𝖊𝖉 𝖈𝖑𝖊𝖆𝖓! 🔥",
                invalid: "☘️ 𝖀𝖘𝖊: .𝖘𝖍𝖎𝖊𝖑𝖉 [𝖉𝖊𝖑𝖊𝖙𝖊/𝖈𝖆𝖑𝖑] [𝖔𝖓/𝖔𝖋𝖋/𝖕𝖚𝖗𝖖𝖊]",
                react: "🛡️"
            },
            normal: {
                title: "💠 Luper-MD System Hub 💠",
                on: (sys) => `✅ ${sys} system is now ENABLED.`,
                off: (sys) => `❌ ${sys} system is now DISABLED.`,
                purge: "🧹 All temporary data cleared.",
                invalid: "❓ Format: .shield [delete/call] [on/off/purge]",
                react: "⚙️"
            },
            girl: {
                title: "🫧 𝐿𝓊𝓅𝑒𝓇'𝓈 𝒢𝓊𝒶𝓇𝒹𝒾𝒶𝓃 🫧",
                on: (sys) => `🫧 ${sys} 𝒾𝓈 𝒶𝓌𝒶𝓀𝑒! 𝒩𝑜 𝓂𝑜𝓇𝑒 𝓈𝓊𝓇𝓅𝓇𝒾𝓈𝑒𝓈~ 🫧`,
                off: (sys) => `🫧 ${sys} 𝒾𝓈 𝓃𝒶𝓅𝓅𝒾𝓃𝑔. 𝐵𝑒 𝒸𝒶𝓇𝑒𝒻𝓊𝓁! 🫧`,
                purge: "🎀 𝒯𝒽𝑒 𝓂𝑒𝓂𝑜𝓇𝓎 𝒾𝓈 𝒸𝓁𝑒𝒶𝓃 𝓃𝑜𝓌, 𝓅𝓇𝒾𝓃𝒸𝑒𝓈𝓈! 🎀",
                invalid: "🫧 𝓅𝓁𝑒𝒶𝓈𝑒 𝓊𝓈𝑒: .𝓈𝖍𝒾𝑒𝓁𝖉 [𝒹𝑒𝓁𝑒𝓉𝑒/𝒸𝒶𝓁𝓁] [𝑜𝓃/𝑜𝒻𝒻] 🫧",
                react: "✨"
            }
        };

        const current = modes[style] || modes.normal;

        // 1. VALIDATION
        if (!type || !['delete', 'call'].includes(type)) {
            return await sock.sendMessage(m.chat, { text: current.invalid }, { quoted: m });
        }

        const configKey = type === 'delete' ? "anti_delete_enabled" : "anti_call_enabled";
        const sysName = type.charAt(0).toUpperCase() + type.slice(1);

        // 2. PURGE FEATURE (Specific to Delete)
        if (action === 'purge' && type === 'delete') {
            await sock.sendMessage(m.chat, { react: { text: "🧹", key: m.key } });
            await supabase.from("luper_buffer").delete().neq("msg_id", "0");
            return await sock.sendMessage(m.chat, { text: current.purge }, { quoted: m });
        }

        if (!action || !['on', 'off'].includes(action)) {
            return await sock.sendMessage(m.chat, { text: current.invalid }, { quoted: m });
        }

        const isActivating = (action === 'on');

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 3. DATABASE UPDATE (luper_config)
            const { error } = await supabase
                .from("luper_config")
                .upsert({ 
                    config_key: configKey, 
                    is_active: isActivating,
                    updated_at: new Date()
                }, { onConflict: 'config_key' });

            if (error) throw error;

            // 4. RESPONSE BUILDING
            const responseText = isActivating ? current.on(sysName) : current.off(sysName);
            let finalMsg = `*${current.title}*\n\n${responseText}\n\n*Target:* ${sysName} Guard\n*Status:* ${isActivating ? "ACTIVE" : "OFFLINE"}`;

            if (lang !== "en") {
                const { text } = await translate(finalMsg, { to: lang });
                finalMsg = text;
            }

            await sock.sendMessage(m.chat, { text: finalMsg }, { quoted: m });

        } catch (err) {
            console.error("SHIELD ERROR:", err);
            await sock.sendMessage(m.chat, { text: "☣️ 𝕾𝖄𝕾𝕿𝕰𝕸 𝕱𝕬𝕴𝕷𝖀𝕽𝕰: Database Unreachable." });
        }
    }
};
