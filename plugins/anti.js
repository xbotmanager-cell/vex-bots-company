const { downloadContentFromMessage, getContentType } = require('@whiskeysockets/baileys');
const translate = require('google-translate-api-x');

module.exports = {
    name: "VEX_Observer",
    async onMessage(m, sock, { userSettings }) {
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
                viewOnce: "🌸 𝐼 𝓊𝓃𝓁𝑜𝒸𝓀𝑒𝒹 𝓉𝒽𝒾𝓈 𝓈𝑒𝒸𝓇𝑒𝓉 𝓅𝒽𝑜𝓉𝑜 𝒿𝓊𝓈𝓉 𝒻𝑜𝓇 𝓎𝑜𝓊! 🌸",
                status: "🌸 𝒪𝑜𝓅𝓈! 𝒯𝒽𝑒𝓎 𝒹𝑒𝓁𝑒𝓉𝑒𝒹 𝓉𝒽𝑒𝒾𝓇 𝓈𝓉𝒶𝓉𝓊𝓈, 𝒷𝓊𝓉 𝐼 𝑔𝑜𝓉 𝒾𝓉. 🌸"
            }
        };

        const current = modes[style] || modes.harsh;

        // HELPER: Download & Stream Media for Render Efficiency
        const getMedia = async (msg) => {
            const type = Object.keys(msg)[0];
            const stream = await downloadContentFromMessage(msg[type], type.replace('Message', '').toLowerCase());
            let buffer = Buffer.from([]);
            for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
            return { buffer, type: type.replace('Message', '') };
        };

        // 1. MONITOR VIEW ONCE (All Formats)
        const isViewOnce = m.message?.viewOnceMessageV2 || m.message?.viewOnceMessageV2Extension;
        if (isViewOnce) {
            try {
                const viewOnceContent = isViewOnce.message;
                const { buffer, type } = await getMedia(viewOnceContent);
                let caption = `*${current.title}*\n*Type:* View Once Bypass (${type})\n*From:* @${m.sender.split('@')[0]}\n\n${current.viewOnce}`;
                
                await sock.sendMessage(channelJid, { 
                    [type.toLowerCase()]: buffer, 
                    caption: caption, 
                    mentions: [m.sender],
                    mimetype: viewOnceContent[Object.keys(viewOnceContent)[0]].mimetype,
                    ptt: type === 'Audio' // Support for View Once Voice Notes
                });
            } catch (e) { await sock.sendMessage(botNumber, { text: "VEX ViewOnce Error: " + e.message }); }
        }

        // 2. MONITOR DELETED (Messages, Media, Status)
        if (m.message?.protocolMessage?.type === 0) {
            const key = m.message.protocolMessage.key;
            // 'store' lazima iwe imeandaliwa vizuri kuliweka kumbukumbu
            const deletedMsg = store.messages[m.chat]?.array.find(x => x.key.id === key.id);

            if (deletedMsg) {
                try {
                    const contentType = getContentType(deletedMsg.message);
                    let logHeader = `*${current.title}*\n*Event:* Deleted ${m.isGroup ? 'Group' : 'Direct'} Message\n*From:* @${deletedMsg.key.participant?.split('@')[0] || deletedMsg.key.remoteJid.split('@')[0]}\n\n${current.deleted}`;
                    
                    if (contentType === 'conversation' || contentType === 'extendedTextMessage') {
                        const text = deletedMsg.message.conversation || deletedMsg.message.extendedTextMessage.text;
                        await sock.sendMessage(channelJid, { text: `${logHeader}\n\n*Content:* ${text}`, mentions: [deletedMsg.key.participant || deletedMsg.key.remoteJid] });
                    } else {
                        const { buffer, type } = await getMedia(deletedMsg.message);
                        await sock.sendMessage(channelJid, { 
                            [type.toLowerCase()]: buffer, 
                            caption: logHeader, 
                            mentions: [deletedMsg.key.participant || deletedMsg.key.remoteJid],
                            mimetype: deletedMsg.message[Object.keys(deletedMsg.message)[0]].mimetype
                        });
                    }
                } catch (e) { await sock.sendMessage(botNumber, { text: "VEX Anti-Delete Backup: A message was deleted." }); }
            }
        }

        // 3. MONITOR EDITS (Text only)
        if (m.message?.protocolMessage?.type === 14) {
            const key = m.message.protocolMessage.key;
            const originalMsg = store.messages[m.chat]?.array.find(x => x.key.id === key.id);

            if (originalMsg) {
                try {
                    let log = `*${current.title}*\n*Event:* Edited Message\n*User:* @${m.sender.split('@')[0]}\n\n${current.edited}\n\n*Original Content:* ${originalMsg.message.conversation || originalMsg.message.extendedTextMessage.text}`;
                    await sock.sendMessage(channelJid, { text: log, mentions: [m.sender] });
                } catch (e) { /* Silent fail to keep bot running */ }
            }
        }
    }
};
