// VEX MINI BOT - VEX: ist (Instagram Stalker)
// Nova: High-speed Instagram OSINT for profile data.
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'ist',
    cyro: 'exploit',
    nova: 'Fetches Instagram profile data including bio, followers, and account type.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        if (!args[0]) return m.reply("❌ *ERROR:* Please provide an Instagram username.\nExample: `.ist cristiano` ");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "📸", key: m.key } });

        const username = args[0].replace('@', '');
        
        // Tunatumia RapidAPI au Public Scraper Proxy kupata data safi
        const targetUrl = `https://www.instagram.com/${username}/?__a=1&__d=dis`;

        try {
            const { data } = await axios.get(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
                }
            });

            const user = data.graphql.user;

            // 3. CONSTRUCTING THE REPORT
            let istMsg = `╭━━━〔 📸 *VEX: INSTA-STALKER* 〕━━━╮\n`;
            istMsg += `┃ 🌟 *Status:* Account Analyzed\n`;
            istMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            istMsg += `┃ 🧬 *Engine:* OSINT-V1H\n`;
            istMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            istMsg += `*📊 USER DOSSIER*\n`;
            istMsg += `| ◈ *Username:* @${user.username} |\n`;
            istMsg += `| ◈ *Full Name:* ${user.full_name} |\n`;
            istMsg += `| ◈ *Bio:* ${user.biography || "No Bio Available"} |\n`;
            istMsg += `| ◈ *Verified:* ${user.is_verified ? "Yes ✅" : "No"} |\n`;
            istMsg += `| ◈ *Private:* ${user.is_private ? "Yes 🔐" : "No 🔓"} |\n\n`;

            istMsg += `*📈 ANALYTICS*\n`;
            istMsg += `| 💠 *Followers:* ${user.edge_followed_by.count.toLocaleString()} |\n`;
            istMsg += `| 💠 *Following:* ${user.edge_follow.count.toLocaleString()} |\n`;
            istMsg += `| 💠 *Posts:* ${user.edge_owner_to_timeline_media.count.toLocaleString()} |\n\n`;

            istMsg += `*🔗 EXTERNAL LINK*\n`;
            istMsg += `┃ 🛰️ ${user.external_url || "None"}\n`;
            istMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            istMsg += `_VEX MINI BOT: Vision Beyond Limits_`;

            // 4. SEND WITH PROFILE PICTURE
            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: user.profile_pic_url_hd }, 
                caption: istMsg 
            }, { quoted: m });

        } catch (e) {
            console.error("IST Error:", e);
            m.reply("❌ *SCAN FAIL:* Unable to reach Instagram servers or account is restricted. Try again later.");
        }
    }
};