// VEX MINI BOT - VEX: video
// Nova: Searches YouTube and provides 5 selectable options.
// Dev: Lupin Starnley

const yts = require('yt-search');

module.exports = {
    vex: 'video',
    cyro: 'download',
    nova: 'Searches YouTube and provides top 5 selectable results.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        let query = m.quoted ? m.quoted.text : args.join(' ');

        if (!query) return m.reply("❌ *USAGE:* `.video [song name]` or reply to text.");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🔍", key: m.key } });

        try {
            const search = await yts(query);
            const videos = search.videos.slice(0, 5); // Chukua 5 tu za mwanzo

            if (videos.length === 0) return m.reply("🚫 *ERROR:* No video found for this node.");

            // Hifadhi matokeo kwenye global variable ili yatumike na amri ya namba
            global.ytSelection = global.ytSelection || {};
            global.ytSelection[m.sender] = videos;

            let searchMsg = `╭━━━〔 📺 *VEX: YT-SEARCH* 〕━━━╮\n`;
            searchMsg += `┃ 🌟 *Query:* ${query}\n`;
            searchMsg += `┃ 🧬 *Status:* 5 Nodes Found\n`;
            searchMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            videos.forEach((vid, i) => {
                searchMsg += `*${i + 1}.* ${vid.title}\n`;
                searchMsg += `> 🕒 Duration: ${vid.timestamp}\n`;
                searchMsg += `> 👁️ Views: ${vid.views}\n\n`;
            });

            searchMsg += `*🛠️ ACTION REQUIRED:*\n`;
            searchMsg += `> Reply with **.1** up to **.5** to download the specific video node.\n\n`;
            searchMsg += `_VEX MINI BOT: Privacy is Power_`;

            // Tuma picha ya video ya kwanza kama thumbnail ya kuonesha vibe
            await sock.sendMessage(m.chat, { 
                image: { url: videos[0].thumbnail }, 
                caption: searchMsg 
            }, { quoted: m });

        } catch (e) {
            m.reply("❌ *SEARCH FAIL:* YouTube connection interrupted.");
        }
    }
};