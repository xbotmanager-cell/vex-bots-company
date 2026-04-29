const cron = require('node-cron');
const axios = require('axios');
const translate = require('google-translate-api-x');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    command: "remind",
    alias: ["alarm", "schedule"],
    category: "tools",
    description: "Set a professional reminder for text or media via cloud sync",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style?.value || 'harsh';
        const remoteJid = m.chat;
        const sender = m.sender;
        const isGroup = m.isGroup;
        
        // Fetching location data
        const locationName = isGroup ? (await sock.groupMetadata(remoteJid)).subject : "Direct Message";

        // VEX Multi-Style UI
        const modes = {
            harsh: {
                title: "☘️ 𝖁𝕰𝖃 𝕿𝕴𝕸𝕰 𝖂𝕬𝕽𝕯𝕰𝕹 ☘️",
                set: "☘️ 𝕬𝖑𝖆𝖗𝖒 𝖘𝖊𝖙. 𝕯𝖔𝖓'𝖙 𝖇𝖊 𝖆 𝖋𝖔𝖔𝖑 𝖆𝖓𝖉 𝖋𝖔𝖗𝖌𝖊𝖙. ☘️",
                alert: "🚨 𝖂𝕬𝖶𝕰 𝖀𝕻! 𝖄𝖔𝖚 𝖎𝖘𝖘𝖚𝖊𝖉 𝖙𝖍𝖎𝖘 𝖈𝖔𝖒𝖒𝖆𝖓𝖉 𝖎𝖓:",
                react: "☘️"
            },
            normal: {
                title: "⏰ VEX Scheduler ⏰",
                set: "✅ Reminder has been successfully scheduled.",
                alert: "🔔 Notification! You set this reminder in:",
                react: "⏰"
            },
            girl: {
                title: "🌸 𝐿𝓊𝓅𝒾𝓃'𝓈 𝒢𝑒𝓃𝓉𝓁𝑒 𝑅𝑒𝓂𝒾𝓃𝒹𝑒𝓇 🌸",
                set: "🌸 𝐼'𝓋𝑒 𝓁𝑜𝒸𝓀𝑒𝒹 𝒾𝓉 𝒾𝓃 𝓂𝓎 𝒽𝑒𝒶𝓇𝓉 𝒻𝑜𝓇 𝓎𝑜𝓊! 🌸",
                alert: "🎀 𝐻𝑒𝓎 𝒹𝑒𝒶𝓇! 𝑅𝑒𝓂𝑒𝓂𝒷𝑒𝓇 𝓌𝒽𝒶𝓉 𝓎𝑜𝓊 𝒶𝓈𝓀𝑒𝒹 𝒾𝓃:",
                react: "🌸"
            }
        };

        const current = modes[style] || modes.normal;

        // Input Validation: .remind [minutes] [target_lang] [message]
        if (!args[0] || isNaN(args[0])) {
            return m.reply(`Usage: .remind [minutes] [lang_code] [message]\nExample: .remind 10 en call the boss`);
        }

        const minutes = parseInt(args[0]);
        // Default to 'en' if the second argument isn't a 2-letter language code
        const targetLang = (args[1] && args[1].length === 2) ? args[1] : 'en';
        const messageText = (args[1] && args[1].length === 2) ? args.slice(2).join(" ") : args.slice(1).join(" ");

        let mediaUrl = "";
        let mediaType = "";

        // --- CLOUD MEDIA UPLOAD SYSTEM ---
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const msg = quoted || m.message;
        const type = Object.keys(msg)[0];

        if (type && (type.includes('Image') || type.includes('Video') || type.includes('Audio') || type.includes('Document'))) {
            try {
                await sock.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });
                const stream = await downloadContentFromMessage(msg[type], type.replace('Message', '').toLowerCase());
                let buffer = Buffer.from([]);
                for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }

                // Uploading to cloud storage via Catbox API
                const bodyForm = new FormData();
                bodyForm.append("fileToUpload", buffer, "file");
                bodyForm.append("reqtype", "fileupload");
                const { data } = await axios.post("https://catbox.moe/user/api.php", bodyForm);
                mediaUrl = data;
                mediaType = type.replace('Message', '');
            } catch (e) { 
                console.error("Cloud Upload Failed:", e.message); 
            }
        }

        await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
        await m.reply(current.set);

        // --- CALCULATION & CRON TRIGGER ---
        const date = new Date(Date.now() + minutes * 60000);
        const cronTime = `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;

        cron.schedule(cronTime, async () => {
            let notificationBody = `*${current.title}*\n\n`;
            notificationBody += `${current.alert} *${locationName}*\n`;
            
            if (messageText) notificationBody += `📝 *Task:* ${messageText}\n`;
            if (mediaUrl) notificationBody += `🔗 *Attachment (${mediaType}):* ${mediaUrl}\n`;
            
            notificationBody += `\n👤 Target: @${sender.split('@')[0]}`;

            // Automatic Translation to the requested language
            const { text: translatedOutput } = await translate(notificationBody, { to: targetLang });

            await sock.sendMessage(remoteJid, { 
                text: translatedOutput, 
                mentions: [sender] 
            });
        }, { 
            scheduled: true, 
            timezone: "Africa/Nairobi" 
        });
    }
};
