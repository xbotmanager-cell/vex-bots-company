// VEX MINI BOT - VEX: fbstalk (Facebook OSINT)
// Nova: High-speed scraper for Facebook profile intelligence.
// Dev: Lupin Starnley

const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    vex: 'fbstalk',
    cyro: 'exploit',
    nova: 'Scrapes Facebook profiles for public bio, profile pictures, and basic info.',

    async execute(m, sock) {
        const text = m.text.trim().split(/ +/).slice(1).join(" ");
        if (!text) return m.reply("❌ *ERROR:* Please provide a Facebook username or Profile Link.\nExample: `.fbstalk zuck` ");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🕵️", key: m.key } });

        let target = text;

        // Logic ya kusafisha URL ili kupata username pekee
        if (target.includes('facebook.com')) {
            let urlParts = target.split('facebook.com/')[1];
            if (urlParts) {
                target = urlParts.split(/[/?#]/)[0];
            }
        }

        const targetUrl = `https://mbasic.facebook.com/${target}`;

        try {
            // AXIOS FETCH WITH STEALTH HEADERS
            const { data } = await axios.get(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1'
                }
            });

            const $ = cheerio.load(data);
            
            // SCRAPING REFINED SELECTORS
            const name = $('title').text().replace(' - Log In or Sign Up', '').replace(' | Facebook', '') || "Unknown";
            const bio = $('div#bio').text() || "No public bio available.";
            
            // Kutafuta profile picture (mbasic mara nyingi hutumia class 'be' au 'p')
            const profilePic = $('div#objects_container img.be').attr('src') || $('div#objects_container img.p').attr('src') || "";
            
            // CONSTRUCTING THE REPORT
            let fbMsg = `╭━━━〔 🕵️ *VEX: FB-STALKER* 〕━━━╮\n`;
            fbMsg += `┃ 🌟 *Status:* Target Located\n`;
            fbMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            fbMsg += `┃ 🧬 *Engine:* OSINT-V1H\n`;
            fbMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            fbMsg += `*📊 USER PROFILE*\n`;
            fbMsg += `| ◈ *Name:* ${name} |\n`;
            fbMsg += `| ◈ *Username:* ${target} |\n`;
            fbMsg += `| ◈ *Bio:* ${bio} |\n\n`;

            fbMsg += `*🔗 DIRECT LINK*\n`;
            fbMsg += `┃ 🛰️ https://www.facebook.com/${target}\n`;
            fbMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            fbMsg += `_VEX MINI BOT: The Digital Ghost_`;

            // SEND REPORT
            if (profilePic && profilePic.startsWith('http')) {
                await sock.sendMessage(m.key.remoteJid, { 
                    image: { url: profilePic }, 
                    caption: fbMsg 
                }, { quoted: m });
            } else {
                await m.reply(fbMsg);
            }

        } catch (e) {
            console.error("FBSTALK Error:", e.message);
            m.reply("❌ *SCAN FAIL:* Imeshindikana kupata data za huyu mtu. Huenda account yake ni private, username ni wrong, au Facebook wameblock request hii.");
        }
    }
};
