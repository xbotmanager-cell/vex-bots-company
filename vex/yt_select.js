// VEX MINI BOT - VEX: 1, 2, 3, 4, 5
// Nova: Selects and downloads the video from the search list.
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: /^\.[1-5]$/, // Inakubali .1, .2, .3, .4, .5
    cyro: 'download',
    nova: 'Downloads the selected YouTube video node.',

    async execute(m, sock) {
        // Angalia kama kuna selection iliyofanywa na huyu user
        if (!global.ytSelection || !global.ytSelection[m.sender]) return;

        const selectionIndex = parseInt(m.text.replace('.', '')) - 1;
        const selectedVid = global.ytSelection[m.sender][selectionIndex];

        if (!selectedVid) return m.reply("❌ *ERROR:* Invalid selection. Please search again.");

        await sock.sendMessage(m.key.remoteJid, { react: { text: "📥", key: m.key } });

        try {
            // Hapa tunatumia API ya kuaminika ili kuepuka ytdl-core errors
            // Unaweza kutumia API yoyote ya YT Downloader (e.g. y2mate API)
            const apiUrl = `https://api.dhamasevice.cyou/api/ytdl?url=${selectedVid.url}`;
            const res = await axios.get(apiUrl);
            const downloadUrl = res.data.result.video;

            let dlMsg = `╭━━━〔 📥 *VEX: DOWNLOADING* 〕━━━╮\n`;
            dlMsg += `┃ 📝 *Title:* ${selectedVid.title}\n`;
            dlMsg += `┃ 🕒 *Duration:* ${selectedVid.timestamp}\n`;
            dlMsg += `┃ 🧬 *Node:* MP4 Ready\n`;
            dlMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n`;
            dlMsg += `_VEX MINI BOT: Synchronizing Data..._`;

            await m.reply(dlMsg);

            // Tuma Video yenyewe
            await sock.sendMessage(m.chat, { 
                video: { url: downloadUrl }, 
                caption: `✅ *VEX:* ${selectedVid.title} successfully extracted.`,
                fileName: `${selectedVid.title}.mp4`
            }, { quoted: m });

            // Futa selection baada ya kumaliza kazi ili kuweka RAM safi
            delete global.ytSelection[m.sender];

        } catch (e) {
            m.reply("❌ *DOWNLOAD ERROR:* Target video is too large or API node is down.");
        }
    }
};