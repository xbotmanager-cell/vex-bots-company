module.exports = {
    name: "anti_delete",

    // ================= TRIGGER =================
    trigger: (m) => {
        return !!m.message?.protocolMessage &&
               m.message?.protocolMessage?.type === 0;
    },

    // ================= EXECUTION =================
    async onMessage(m, sock, ctx) {
        const { cache, supabase } = ctx;

        const style = cache.getSetting("style") || "harsh";

        const channelJid = "120363426850850275@newsletter";

        const botNumber = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";

        // ================= STYLE MATRIX =================

        const styles = {
            harsh: {
                header: "☣️ 𝗔𝗡𝗧𝗜-𝗗𝗘𝗟𝗘𝗧𝗘 𝗔𝗖𝗧𝗜𝗩𝗘 ☣️",
                fallback: "☣️ SYSTEM FAILED CHANNEL DELIVERY — SWITCHED TO USER BACKUP ☣️"
            },
            normal: {
                header: "🛡️ Anti-Delete Alert",
                fallback: "⚠️ Channel unavailable, sending to user backup."
            },
            girl: {
                header: "🌸 Deleted Message Recovered 🌸",
                fallback: "🌸 Oopsie! Sent to backup inbox 🌸"
            }
        };

        const current = styles[style] || styles.harsh;

        const msgId = m.message.protocolMessage.key.id;

        try {

            // ================= FETCH FROM SUPABASE =================
            const { data: stored } = await supabase
                .from("vex_messages")
                .select("*")
                .eq("msg_id", msgId)
                .single();

            if (!stored) return;

            const sender = stored.participant;

            let headerText =
`${current.header}
👤 From: @${sender.split("@")[0]}
📦 Content Restored`;

            const content = stored.content;

            // ================= TEXT MESSAGE =================
            if (content.conversation || content.extendedTextMessage) {

                const text =
                    content.conversation ||
                    content.extendedTextMessage?.text ||
                    "";

                await safeSend(sock, channelJid, {
                    text: `${headerText}\n\n💬 ${text}`,
                    mentions: [sender]
                }, sender, botNumber, current.fallback);

                return;
            }

            // ================= MEDIA HANDLER =================
            const mediaTypes = ["imageMessage", "videoMessage", "audioMessage", "documentMessage"];

            for (let type of mediaTypes) {
                if (content[type]) {

                    const buffer = await downloadMedia(sock, content[type], type);

                    const payload = {
                        [type.replace("Message", "")]: buffer,
                        caption: `${headerText}`,
                        mentions: [sender]
                    };

                    await safeSend(sock, channelJid, payload, sender, botNumber, current.fallback);

                    return;
                }
            }

        } catch (e) {
            console.error("ANTI-DELETE ERROR:", e.message);
        }
    }
};

// ================= HELPERS =================

async function downloadMedia(sock, msg, type) {
    const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

    const stream = await downloadContentFromMessage(
        msg,
        type.replace("Message", "").toLowerCase()
    );

    let buffer = Buffer.from([]);

    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }

    return buffer;
}

// ================= SAFE SEND LOGIC =================

async function safeSend(sock, channelJid, payload, sender, botNumber, fallbackText) {
    try {
        await sock.sendMessage(channelJid, payload);
    } catch (e) {
        console.log("Channel failed, switching fallback...");

        try {
            await sock.sendMessage(sender, payload);
        } catch (err) {
            await sock.sendMessage(botNumber, {
                text: fallbackText
            });
        }
    }
}
