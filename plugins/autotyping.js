const translate = require('google-translate-api-x');

module.exports = {
    command: "autotyping",
    alias: ["atyping", "settyping", "atp"],
    category: "settings",
    description: "Control the Auto-Typing presence and duration",

    async execute(m, sock, ctx) {
        const { args, supabase, userSettings } = ctx;
        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";
        
        const action = args[0]?.toLowerCase(); // on, off, au namba (sekunde)

        const modes = {
            harsh: {
                title: "⚡ 𝕬𝖀𝕿𝕺-𝕿𝖄𝕻𝕴𝕹𝕲 𝕰𝕹𝕲𝕴𝕹𝕰 ⚡",
                on: "👤 𝕲𝖍𝖔𝖘𝖙 𝕿𝖞𝖕𝖎𝖓𝖌 𝕬𝕮𝕿𝕴𝖁𝕬𝕿𝕰𝕯. 𝕿𝖍𝖊𝖞 𝖙𝖍𝖎𝖓𝖐 𝕴'𝖒 𝖍𝖚𝖒𝖆𝖓. 😈",
                off: "👤 𝕲𝖍𝖔𝖘𝖙 𝕿𝖞𝖕𝖎𝖓𝖌 𝕯𝕰𝕬𝕮𝕿𝕴𝖁𝕬𝕿𝕰𝕯. 𝕴𝖓𝖘𝖙𝖆𝖓𝖙 𝖗𝖊𝖕𝖑𝖞 𝖒𝖔𝖉𝖊. 🤖",
                set: (sec) => `⏳ 𝕯𝖊𝖑𝖆𝖞 𝖘𝖊𝖙 𝖙𝖔 ${sec} 𝖘𝖊𝖈𝖔𝖓𝖉𝖘. 𝕻𝖆𝖙𝖎𝖊𝖓𝖈𝖊 𝖎𝖘 𝖐𝖊𝖞.`,
                invalid: "❌ 𝖀𝖘𝖊: .𝖆𝖙𝖞𝖕𝖎𝖓𝖌 [𝖔𝖓/𝖔𝖋𝖋/𝖓𝖚𝖒𝖇𝖊𝖗]",
                react: "⚡"
            },
            normal: {
                title: "⌨️ Luper-MD Typing Hub ⌨️",
                on: "✅ Auto-Typing is now enabled.",
                off: "❌ Auto-Typing is now disabled.",
                set: (sec) => `⚙️ Typing duration updated to ${sec}s.`,
                invalid: "❓ Try: .atp on, .atp off, or .atp 5",
                react: "⌨️"
            },
            girl: {
                title: "🫧 𝐿𝓊𝓅𝑒𝓇'𝓈 𝒯𝓎𝓅𝒾𝓃𝑔 𝐹𝒶𝒾𝓇𝓎 🫧",
                on: "🫧 𝐼'𝓂 𝓅𝓇𝑒𝓉𝑒𝓃𝒹𝒾𝓃𝑔 𝓉𝑜 𝓉𝓎𝓅𝑒 𝓃𝑜𝓌~ ✨",
                off: "🫧 𝒩𝑜 𝓂𝑜𝓇𝑒 𝓉𝓎𝓅𝒾𝓃𝑔, 𝒿𝓊𝓈𝓉 𝒷𝑒𝑒𝓅 𝒷𝑜𝑜𝓅! 🎀",
                set: (sec) => `🌸 𝐼'𝓁𝓁 𝓉𝓎𝓅𝑒 𝒻𝑜𝓇 ${sec} 𝓈𝑒𝒸𝑜𝓃𝒹𝓈 𝒻𝑜𝓇 𝓎𝑜𝓊! 🎀`,
                invalid: "🫧 𝓅𝓁𝑒𝒶𝓈𝑒 𝓊𝓈𝑒 𝑜𝓃, 𝑜𝒻𝒻, 𝑜𝓇 𝒶 𝓃𝓊𝓂𝒷𝑒𝓇! 🫧",
                react: "✍️"
            }
        };

        const current = modes[style] || modes.normal;

        if (!action) {
            return await sock.sendMessage(m.chat, { text: current.invalid }, { quoted: m });
        }

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            let finalBody = "";

            // 1. KAMA NI NAMBA (Set Duration)
            if (!isNaN(action)) {
                const sec = Math.max(1, Math.min(20, parseInt(action))); // Limit 1-20 sec
                await supabase
                    .from("luper_config")
                    .upsert({ config_key: "auto_typing_duration", value: sec.toString() }, { onConflict: 'config_key' });
                
                finalBody = current.set(sec);
            } 
            // 2. KAMA NI ON/OFF
            else if (action === 'on' || action === 'off') {
                const isActivating = action === 'on';
                await supabase
                    .from("luper_config")
                    .upsert({ config_key: "auto_typing_enabled", is_active: isActivating }, { onConflict: 'config_key' });
                
                finalBody = isActivating ? current.on : current.off;
            } 
            else {
                return await sock.sendMessage(m.chat, { text: current.invalid }, { quoted: m });
            }

            // 3. RESPONSE & TRANSLATION
            let finalMsg = `*${current.title}*\n\n${finalBody}`;

            if (lang !== "en") {
                const { text } = await translate(finalMsg, { to: lang });
                finalMsg = text;
            }

            await sock.sendMessage(m.chat, { text: finalMsg }, { quoted: m });

        } catch (err) {
            console.error("AUTO-TYPING COMMAND ERROR:", err);
            await sock.sendMessage(m.chat, { text: "⚠️ 𝕯𝖆𝖙𝖆𝖇𝖆𝖘𝖊 𝕰𝖗𝖗𝖔𝖗. Try again later." });
        }
    }
};
