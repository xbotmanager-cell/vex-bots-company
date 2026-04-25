// VEX MINI BOT - VEX: github
// Nova: Developer Intelligence & Repo Scout
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'github',
    cyro: 'tools',
    nova: 'Retrieves comprehensive GitHub profile analytics and repository data',

    async execute(m, sock) {
        // 1. INPUT RECONNAISSANCE
        const args = m.message?.conversation?.split(' ').slice(1) || 
                     m.message?.extendedTextMessage?.text?.split(' ').slice(1);
        
        const username = args[0];

        if (!username) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Please specify a GitHub username.\nExample: `.github lupinstarnley`" 
            }, { quoted: m });
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "📂", key: m.key } });

        try {
            // 2. FETCHING GITHUB DATA
            const response = await axios.get(`https://api.github.com/users/${username}`);
            const user = response.data;

            // 3. CONSTRUCTING THE REPORT (Premium English Design)
            const sender = m.sender || m.key.participant || m.key.remoteJid;
            let githubMsg = `╭━━━〔 📂 *VEX: GITHUB-INTEL* 〕━━━╮\n`;
            githubMsg += `┃ 🌟 *Status:* Profile Decoded\n`;
            githubMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            githubMsg += `┃ 🧬 *Engine:* Dev-Scout V1\n`;
            githubMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            githubMsg += `*👤 IDENTITY*\n`;
            githubMsg += `| ◈ *Username:* ${user.login}\n`;
            githubMsg += `| ◈ *Name:* ${user.name || 'N/A'}\n`;
            githubMsg += `| ◈ *Bio:* ${user.bio || 'No bio available.'}\n\n`;

            githubMsg += `*📊 STATISTICS*\n`;
            githubMsg += `| ◈ *Public Repos:* ${user.public_repos}\n`;
            githubMsg += `| ◈ *Followers:* ${user.followers}\n`;
            githubMsg += `| ◈ *Following:* ${user.following}\n\n`;

            githubMsg += `*📅 TIMELINE*\n`;
            githubMsg += `| ◈ *Created:* ${new Date(user.created_at).toLocaleDateString()}\n`;
            githubMsg += `| ◈ *Location:* ${user.location || 'Unknown'}\n\n`;

            // SPECIAL LOGIC: Ikitafuta profile yako, inaongeza link ya repo (Hata kama ni private link)
            if (username.toLowerCase() === 'lupinstarnley' || username.toLowerCase() === 'liusreginaldtarimo') {
                githubMsg += `*🛡️ MASTER REPOSITORY*\n`;
                githubMsg += `| ◈ *VEX-Core:*coming soon\n\n`;
            }

            githubMsg += `*📢 SYSTEM NOTE*\n`;
            githubMsg += `┃ 💠 Developer metadata successfully extracted.\n`;
            githubMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            githubMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            githubMsg += `_VEX MINI BOT: Coding The Matrix_`;

            // 4. SEND RESPONSE WITH AVATAR
            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: user.avatar_url }, 
                caption: githubMsg,
                mentions: [sender]
            }, { quoted: m });

        } catch (error) {
            console.error("GitHub Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Target username not found in GitHub database." 
            }, { quoted: m });
        }
    }
};