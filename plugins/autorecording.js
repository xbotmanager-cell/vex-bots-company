const translate = require('google-translate-api-x');

module.exports = {
    command: "autorecording",
    alias: ["arec", "setrec", "rec"],
    category: "settings",
    description: "Control the Auto-Recording presence and duration",

    async execute(m, sock, ctx) {
        const { args, supabase, userSettings } = ctx;
        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";
        
        const action = args[0]?.toLowerCase(); // on, off, au namba (sekunde)

        const modes = {
            harsh: {
                title: "🎙️ 𝕷𝖀𝕻𝕰𝕽 𝖁𝕺𝕴𝕮𝕰 𝕾𝕿𝕰𝕬𝕷𝕿𝕳 🎙️",
                on: "🎤 𝕬𝖚𝖉𝖎𝖔 𝕽𝖊𝖈𝖔𝖗𝖉𝖎𝖓𝖌 𝕬𝕮𝕿𝕴𝖁𝕬𝕿𝕰𝕯. 𝕿𝖍𝖊𝖞 𝖜𝖔𝖓'𝖙 𝖘𝖚𝖘𝖕𝖊𝖈𝖙 𝖆 𝖙𝖍𝖎𝖓𝖌. 💀",
                off: "🎤 𝕬𝖚𝖉𝖎𝖔 𝕽𝖊𝖈𝖔𝖗𝖉𝖎𝖓𝖌 𝕯𝕰𝕬𝕮𝕿𝕴𝖁𝕬𝕿𝕰𝕯. 𝕭𝖆𝖈𝖐 𝖙𝖔 𝖘𝖎𝖑𝖊𝖓𝖈𝖊. 🌑",
                set: (sec) => `⏳ 𝖁𝖔𝖎𝖈𝖊 𝖉𝖊𝖑𝖆𝖞 𝖘𝖊𝖙 𝖙𝖔 ${sec} 𝖘𝖊𝖈𝖔𝖓𝖉𝖘. 𝕶𝖊𝖊𝖕 𝖎𝖙 𝖗𝖊𝖆𝖑.`,
                invalid: "❌ 𝖀𝖘𝖊: .𝖆𝖗𝖊𝖈 [𝖔𝖓/𝖔𝖋𝖋/𝖓𝖚𝖒𝖇𝖊𝖗]",
                react: "🎤"
            },
            normal: {
                title: "🎧 Luper-MD Recording Hub 🎧",
                on: "✅ Auto-Recording is now ONLINE.",
                off: "❌ Auto-Recording is now OFFLINE.",
                set: (sec) => `⚙️ Voice recording duration set to ${sec}s.`,
                invalid: "❓ Try: .arec on, .arec off, or .arec 8",
                react: "🎧"
            },
            girl: {
                title: "🫧 𝐿𝓊𝓅𝑒𝓇's 𝒱𝑜𝒾𝒸𝑒 𝑀𝒶𝑔𝒾𝒸 🫧",
                on: "🫧 𝒮𝒽𝒽𝒽~ 𝐼'𝓂 𝓅𝓇𝑒𝓉𝑒𝓃𝒹𝒾𝓃𝑔 𝓉𝑜 𝓈𝒾𝓃𝑔 𝒻𝑜𝓇 𝓉𝒽𝑒𝓂! 🎀",
                off: "🫧 𝒩𝑜 𝓂𝑜𝓇𝑒 𝓇𝑒𝒸𝑜𝓇𝒹𝒾𝓃𝑔, 𝒿𝓊𝓈𝓉 𝓆𝓊𝒾𝑒𝓉 𝓉𝒾𝓂𝑒! ✨",
                set: (sec) => `🌸 𝐼'𝓁𝓁 𝓇𝑒𝒸𝑜𝓇𝒹 𝒻𝑜𝓇 ${sec} 𝓈𝑒𝒸𝑜𝓃𝒹𝓈, 𝑜𝓀𝒶𝓎? 🫧`,
                invalid: "🫧 𝓅𝓁𝑒𝒶𝓈𝑒 𝓊𝓈𝑒 𝑜𝓃, 𝑜𝒻𝒻, 𝑜𝓇 𝒶 𝓃𝓊𝓂𝒷𝑒𝓇! 🫧",
                react: "🎵"
            }
        };

        const current = modes[style] || modes.normal;

        if (!action) {
            return await sock.sendMessage(m.chat, { text: current.invalid }, { quoted: m });
        }

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            let finalBody = "";

            // 1. SET DURATION (Namba)
            if (!isNaN(action)) {
                const sec = Math.max(1, Math.min(30, parseInt(action))); // Limit 1-30 sec kwa recording
                await supabase
                    .from("luper_config")
                    .upsert({ config_key: "auto_recording_duration", value: sec.toString() }, { onConflict: 'config_key' });
                
                finalBody = current.set(sec);
            } 
            // 2. TOGGLE ON/OFF
            else if (action === 'on' || action === 'off') {
                const isActivating = action === 'on';
                
                await supabase
                    .from("luper_config")
                    .upsert({ config_key: "auto_recording_enabled", is_active: isActivating }, { onConflict: 'config_key' });
                
                finalBody = isActivating ? current.on : current.off;
            } 
            else {
                return await sock.sendMessage(m.chat, { text: current.invalid }, { quoted: m });
            }

            // 3. FINAL MESSAGE & TRANSLATION
            let finalMsg = `*${current.title}*\n\n${finalBody}`;

            if (lang !== "en") {
                const { text } = await translate(finalMsg, { to: lang });
                finalMsg = text;
            }

            await sock.sendMessage(m.chat, { text: finalMsg }, { quoted: m });

        } catch (err) {
            console.error("AUTO-RECORDING COMMAND ERROR:", err);
            await sock.sendMessage(m.chat, { text: "⚠️ 𝕯𝖆𝖙𝖆𝖇𝖆𝖘𝖊 𝕰𝖗𝖗𝖔𝖗. Recording sync failed." });
        }
    }
};
