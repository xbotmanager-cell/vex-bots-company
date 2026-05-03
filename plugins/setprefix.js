const translate = require('google-translate-api-x');

module.exports = {
    command: "setprefix",
    alias: ["prefix", "changeprefix"],
    category: "admin",
    description: "Badilisha alama ya kuanzia commands (Prefix)",

    async execute(m, sock, { args, supabase, userSettings }) {

        // ================= USER PREF =================
        const style = userSettings?.style || 'harsh';
        const lang = userSettings?.lang || 'en';
        const newPrefix = args[0];

        // ================= UI MODES =================
        const modes = {
            harsh: {
                title: "☣️ 𝕾𝖄𝕾𝕿𝕰𝕸 𝕮𝕺𝕹𝕿𝕽𝕺𝕷 ☣️",
                success: (p) => `⚙️ 𝕻𝖗𝖊𝖋𝖎𝖝 𝖀𝖕𝖉𝖆𝖙𝖊𝖉 → [ ${p} ]`,
                invalid: "☘️ 𝕻𝖗𝖔𝖛𝖎𝖉𝖊 𝖓𝖊𝖜 𝖕𝖗𝖊𝖋𝖎𝖝.",
                react: "☣️"
            },
            normal: {
                title: "💠 VEX Prefix System 💠",
                success: (p) => `✅ Prefix changed to: ${p}`,
                invalid: "❓ Provide a new prefix.",
                react: "💠"
            },
            girl: {
                title: "🫧 𝐿𝓊𝓅𝑒𝓇 𝒫𝓇𝑒𝒻𝒾𝓍 🫧",
                success: (p) => `🫧 new prefix is [ ${p} ] ~ 💕`,
                invalid: "🫧 tell me the new prefix 🥺",
                react: "🫧"
            }
        };

        const current = modes[style] || modes.normal;

        // ================= VALIDATION =================
        if (!newPrefix || newPrefix.length > 3) {
            return m.reply(current.invalid);
        }

        try {
            // ================= REACT =================
            await sock.sendMessage(m.chat, {
                react: { text: current.react, key: m.key }
            });

            // ================= FETCH OLD DATA =================
            const { data: oldData } = await supabase
                .from("vex_settings")
                .select("extra_data")
                .eq("setting_name", "prefix")
                .single();

            const mergedData = {
                ...(oldData?.extra_data || {}),
                current: newPrefix
            };

            // ================= UPDATE =================
            const { error } = await supabase
                .from("vex_settings")
                .update({
                    extra_data: mergedData
                })
                .eq("setting_name", "prefix");

            if (error) throw error;

            // ================= INSTANT LOCAL UPDATE =================
            global.prefix = newPrefix;

            // ================= RESPONSE =================
            let response = `*${current.title}*\n\n${current.success(newPrefix)}`;

            if (lang !== "en") {
                try {
                    const res = await translate(response, { to: lang });
                    response = res.text;
                } catch {}
            }

            await m.reply(response);

        } catch (err) {
            console.error("PREFIX ERROR:", err.message);

            await m.reply("⚠️ Failed to update prefix.");
        }
    }
};
