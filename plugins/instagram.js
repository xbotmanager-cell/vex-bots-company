const axios = require('axios');
const https = require('https');
const translate = require('google-translate-api-x');

module.exports = {
    command: "instagram",
    alias: ["ig", "igdl", "reels"],
    category: "download",
    description: "Download Instagram Reels and Photos via link",

    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        const agent = new https.Agent({ rejectUnauthorized: false });

        // 1. SCANNER ENGINE
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || "";
        const textAfterCmd = args.join(" ");
        
        const igRegex = /(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reels|reel|tv)\/[^\s]+)/gi;
        const link = textAfterCmd.match(igRegex)?.[0] || 
                     m.text.match(igRegex)?.[0] || 
                     quotedText.match(igRegex)?.[0];

        // 2. DYNAMIC STYLES (No Lines Edition)
        const modes = {
            harsh: {
                wait: "🌀 𝙂𝙚𝙩𝙩𝙞𝙣𝙜 𝙮𝙤𝙪𝙧 𝙛𝙞𝙡𝙚... 𝙨𝙩𝙤𝙥 𝙧𝙪𝙨𝙝𝙞𝙣𝙜 𝙢𝙚. 💀",
                msg: "𝙅𝙪𝙨𝙩 𝙩𝙖𝙠𝙚 𝙞𝙩 𝙖𝙣𝙙 𝙜𝙤. 🗑️",
                react: "🦾",
                err: "🚫 𝙒𝙝𝙚𝙧𝙚'𝙨 𝙩𝙝𝙚 𝙡𝙞𝙣𝙠? 𝘿𝙤𝙣'𝙩 𝙬𝙖𝙨𝙩𝙚 𝙢𝙮 𝙩𝙞𝙢𝙚. 🤡"
            },
            normal: {
                wait: "📥 *Fetching from Instagram...*",
                msg: "✨ *Done! Enjoy your media.*",
                react: "📸",
                err: "❌ *Provide a valid Instagram URL.*"
            },
            girl: {
                wait: "𝓈ℯ𝓃𝒹𝒾𝓃ℊ 𝓁ℴ𝓋ℯ... 𝒻ℯ𝓉𝒸𝒽𝒾𝓃ℊ 𝓎ℴ𝓊𝓇 𝓅ℴ𝓈𝓉 𝒷𝒶𝒷ℯ 🎀☁️",
                msg: "𝒽ℯ𝓇ℯ 𝒾𝓈 𝓎ℴ𝓊𝓇 𝓋𝒾𝒹ℯℴ 𝒹𝒶𝓇𝓁𝒾𝓃ℊ! 🧸✨",
                react: "🦋",
                err: "ℴℴ𝓅𝓈𝒾ℯ! 𝓃ℴ 𝓁𝒾𝓃𝓀 𝒻ℴ𝓊𝓃𝒹 𝒽ℯ𝓇ℯ... 🌸"
            }
        };

        const current = modes[style] || modes.normal;

        if (!link) return m.reply(current.err);

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            const { key } = await sock.sendMessage(m.chat, { text: current.wait }, { quoted: m });

            // 3. API CALL WITH SSL BYPASS
            const response = await axios.get(`https://api.vreden.web.id/api/igdl?url=${encodeURIComponent(link)}`, {
                httpsAgent: agent
            });
            
            const result = response.data.result;
            if (!result || result.length === 0) throw new Error("Media not found.");

            let captionText = current.msg;
            if (lang !== 'en') {
                try {
                    const res = await translate(current.msg, { to: lang });
                    captionText = res.text;
                } catch (e) { console.log("Translation skip"); }
            }

            // 4. SMART MULTI-MEDIA DELIVERY
            for (const media of result) {
                const isVideo = media.url.includes('.mp4');
                const content = isVideo ? { video: { url: media.url } } : { image: { url: media.url } };
                
                await sock.sendMessage(m.chat, { 
                    ...content, 
                    caption: captionText 
                }, { quoted: m });
            }

            await sock.sendMessage(m.chat, { delete: key });

        } catch (error) {
            console.error("IG Error:", error);
            await sock.sendMessage(m.chat, { text: `⚠️ *Error:* ${error.message}` });
        }
    }
};
