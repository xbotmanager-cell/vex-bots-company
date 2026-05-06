const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const translate = require("google-translate-api-x");

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
            let config = memoryCache.get("anti_delete_enabled");

            if (!config) {
                const { data } = await supabase
                    .from("luper_config")
                    .select("is_active")
                    .eq("config_key", "anti_delete_enabled")
                    .single();

                config = data?.is_active;
                memoryCache.set("anti_delete_enabled", config);
                setTimeout(() => memoryCache.delete("anti_delete_enabled"), 30000);
            }

            if (!config) return;

            const isDelete = m.message?.protocolMessage?.type === 0;

            // ================= STORE =================
            if (!isDelete) {
                memoryCache.set(msgId, {
                    content: m.message,
                    jid: m.key.remoteJid,
                    sender: m.key.participant || m.key.remoteJid,
                    type: Object.keys(m.message)[0],
                    time: Date.now()
                });

                supabase.from("luper_buffer").upsert({
                    msg_id: msgId,
                    remote_jid: m.key.remoteJid,
                    participant_jid: m.key.participant || m.key.remoteJid,
                    message_content: m.message,
                    msg_type: Object.keys(m.message)[0]
                }).catch(() => {});

                return;
            }

            // ================= DELETE =================
            const deletedId = m.message.protocolMessage.key.id;

            if (processedDeletes.has(deletedId)) return;
            processedDeletes.add(deletedId);

            let bufferedMsg = memoryCache.get(deletedId);

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

            // ================= BOT NUMBER FIX =================
            const botJid = sock.user.id.replace(/:.+/, "") + "@s.whatsapp.net";

            // ================= TYPE DETECTION =================
            const type = bufferedMsg.type.toLowerCase();
            const msg = bufferedMsg.content[bufferedMsg.type];

            let payload = {
                caption: translated,
                mentions: [bufferedMsg.sender]
            };

            let mediaType = null;

            if (type.includes("image")) mediaType = "image";
            else if (type.includes("video")) mediaType = "video";
            else if (type.includes("audio")) mediaType = "audio";
            else if (type.includes("sticker")) mediaType = "sticker";
            else if (type.includes("document")) mediaType = "document";

            // ================= MEDIA DOWNLOAD =================
            let buffer = null;

            if (mediaType) {
                try {
                    const stream = await downloadContentFromMessage(msg, mediaType);

                    let buff = Buffer.from([]);
                    for await (const chunk of stream) {
                        buff = Buffer.concat([buff, chunk]);
                    }

                    buffer = buff;
                } catch {}
            }

            // ================= SEND =================
            for (let i = 0; i < 3; i++) {
                try {
                    if (buffer && mediaType) {
                        payload[mediaType] = buffer;

                        // audio fix
                        if (mediaType === "audio") {
                            payload.mimetype = "audio/mp4";
                            payload.ptt = false;
                        }

                        await sock.sendMessage(botJid, payload);
                    } else {
                        const text =
                            bufferedMsg.content.conversation ||
                            bufferedMsg.content.extendedTextMessage?.text ||
                            "Media";

                        await sock.sendMessage(botJid, {
                            text: `${translated}\n\n*Original:* ${text}`,
                            mentions: [bufferedMsg.sender]
                        });
                    }

                    return;
                } catch {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

        } catch (e) {
            console.error("ANTI DELETE ERROR:", e.message);
        }
    }
};
