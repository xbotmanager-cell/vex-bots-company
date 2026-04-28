const axios = require('axios');
const https = require('https');
const translate = require('google-translate-api-x');

module.exports = {
    command: "facebook",
    alias: ["fb", "fbdl", "fbvideo"],
    category: "download",
    description: "Download Facebook videos in High Quality",

    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';
        const agent = new https.Agent({ rejectUnauthorized: false });

        // 1. SMART SCANNER (FB EDITION)
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || "";
        const textAfterCmd = args.join(" ");
        
        const fbRegex = /(https?:\/\/(?:www\.|web\.|m\.)?facebook\.com\/[^\s]+|https?:\/\/fb\.watch\/[^\s]+)/gi;
        const link = textAfterCmd.match(fbRegex)?.[0] || 
                     m.text.match(fbRegex)?.[0] || 
                     quotedText.match(fbRegex)?.[0];

        // 2. NEW AGE DESIGNS (No Lines - Icon Focused)
        const modes = {
            harsh: {
                wait: "⚙️ 𝘼𝙣𝙖𝙡𝙮𝙯𝙞𝙣𝙜 𝙁𝙖𝙘𝙚𝙗𝙤𝙤𝙠 𝙙𝙖𝙩𝙖... 𝘿𝙤𝙣'𝙩 𝙩𝙤𝙪𝙘𝙝 𝙖𝙣𝙮𝙩𝙝𝙞𝙣𝙜. 💀",
                msg: "🎬 𝙁𝘽 𝙑𝙞𝙙𝙚𝙤 𝘿𝙚𝙡𝙞𝙫𝙚𝙧𝙚𝙙. 𝙉𝙤𝙬 𝙜𝙚𝙩 𝙤𝙪𝙩. 🖕",
                react: "🦾",
                err: "🚫 𝙀𝙧𝙧𝙤𝙧: 𝙄 𝙣𝙚𝙚𝙙 𝙖 𝙁𝙖𝙘𝙚𝙗𝙤𝙤𝙠 𝙡𝙞𝙣𝙠, 𝙣𝙤𝙩 𝙮𝙤𝙪𝙧 𝙨𝙩𝙪𝙥𝙞𝙙 𝙩𝙚𝙯𝙩. 🤡"
            },
            normal: {
                wait: "📥 「 ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ʜᴅ ᴠɪᴅᴇᴏ... 」",
                msg: "✅ *FB Content Loaded Successfully!*",
                react: "🌐",
                err: "❌ *Please provide a valid Facebook URL.*"
            },
            girl: {
                wait: "𝓈ℯ𝒶𝓇𝒸𝒽𝒾𝓃ℊ 𝒻ℴ𝓇 𝓎ℴ𝓊𝓇 𝒻𝒷 𝓋𝒾𝒹ℯℴ 𝒷𝒶𝒷𝓎... ✨🦋",
                msg: "𝒽ℯ𝓇ℯ 𝒾𝓉 𝒾𝓈 𝓈𝓌ℯℯ𝓉𝒾ℯ! 𝓁ℴℴ𝓀𝓈 ℊℴℴ𝒹, 𝓇𝒾ℊ𝒽𝓉? 🎀🍭",
                react: "💎",
                err: "ℴℴ𝓅𝓈𝒾ℯ! 𝓉𝒽𝒶𝓉'𝓈 𝓃ℴ𝓉 𝒶 𝓋𝒶𝓁𝒾𝒹 𝒻𝒷 𝓁𝒾𝓃𝓀 𝒹𝒶𝓇𝓁𝒾𝓃ℊ... 🌸"
            }
        };

        const current = modes[style] || modes.normal;

        if (!link) return m.reply(current.err);

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            const { key } = await sock.sendMessage(m.chat, { text: current.wait }, { quoted: m });

            // 3. FB DOWNLOADER API (HQ)
            const response = await axios.get(`https://api.vreden.web.id/api/facebook?url=${encodeURIComponent(link)}`, {
                httpsAgent: agent
            });
            
            const data = response.data;
            // FB API mara nyingi inatoa HD na SD, tunachagua HD kwa nguvu
            const videoUrl = data.result.hd || data.result.sd;

            if (!videoUrl) throw new Error("Could not find high-quality video.");

            let captionText = current.msg;
            if (lang !== 'en') {
                try {
                    const res = await translate(current.msg, { to: lang });
                    captionText = res.text;
                } catch (e) { console.log("Translation error"); }
            }

            // 4. DELIVERY
            await sock.sendMessage(m.chat, { 
                video: { url: videoUrl }, 
                caption: captionText,
                headerType: 4 
            }, { quoted: m });

            await sock.sendMessage(m.chat, { delete: key });

        } catch (error) {
            console.error("FB DL Error:", error);
            await sock.sendMessage(m.chat, { text: `🛑 *FAILED:* ${error.message}` });
        }
    }
};
