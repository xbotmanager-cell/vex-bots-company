const translate = require("google-translate-api-x");

module.exports = {
    command: "style",
    alias: ["theme", "mode", "setstyle"],
    category: "settings",
    description: "Change bot UI style live without restart",

    async execute(m, sock, ctx) {

        const { args, supabase, userSettings, prefix } = ctx;

        const input = args[0]?.toLowerCase();

        const styles = ["harsh", "normal", "girl"];

        const currentStyle = userSettings?.style || "normal";

        const ui = {
            harsh: {
                title: "☣️ 𝕾𝕿𝖄𝕷𝕰 𝕮𝕺𝕹𝕿𝕽𝕺𝕷 ☣️",
                react: "⚡",
                ok: (s) => `☣️ STYLE FORCED TO: ${s.toUpperCase()}`
            },
            normal: {
                title: "🎛️ Style Manager",
                react: "🎚️",
                ok: (s) => `✅ Style changed to ${s}`
            },
            girl: {
                title: "🫧 𝒮𝓉𝓎𝓁𝑒 𝒢𝒾𝓇𝓁 𝒞𝑜𝓃𝓉𝓇𝑜𝓁 🫧",
                react: "🎀",
                ok: (s) => `🫧 yay! style now is ${s} 💕`
            }
        };

        const theme = ui[currentStyle] || ui.normal;

        if (!input || !styles.includes(input)) {
            return m.reply(
                `❌ Invalid style\n\nAvailable:\n- harsh\n- normal\n- girl\n\nExample:\n${prefix}style harsh`
            );
        }

        try {

            // 🔥 REACTION
            await sock.sendMessage(m.chat, {
                react: { text: theme.react, key: m.key }
            });

            // 💾 SAVE TO SUPABASE (LIVE UPDATE)
            await supabase
                .from("vex_settings")
                .upsert({
                    setting_name: "style",
                    extra_data: {
                        current: input
                    }
                }, { onConflict: "setting_name" });

            let msg = `${theme.title}\n\n${theme.ok(input)}`;

            // 🌍 TRANSLATE IF NEEDED
            try {
                const { text } = await translate(msg, { to: userSettings?.lang || "en" });
                msg = text;
            } catch {}

            await m.reply(msg);

        } catch (e) {
            console.error("STYLE ERROR:", e);
            await m.reply("⚠️ Failed to update style.");
        }
    }
};
