const axios = require('axios');
const translate = require('google-translate-api-x');

module.exports = {
    command: "tiktok",
    alias: ["tt", "ttdl", "tiktokdl"],
    category: "download",
    description: "Download TikTok videos without watermark (HD)",

    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        // 1. SMART LINK DETECTION (Macho ya VEX)
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || "";
        const textAfterCmd = args.join(" ");
        
        // Inatafuta link kwenye: 1. Mbele ya command, 2. Kwenye reply, 3. Ndani ya maandishi yaliyo-reply-iwa
        const tiktokRegex = /(https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\/[^\s]+)/gi;
        const link = textAfterCmd.match(tiktokRegex)?.[0] || 
                     m.text.match(tiktokRegex)?.[0] || 
                     quotedText.match(tiktokRegex)?.[0];

        // CONFIGURATION ZA MODES
        const modes = {
            harsh: {
                wait: "⏳ 𝚆𝚊𝚒𝚝 𝚊 𝚖𝚒𝚗𝚞𝚝𝚎, 𝚢𝚘𝚞 𝚒𝚖𝚙𝚊𝚝𝚒𝚎𝚗𝚝 𝚋𝚊𝚜𝚝𝚊𝚛𝚍... 𝙸'𝚖 𝚐𝚎𝚝𝚝𝚒𝚗𝚐 𝚢𝚘𝚞𝚛 𝚜𝚝𝚞𝚙𝚒𝚍 𝚟𝚒𝚍𝚎𝚘. 🖕",
                msg: "𝙷𝚎𝚛𝚎 𝚒𝚜 𝚢𝚘𝚞𝚛 𝚟𝚒𝚍𝚎𝚘. 𝙳𝚘𝚗'𝚝 𝚝𝚑𝚊𝚗𝚔 𝚖𝚎, 𝙸 𝚍𝚘𝚗'𝚝 𝚌𝚊𝚛𝚎. 😤",
                react: "📥",
                err: "⚠️ 𝚆𝚑𝚎𝚛𝚎 𝚒𝚜 𝚝𝚑𝚎 𝚕𝚒𝚗𝚔? 𝙳𝚘 𝙸 𝚕𝚘𝚘𝚔 𝚕𝚒𝚔𝚎 𝚊 𝚖𝚊𝚐𝚒𝚌𝚒𝚊𝚗? 𝙶𝚒𝚟𝚎 𝚖𝚎 𝚊 𝚟𝚊𝚕𝚒𝚍 𝚃𝚒𝚔𝚃𝚘𝚔 𝚕𝚒𝚗𝚔! 🤡"
            },
            normal: {
                wait: "⏳ *Processing your TikTok request... please wait.*",
                msg: "✅ *TikTok Video Downloaded Successfully!*",
                react: "⚡",
                err: "❌ *Error: Please provide or reply to a valid TikTok link.*"
            },
            girl: {
                wait: "𝒸ℴ𝓂𝒾𝓃ℳ 𝒷𝒶𝒷𝓎... 𝓁ℯ𝓉 𝓂ℯ 𝒻𝒾𝓃𝒹 𝓉𝒽𝒶𝓉 𝓅𝓇ℯ𝓉𝓉𝓎 𝓋𝒾𝒹ℯℴ 𝒻ℴ𝓇 𝓊! ✨🌷",
                msg: "𝒽ℯ𝓇ℯ 𝒾𝓉 𝒾𝓈 𝓈𝓌ℯℯ𝓉𝒾ℯ! 𝒽ℴ𝓅ℯ 𝓎ℴ𝓊 𝓁ℴ𝓋ℯ 𝒾𝓉! 🎀🍭",
                react: "🌸",
                err: "ℴℴ𝓅𝓈𝒾ℯ! 𝒾 𝓃ℯℯ𝒹 𝒶 𝓁𝒾𝓃𝓀 𝓉ℴ 𝓌ℴ𝓇𝓀 𝓂𝓎 𝓂𝒶ℊ𝒾𝒸! 🧸💎"
            }
        };

        const current = modes[style] || modes.normal;

        if (!link) return m.reply(current.err);

        try {
            // Send Reaction & Waiting Message
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            const { key } = await sock.sendMessage(m.chat, { text: current.wait }, { quoted: m });

            // 2. TIKTOK DOWNLOAD API (HD - No Watermark)
            const response = await axios.get(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(link)}`);
            const data = response.data;

            if (!data || !data.video || !data.video.noWatermark) {
                throw new Error("Video not found or API error");
            }

            const videoUrl = data.video.noWatermark;
            const videoTitle = data.title || "VEX-TikTok-DL";

            // 3. TRANSLATION & CAPTION
            let caption = `${current.msg}\n\n🎬 *Title:* ${videoTitle}`;
            if (lang !== 'en') {
                const res = await translate(current.msg, { to: lang });
                caption = `${res.text}\n\n🎬 *Title:* ${videoTitle}`;
            }

            // 4. SEND VIDEO & DELETE WAIT MSG
            await sock.sendMessage(m.chat, { 
                video: { url: videoUrl }, 
                caption: caption,
                headerType: 4 
            }, { quoted: m });

            await sock.sendMessage(m.chat, { delete: key });

        } catch (error) {
            console.error("TikTok DL Error:", error);
            await sock.sendMessage(m.chat, { text: `🛑 *FAILED:* ${error.message}` });
        }
    }
};
