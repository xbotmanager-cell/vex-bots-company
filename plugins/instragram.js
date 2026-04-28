const axios = require('axios');
const translate = require('google-translate-api-x');

module.exports = {
    command: "instagram",
    alias: ["ig", "igdl", "reels"],
    category: "download",
    description: "Download Instagram Reels and Photos via link",

    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';

        // 1. DYNAMIC LINK DETECTION (VEX SCANNER)
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || "";
        const textAfterCmd = args.join(" ");
        
        const igRegex = /(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reels|reel|tv)\/[^\s]+)/gi;
        const link = textAfterCmd.match(igRegex)?.[0] || 
                     m.text.match(igRegex)?.[0] || 
                     quotedText.match(igRegex)?.[0];

        // CONFIGURATION ZA MODES (Super Dynamic Styles)
        const modes = {
            harsh: {
                wait: "🌀 𝙸'𝚖 𝚑𝚒𝚓𝚊𝚌𝚔𝚒𝚗𝚐 𝙸𝚗𝚜𝚝𝚊𝚐𝚛𝚊𝚖 𝚜𝚎𝚛𝚟𝚎𝚛𝚜 𝚏𝚘𝚛 𝚢𝚘𝚞... 𝚂𝚑𝚞𝚝 𝚞𝚙 𝚊𝚗𝚍 𝚠𝚊𝚒𝚝. 💀",
                msg: "┯━━━━━━━━━━━━━━━━┯\n   𝙷𝙴𝚁𝙴 𝙸𝚂 𝚈𝙾𝚄𝚁 𝙶𝙰𝚁𝙱𝙰𝙶𝙴 🗑️\n┷━━━━━━━━━━━━━━━━┷",
                react: "🦾",
                err: "🚫 𝚈𝚘𝚞 𝚠𝚊𝚜𝚝𝚎𝚍 𝚖𝚢 𝚌𝚢𝚌𝚕𝚎𝚜! 𝙸 𝚗𝚎𝚎𝚍 𝚊𝚗 𝙸𝚗𝚜𝚝𝚊𝚐𝚛𝚊𝚖 𝚕𝚒𝚗𝚔, 𝚢𝚘𝚞 𝚗𝚘𝚘𝚋. 🤡"
            },
            normal: {
                wait: "📥 「 ᴅᴏᴡɴʟᴏᴀᴅɪɴɢ ғʀᴏᴍ ɪɴsᴛᴀɢʀᴀᴍ... 」",
                msg: "✨ *Instagram Media successfully retrieved!*",
                react: "📸",
                err: "❌ *Error: Missing or invalid Instagram URL.*"
            },
            girl: {
                wait: "𝓈𝓉ℴ𝓅 𝓅𝓁𝒶𝓎𝒾𝓃ℊ 𝒶𝓃𝒹 𝓌𝒶𝒾𝓉 𝓈𝓌ℯℯ𝓉𝒾ℯ... 𝒾'𝓂 𝒻ℯ𝓉𝒸𝒽𝒾𝓃ℊ 𝓎ℴ𝓊𝓇 𝓅ℴ𝓈𝓉 🎀☁️",
                msg: "𝓁ℴℴ𝓀 𝓌𝒽𝒶𝓉 𝒾 𝒻ℴ𝓊𝓃𝒹 𝒻ℴ𝓇 𝓎ℴ𝓊! 🧸✨",
                react: "🦋",
                err: "ℊℴ𝓈𝒽! 𝒾 𝒸𝒶𝓃'𝓉 𝒻𝒾𝓃𝒹 𝒶𝓃𝓎 𝓁𝒾𝓃𝓀 𝒽ℯ𝓇ℯ 𝓅𝓇𝒾𝓃𝒸ℯ𝓈𝓈... 𝓈ℯ𝓃𝒹 𝒾𝓉 𝒶ℊ𝒶𝒾𝓃! 🍭"
            }
        };

        const current = modes[style] || modes.normal;

        if (!link) return m.reply(current.err);

        try {
            // Reaction & Waiting Feedback
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            const { key } = await sock.sendMessage(m.chat, { text: current.wait }, { quoted: m });

            // 2. INSTAGRAM DOWNLOAD API (High Speed)
            // Tunatumia API imara inayoweza kuona Reels na Photos
            const response = await axios.get(`https://api.vreden.web.id/api/igdl?url=${encodeURIComponent(link)}`);
            const result = response.data.result;

            if (!result || result.length === 0) {
                throw new Error("Could not find media on this link.");
            }

            // 3. TRANSLATION & CAPTION LOGIC
            let captionText = current.msg;
            if (lang !== 'en') {
                const res = await translate(current.msg, { to: lang });
                captionText = res.text;
            }

            // 4. SEND MEDIA (Handling Photos and Videos)
            for (const media of result) {
                const isVideo = media.url.includes('.mp4');
                const messageOptions = isVideo ? { video: { url: media.url } } : { image: { url: media.url } };
                
                await sock.sendMessage(m.chat, { 
                    ...messageOptions, 
                    caption: captionText 
                }, { quoted: m });
            }

            // Futa ile message ya 'Wait'
            await sock.sendMessage(m.chat, { delete: key });

        } catch (error) {
            console.error("Instagram DL Error:", error);
            await sock.sendMessage(m.chat, { text: `⚠️ *INSTA-FAIL:* ${error.message}` });
        }
    }
};
