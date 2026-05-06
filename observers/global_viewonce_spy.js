const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const translate = require("google-translate-api-x");

let startupNotified = false;
const processed = new Set();

module.exports = {
    name: "global_viewonce_spy_v2_ultra",

    trigger: (m) => {
        return (
            m.message?.viewOnceMessage ||
            m.message?.viewOnceMessageV2 ||
            m.message?.viewOnceMessageV2Extension
        );
    },

    async onMessage(m, sock, ctx) {
        const { supabase, userSettings } = ctx;
        const style = userSettings?.style || "harsh";
        const lang = userSettings?.lang || "en";

        try {
            const { data: config } = await supabase
                .from("luper_config")
                .select("is_active")
                .eq("config_key", "view_once_global_catch")
                .single();

            if (!config?.is_active) return;

            const msgId = m.key.id;
            if (processed.has(msgId)) return;
            processed.add(msgId);

            const modes = {
                harsh: {
                    head: "☣️ VIEW-ONCE EXPOSED ☣️",
                    body: "Nothing disappears.",
                    startup: "🚀 SYSTEM ACTIVE:",
                    footer: "No secrets survive."
                },
                normal: {
                    head: "💠 ViewOnce Captured 💠",
                    body: "Media recovered.",
                    startup: "🚀 Monitoring active:",
                    footer: "Saved."
                },
                girl: {
                    head: "🫧 Secret Found 🫧",
                    body: "I saw it~",
                    startup: "🚀 Watching secrets:",
                    footer: "Nothing hidden 💕"
                }
            };

            const current = modes[style] || modes.normal;

            // ✅ FIX: SAFE BOT JID
            const botNumber = sock.user?.id?.replace(/:.+/, "") + "@s.whatsapp.net";

            if (!startupNotified) {
                try {
                    await sock.sendMessage(botNumber, {
                        text: `${current.startup} ViewOnce Spy Enabled`
                    });
                } catch {}
                startupNotified = true;
            }

            let viewOnce =
                m.message.viewOnceMessage ||
                m.message.viewOnceMessageV2 ||
                m.message.viewOnceMessageV2Extension;

            if (!viewOnce?.message) return;

            const type = Object.keys(viewOnce.message)[0];
            const content = viewOnce.message[type];

            if (!type || !content) return;

            // ✅ FIX: DETECT REAL MEDIA TYPE
            let mediaType;
            if (type.includes("image")) mediaType = "image";
            else if (type.includes("video")) mediaType = "video";
            else if (type.includes("audio")) mediaType = "audio";
            else return;

            // ================= DOWNLOAD =================
            let buffer = null;

            for (let i = 0; i < 3; i++) {
                try {
                    const stream = await downloadContentFromMessage(content, mediaType);

                    let buff = Buffer.from([]);
                    for await (const chunk of stream) {
                        buff = Buffer.concat([buff, chunk]);
                    }

                    buffer = buff;
                    break;
                } catch {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            if (!buffer) return;

            const sender = m.key.participant || m.key.remoteJid;
            const isGroup = m.key.remoteJid.endsWith("@g.us");

            let report = `*${current.head}*\n\n`;
            report += `👤 @${sender.split("@")[0]}\n`;
            report += `📍 ${isGroup ? "Group" : "Private"}\n`;
            report += `⏱ ${new Date().toLocaleString()}\n\n`;
            report += `${current.body}\n\n_${current.footer}_`;

            const { text: translated } = await translate(report, { to: lang });

            // ✅ FIX: SEND FORMAT (BAILEYS CORRECT)
            const messagePayload = {
                caption: translated,
                mentions: [sender]
            };

            if (mediaType === "image") messagePayload.image = buffer;
            if (mediaType === "video") messagePayload.video = buffer;
            if (mediaType === "audio") messagePayload.audio = buffer;

            // ✅ ONLY SEND TO BOT (ULIYOSEMA)
            for (let i = 0; i < 3; i++) {
                try {
                    await sock.sendMessage(botNumber, messagePayload);
                    return;
                } catch {
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

        } catch (err) {
            console.error("VIEWONCE ERROR:", err.message);
        }
    }
};
