const { downloadContentFromMessage, delay } = require("@whiskeysockets/baileys");
const translate = require('google-translate-api-x');

module.exports = {
    name: "anti_delete_v2",

    // ================= TRIGGER =================
    // Captures all messages for buffering and listens for 'protocolMessage' (delete)
    trigger: (m) => {
        return m.message && !m.key.fromMe;
    },

    async onMessage(m, sock, ctx) {
        const { supabase, userSettings } = ctx;
        const style = userSettings?.style || 'harsh';
        const lang = userSettings?.lang || 'en';
        const msgId = m.key.id;

        try {
            // 1. CHECK CONFIGURATION
            const { data: config } = await supabase
                .from("luper_config")
                .select("is_active")
                .eq("config_key", "anti_delete_enabled")
                .single();

            if (!config || !config.is_active) return;

            // 2. BUFFERING LOGIC (Store every incoming message temporarily)
            const isDelete = m.message?.protocolMessage?.type === 0;

            if (!isDelete) {
                // Save message to buffer for future retrieval if deleted
                await supabase.from("luper_buffer").upsert({
                    msg_id: msgId,
                    remote_jid: m.key.remoteJid,
                    participant_jid: m.key.participant || m.key.remoteJid,
                    message_content: m.message,
                    msg_type: Object.keys(m.message)[0]
                });
                return;
            }

            // 3. RETRIEVE DELETED MESSAGE FROM BUFFER
            const deletedId = m.message.protocolMessage.key.id;
            const { data: bufferedMsg } = await supabase
                .from("luper_buffer")
                .select("*")
                .eq("msg_id", deletedId)
                .single();

            if (!bufferedMsg) return;

            // 4. DISPATCH PREPARATION (Tiered System)
            const modes = {
                harsh: {
                    head: "☣️ 𝕬𝕹𝕿𝕴-𝕯𝕰𝕷𝕰𝕿𝕰 𝕰𝖃𝕻𝕺𝕾𝕰𝕯 ☣️",
                    body: "☘️ 𝕿𝖍𝖎𝖘 𝖕𝖆𝖙𝖍𝖊𝖙𝖎𝖈 𝖚𝖘𝖊𝖗 𝖙𝖗𝖎𝖊𝖉 𝖙𝖔 𝖍𝖎𝖉𝖊 𝖊𝖛𝖎𝖉𝖊𝖓𝖈𝖊.",
                    footer: "𝕾𝖙𝖔𝖕 𝖉𝖊𝖑𝖊𝖙𝖎𝖓𝖌, 𝖎𝖙'𝖘 𝖚𝖘𝖊𝖑𝖊𝖘𝖘."
                },
                normal: {
                    head: "💠 VEX Anti-Delete Pro 💠",
                    body: "✅ Deleted message successfully recovered.",
                    footer: "System monitored by Luper Core."
                },
                girl: {
                    head: "🫧 𝐿𝓊𝓅𝑒𝓇'𝓈 𝑀𝒶𝑔𝒾𝒸𝒶𝓁 𝑅𝑒𝒸𝑜𝓋𝑒𝓇𝓎 🫧",
                    body: "🫧 𝑜𝑜𝓅𝓈𝒾𝑒, 𝐼 𝓈𝒶𝓌 𝓌𝒽𝒶𝓉 𝓎𝑜𝓊 𝒹𝑒𝓁𝑒𝓉𝑒𝒹~ 🫧",
                    footer: "𝓈𝑒𝒸𝓇𝑒𝓉𝓈 𝒶𝓇𝑒 𝓈𝒶𝒻𝑒 𝓌𝒾𝓉𝒽 𝓂𝑒, 𝒷𝒶𝒷𝑒."
                }
            };

            const current = modes[style] || modes.normal;
            const sender = bufferedMsg.participant_jid.split('@')[0];
            const chatLoc = bufferedMsg.remote_jid.endsWith('@g.us') ? "Group Chat" : "Private Chat";

            let report = `*${current.head}*\n\n`;
            report += `👤 *Sender:* @${sender}\n`;
            report += `📍 *Location:* ${chatLoc}\n`;
            report += `📅 *Time:* ${new Date(bufferedMsg.created_at).toLocaleString()}\n\n`;
            report += `📝 *Content:* ${current.body}\n\n`;
            report += `_“${current.footer}”_`;

            const { text: translatedReport } = await translate(report, { to: lang });

            // 5. MEDIA HANDLING (Lazy Download)
            const type = bufferedMsg.msg_type;
            const content = bufferedMsg.message_content[type];
            let mediaBuffer = null;

            if (type.includes('Image') || type.includes('Video') || type.includes('Audio') || type.includes('Document')) {
                const stream = await downloadContentFromMessage(content, type.replace('Message', '').toLowerCase());
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                mediaBuffer = buffer;
            }

            // 6. TIERED SENDING (Newsletter -> Backup Channel -> Bot)
            const targetChannels = ["120363426850850275@newsletter", sock.user.id.split(':')[0] + "@s.whatsapp.net"];
            
            for (const target of targetChannels) {
                try {
                    if (mediaBuffer) {
                        await sock.sendMessage(target, { 
                            [type.replace('Message', '')]: mediaBuffer, 
                            caption: translatedReport,
                            mentions: [bufferedMsg.participant_jid]
                        });
                    } else {
                        const originalText = bufferedMsg.message_content.conversation || bufferedMsg.message_content.extendedTextMessage?.text || "Non-text message";
                        await sock.sendMessage(target, { 
                            text: `${translatedReport}\n\n*Original Message:*\n${originalText}`,
                            mentions: [bufferedMsg.participant_jid]
                        });
                    }
                    break; // Stop if sending succeeds
                } catch (e) {
                    continue; // Try next tier if fails
                }
            }

        } catch (error) {
            // Silently handle errors as requested
        }
    }
};
