// VEX MINI BOT - VEX: tst (TikTok Stalker)
// Nova: High-speed scraper for TikTok profile intelligence.
// Dev: Lupin Starnley

const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'tst',
    cyro: 'exploit',
    nova: 'Scrapes TikTok profiles for bio, followers, likes, and privacy status.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        if (!args[0]) return m.reply("❌ *ERROR:* Please provide a TikTok username.\nExample: `.tst vex` ");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🕵️", key: m.key } });

        const username = args[0].replace('@', '');
        const targetUrl = `https://www.tiktok.com/@${username}`;

        try {
            // 1. AXIOS FETCH WITH USER-AGENT (Kudanganya TikTok kuwa sisi ni Browser)
            const { data } = await axios.get(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            // 2. CHEERIO SCRAPING
            const $ = cheerio.load(data);
            
            // Extracting JSON Data from TikTok's script tag (The Pro Way)
            const scriptData = $('#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
            const jsonData = JSON.parse(scriptData).__DEFAULT_SCOPE__['webapp.user-detail'];
            
            const userInfo = jsonData.userInfo.user;
            const userStats = jsonData.userInfo.stats;

            // 3. CONSTRUCTING THE REPORT
            let tstMsg = `╭━━━〔 🕵️ *VEX: TIKTOK-STALKER* 〕━━━╮\n`;
            tstMsg += `┃ 🌟 *Status:* Target Located\n`;
            tstMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            tstMsg += `┃ 🧬 *Engine:* OSINT-V1H\n`;
            tstMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            tstMsg += `*📊 USER PROFILE*\n`;
            tstMsg += `| ◈ *Name:* ${userInfo.nickname} |\n`;
            tstMsg += `| ◈ *Bio:* ${userInfo.signature || "No Bio"} |\n`;
            tstMsg += `| ◈ *Private:* ${userInfo.privateAccount ? "Yes 🔐" : "No 🔓"} |\n`;
            tstMsg += `| ◈ *Verified:* ${userInfo.verified ? "Yes ✅" : "No"} |\n\n`;

            tstMsg += `*📈 STATS ANALYSIS*\n`;
            tstMsg += `| 💠 *Followers:* ${userStats.followerCount.toLocaleString()} |\n`;
            tstMsg += `| 💠 *Following:* ${userStats.followingCount.toLocaleString()} |\n`;
            tstMsg += `| 💠 *Total Likes:* ${userStats.heartCount.toLocaleString()} |\n`;
            tstMsg += `| 💠 *Videos:* ${userStats.videoCount.toLocaleString()} |\n\n`;

            tstMsg += `*🔗 DIRECT LINK*\n`;
            tstMsg += `┃ 🛰️ ${targetUrl}\n`;
            tstMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            tstMsg += `_VEX MINI BOT: The Digital Ghost_`;

            // 4. SEND WITH TARGET'S PROFILE IMAGE
            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: userInfo.avatarLarger }, 
                caption: tstMsg 
            }, { quoted: m });

        } catch (e) {
            console.error("TST Error:", e);
            m.reply("❌ *SCAN FAIL:* Target account not found or is highly protected.");
        }
    }
};