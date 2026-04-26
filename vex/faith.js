// VEX MINI BOT - VEX: faith
// Nova: Multi-Scripture Intelligence Engine (Bible & Quran)
// Dev: Lupin Starnley (VEX Master)

const axios = require('axios');

module.exports = {
    vex: 'faith',
    cyro: 'religion',
    nova: 'Extracts holy scriptures from the Bible and Quran with high precision.',

    async execute(m, sock) {
        // 1. INPUT RESOLVER (Check for quoted text or direct arguments)
        const args = m.text.trim().split(/ +/).slice(1).join(' ');
        let query = m.quoted ? m.quoted.text : args;

        if (!query) {
            return m.reply("⚠️ *VEX FAITH:* Input required.\nUsage: `.faith John 3:16` or `.faith Baqarah 255`\n_Note: You can also reply to a message containing a verse._");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "📖", key: m.key } });

        try {
            let report = "";
            
            // 2. IDENTIFY SCRIPTURE SOURCE (Bible vs Quran Logic)
            const quranKeywords = ['baqarah', 'nisa', 'maidah', 'imran', 'quran', 'surah'];
            const isQuran = quranKeywords.some(key => query.toLowerCase().includes(key)) || /^\d+:\d+$/.test(query);

            if (isQuran) {
                // --- ENGINE A: HOLY QURAN ---
                // Format expected for API: surah:ayah (e.g., 2:255)
                let quranQuery = query.replace(/[^0-9:]/g, '') || "2:255";
                const res = await axios.get(`https://api.alquran.cloud/v1/ayah/${quranQuery}/en.sahih`);
                const data = res.data.data;

                report = `╭━━━〔 📖 *VEX: QURAN-CORE* 〕━━━╮\n` +
                          `┃ 🌟 *Status:* Guidance Found\n` +
                          `┃ 📜 *Surah:* ${data.surah.englishName}\n` +
                          `┃ 🔢 *Ayah:* ${data.numberInSurah}\n` +
                          `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                          `*📖 ARABIC:* \n> ${data.text}\n\n` +
                          `*📝 ENGLISH TRANSLATION:* \n${data.text}\n\n` +
                          `*💡 INSIGHT:* \n_This verse belongs to ${data.surah.revelationType} revelation._\n\n` +
                          `_VEX: The Digital Prophet_`;

            } else {
                // --- ENGINE B: HOLY BIBLE ---
                const res = await axios.get(`https://bible-api.com/${encodeURIComponent(query)}`);
                const data = res.data;

                report = `╭━━━〔 📖 *VEX: BIBLE-CORE* 〕━━━╮\n` +
                          `┃ 🌟 *Status:* Verse Located\n` +
                          `┃ 📜 *Reference:* ${data.reference}\n` +
                          `┃ 🧬 *Translation:* WEB (World English)\n` +
                          `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                          `*📖 SCRIPTURE:* \n> ${data.text.trim()}\n\n` +
                          `*💡 VEX REFLECTION:* \n_Stay focused on the word. Wisdom is the ultimate shield._\n\n` +
                          `_VEX: Faith & Intelligence_`;
            }

            // 3. TRANSMISSION
            await sock.sendMessage(m.key.remoteJid, { 
                text: report,
                contextInfo: {
                    externalAdReply: {
                        title: "VEX RELIGIOUS INTELLIGENCE",
                        body: "Faith synchronized across all nodes.",
                        thumbnailUrl: "https://telegra.ph/file/af55d8f3ec608d4888be6.jpg",
                        sourceUrl: "https://26pesa.store/page/reg.php?reg=Mr@lupin76",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

        } catch (error) {
            console.error("FAITH ERROR:", error);
            m.reply("❌ *VEX-ERROR:* Verse not found. Ensure you use the correct format (e.g., Book Chapter:Verse).");
        }
    }
};
