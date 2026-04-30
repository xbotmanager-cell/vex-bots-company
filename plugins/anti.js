const { downloadContentFromMessage, getContentType } = require('@whiskeysockets/baileys');

module.exports = {
    name: "VEX_Observer",
    async onMessage(m, sock, { userSettings, supabase }) {
        const style = userSettings?.style?.value || 'harsh';
        const channelJid = "120363426850850275@newsletter";
        const botNumber = sock.user.id.split(':')[0] + "@s.whatsapp.net";

        const modes = {
            harsh: {
                title: "☘️ 𝖁𝕰𝖃 𝕯𝕰𝕿𝕰𝕮𝕿𝕴𝖁𝕰 ☘️",
                deleted: "☘️ 𝕬𝖓 𝖎𝖉𝖎𝖔𝖙 𝖙𝖗𝖎𝖊𝖉 𝖙𝖔 𝖉𝖊𝖑𝖊𝖙𝖊 𝖙𝖍𝖎𝖘. 𝕰𝖛𝖎𝖉𝖊𝖓𝖈𝖊 𝖘𝖊𝖈𝖚𝖗𝖊𝖉. ☘️",
                edited: "☘️ 𝕿𝖍𝖎𝖘 𝖋𝖔𝖔𝖑 𝖊𝖉𝖎𝖙𝖊𝖉 𝖙𝖍𝖊𝖎𝖗 𝖑𝖎𝖊𝖘. 𝕳𝖊𝖗𝖊 𝖎𝖘 𝖙𝖍𝖊 𝖔𝖗𝖎𝖌𝖎𝖓𝖆𝖑. ☘️",
                viewOnce: "☘️ 𝖁𝖎𝖊𝖜 𝕺𝖓𝖈𝖊 𝖇𝖞𝖕𝖆𝖘𝖘𝖊𝖉. 𝕹𝖔 𝖘𝖊𝖈𝖗𝖊𝖙𝖘 𝖋𝖔𝖗 𝕸𝖆𝖘𝖙𝖊𝖗 𝕷𝖚𝖕𝖎𝖓. ☘️",
                status: "☘️ 𝕾𝖙𝖆𝖙𝖚𝖘 𝖉𝖊𝖑𝖊𝖙𝖊𝖉! 𝕴 𝖈𝖆𝖚𝖌𝖍𝖙 𝖎𝖙. ☘️"
            },
            girl: {
                title: "🌸 𝐿𝓊𝓅𝒾𝓃's 𝒢𝓊𝒶𝓇𝒹𝒾𝒶𝓃 🌸",
                deleted: "🌸 𝐵𝒶𝒿𝑒, 𝓉𝒽𝑒𝓎 𝓉𝓇𝒾𝑒𝒹 𝓉𝑜 𝒽𝒾𝒹𝑒 𝓉𝒽𝒾𝓈! 𝐼 𝓈𝒶𝓋𝑒𝒹 𝒾𝓉. 🌸",
                edited: "🌸 𝒯𝒽𝑒𝓎 𝒸𝒽𝒶𝓃𝑔𝑒𝒹 𝓉𝒽𝑒𝒾𝓇 𝓂𝒾𝓃𝒹! 𝐻𝑒𝓇𝑒 𝒾𝓈 𝓉𝒽𝑒 𝒻𝒾𝓇𝓈𝓉 𝓉𝒽𝒾𝓃𝑔 𝓉𝒽𝑒𝓎 𝓈𝒶𝒾𝒹. 🌸",
                viewOnce: "🌸 𝐼 𝓊𝓃𝓁𝑜𝒸𝓀𝑒𝒹 𝓉𝒽𝒾𝓈 𝓈𝑒𝒸𝓇𝑒𝓉 𝓅𝒽𝑜𝓉𝑜 𝒿𝓊𝓈𝓉 𝒻𝑜𝓎 𝓎𝑜𝓊! 🌸",
                status: "🌸 𝒪𝑜𝓅𝓈! 𝒯𝒽𝑒𝓎 𝒹𝑒𝓁𝑒𝓉𝑒𝒹 𝓉𝒽𝑒𝒾𝓇 𝓈𝓉𝒶𝓉𝓊𝓈, 𝒷𝓊𝓉 𝐼 𝑔𝑜𝓉 𝒾𝓉. 🌸"
            }
        };

        const current = modes[style] || modes.harsh;

        // HELPER: Media Downloader
        const getMedia = async (msg) => {
            const type = Object.keys(msg)[0];
            const stream = await downloadContentFromMessage(msg[type], type.replace('Message', '').toLowerCase());
            let buffer = Buffer.from([]);
            for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
            return { buffer, type: type.replace('Message', '') };
        };

        // --- 1. SETTINGS FETCH (Balloon & Badwords) ---
        const { data: vexSettings } = await supabase.from('vex_settings').select('*');
        const balloonMode = vexSettings?.find(s => s.setting_name === 'balloon_mode')?.value || false;
        const antiBadWords = vexSettings?.find(s => s.setting_name === 'anti_badwords');

        // --- 2. ANTI-BAD WORDS LOGIC ---
        if (antiBadWords?.value) {
            const body = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
            const wordsList = antiBadWords.extra_data?.words?.split(',') || [];
            if (wordsList.some(w => body.toLowerCase().includes(w.trim().toLowerCase()))) {
                await sock.sendMessage(m.chat, { delete: m.key });
                if (balloonMode) await sock.sendMessage(m.chat, { text: "🎈 *Balloon Defense:* Bad word detected and removed!" });
                return; // Stop further processing
            }
        }

        // --- 3. MONITOR VIEW ONCE ---
        const isViewOnce = m.message?.viewOnceMessageV2 || m.message?.viewOnceMessageV2Extension;
        if (isViewOnce) {
            try {
                const { buffer, type } = await getMedia(isViewOnce.message);
                await sock.sendMessage(channelJid, { 
                    [type.toLowerCase()]: buffer, 
                    caption: `*${current.title}*\n*From:* @${m.sender.split('@')[0]}\n\n${current.viewOnce}`, 
                    mentions: [m.sender] 
                });
            } catch (e) { console.error("ViewOnce Error", e); }
        }

        // --- 4. MONITOR DELETED (Using Supabase Store) ---
        if (m.message?.protocolMessage?.type === 0) {
            const targetId = m.message.protocolMessage.key.id;
            const { data: deletedMsg } = await supabase.from('vex_messages').select('content, participant').eq('msg_id', targetId).single();

            if (deletedMsg) {
                try {
                    const contentType = getContentType(deletedMsg.content);
                    let logHeader = `*${current.title}*\n*From:* @${deletedMsg.participant.split('@')[0]}\n\n${current.deleted}`;
                    
                    if (contentType === 'conversation' || contentType === 'extendedTextMessage') {
                        const text = deletedMsg.content.conversation || deletedMsg.content.extendedTextMessage.text;
                        await sock.sendMessage(channelJid, { text: `${logHeader}\n\n*Content:* ${text}`, mentions: [deletedMsg.participant] });
                    } else {
                        const { buffer, type } = await getMedia(deletedMsg.content);
                        await sock.sendMessage(channelJid, { 
                            [type.toLowerCase()]: buffer, 
                            caption: logHeader, 
                            mentions: [deletedMsg.participant],
                            mimetype: deletedMsg.content[Object.keys(deletedMsg.content)[0]].mimetype
                        });
                    }
                } catch (e) { console.log("Anti-Delete Error", e); }
            }
        }

        // --- 5. MONITOR EDITS (Using Supabase Store) ---
        if (m.message?.protocolMessage?.type === 14) {
            const targetId = m.message.protocolMessage.key.id;
            const { data: originalMsg } = await supabase.from('vex_messages').select('content').eq('msg_id', targetId).single();

            if (originalMsg) {
                const oldText = originalMsg.content.conversation || originalMsg.content.extendedTextMessage?.text || "Media/Other";
                await sock.sendMessage(channelJid, { 
                    text: `*${current.title}*\n*User:* @${m.sender.split('@')[0]}\n\n${current.edited}\n\n*Original:* ${oldText}`, 
                    mentions: [m.sender] 
                });
            }
        }
    }
};
