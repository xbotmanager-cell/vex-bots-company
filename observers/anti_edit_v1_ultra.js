const translate = require("google-translate-api-x");

const memoryCache = new Map();
const processedEdits = new Set();

module.exports = {
    name: "anti_edit_v1_ultra",

    trigger: (m) => {
        return m.message && !m.key.fromMe;
    },

    async onMessage(m, sock, ctx) {
        const { supabase, userSettings } = ctx;
        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const msgId = m.key.id;

        try {
            // ================= CONFIG =================
            let config = memoryCache.get("anti_edit_enabled");

            if (!config) {
                const { data } = await supabase
                    .from("luper_config")
                    .select("is_active")
                    .eq("config_key", "anti_edit_enabled")
                    .single();

                config = data?.is_active;
                memoryCache.set("anti_edit_enabled", config);

                setTimeout(() => memoryCache.delete("anti_edit_enabled"), 30000);
            }

            if (!config) return;

            const isEdit = m.message?.protocolMessage?.type === 14;

            // ================= STORE ORIGINAL =================
            if (!isEdit) {
                memoryCache.set(msgId, {
                    content: m.message,
                    jid: m.key.remoteJid,
                    sender: m.key.participant || m.key.remoteJid,
                    time: Date.now()
                });

                supabase.from("luper_buffer").upsert({
                    msg_id: msgId,
                    remote_jid: m.key.remoteJid,
                    participant_jid: m.key.participant || m.key.remoteJid,
                    message_content: m.message
                }).catch(() => {});

                return;
            }

            // ================= EDIT DETECT =================
            const editedId = m.message.protocolMessage.key.id;

            if (processedEdits.has(editedId)) return;
            processedEdits.add(editedId);

            let original = memoryCache.get(editedId);

            if (!original) {
                const { data } = await supabase
                    .from("luper_buffer")
                    .select("*")
                    .eq("msg_id", editedId)
                    .single();

                if (!data) return;

                original = {
                    content: data.message_content,
                    jid: data.remote_jid,
                    sender: data.participant_jid,
                    time: new Date(data.created_at).getTime()
                };
            }

            // ================= STYLE =================
            const modes = {
                harsh: {
                    head: "☣️ 𝕬𝕹𝕿𝕴-𝕰𝕯𝕴𝕿 𝕰𝖃𝕻𝕺𝕾𝕰𝕯 ☣️",
                    body: "𝖄𝖔𝖚 𝖙𝖗𝖎𝖊𝖉 𝖙𝖔 𝖈𝖍𝖆𝖓𝖌𝖊 𝖎𝖙. 𝕴 𝖘𝖆𝖜 𝖇𝖔𝖙𝖍.",
                    footer: "𝕹𝖔 𝖊𝖘𝖈𝖆𝖕𝖊."
                },
                normal: {
                    head: "💠 Anti Edit Log 💠",
                    body: "Message was edited.",
                    footer: "System secured."
                },
                girl: {
                    head: "🫧 Message Changed 🫧",
                    body: "you edited it~ i noticed 💕",
                    footer: "nothing is hidden 💖"
                }
            };

            const current = modes[style] || modes.normal;

            const sender = original.sender.split("@")[0];
            const location = original.jid.endsWith("@g.us") ? "Group" : "Private";

            let report = `*${current.head}*\n\n`;
            report += `👤 @${sender}\n`;
            report += `📍 ${location}\n`;
            report += `⏱ ${new Date(original.time).toLocaleString()}\n\n`;
            report += `${current.body}\n\n_${current.footer}_\n\n`;

            // ================= EXTRACT TEXT =================
            const oldText =
                original.content.conversation ||
                original.content.extendedTextMessage?.text ||
                "Media";

            const newText =
                m.message.protocolMessage?.editedMessage?.conversation ||
                m.message.protocolMessage?.editedMessage?.extendedTextMessage?.text ||
                "Media";

            report += `📝 *Before:*\n${oldText}\n\n`;
            report += `✏️ *After:*\n${newText}`;

            const { text: translated } = await translate(report, { to: lang });

            // ================= BOT TARGET =================
            const botJid = sock.user.id.replace(/:.+/, "") + "@s.whatsapp.net";

            // ================= SEND =================
            for (let i = 0; i < 3; i++) {
                try {
                    await sock.sendMessage(botJid, {
                        text: translated,
                        mentions: [original.sender]
                    });
                    return;
                } catch {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

        } catch (e) {
            console.error("ANTI EDIT ERROR:", e.message);
        }
    }
};
