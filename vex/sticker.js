// VEX MINI BOT - VEX: sticker
// Nova: Converts images/videos to high-quality stickers.
// Dev: Lupin Starnley

const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');
const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'sticker',           
    cyro: 'tools',         
    nova: 'Converts media to VEX branded stickers',

    async execute(m, sock) {
        // 1. 🎭 UNIQUE REACTION
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🎭", key: m.key } });

        // 2. CHECK FOR MEDIA
        // Checks if the message is an image/video or if it quotes an image/video
        const quoted = m.quoted ? m.quoted : m;
        const mime = (quoted.msg || quoted).mimetype || '';

        if (!/image|video|webp/.test(mime)) {
            const errorMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n` +
                             `┃ ⚠️ *Status:* Warning\n` +
                             `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                             `*❌ NO MEDIA DETECTED ❌*\n` +
                             `| ◈ *Action:* Reply to a photo or video |\n` +
                             `| ◈ *Command:* .sticker |\n\n` +
                             `_VEX MINI BOT: Visual Processor_`;
            return await sock.sendMessage(m.key.remoteJid, { text: errorMsg }, { quoted: m });
        }

        try {
            // Download the media
            const media = await quoted.download();
            
            // 3. STICKER ENGINE CONFIGURATION
            const sticker = new Sticker(media, {
                pack: 'VEX STICKER PACK', // The Pack Name you requested
                author: 'VEX',            // The Author you requested
                type: StickerTypes.FULL,  // Full size sticker
                categories: ['🤩', '🎉'], 
                id: '12345', 
                quality: 70,              // High quality balance
                background: '#000000' 
            });

            const stickerBuffer = await sticker.toBuffer();

            // 4. SEND THE STICKER
            await sock.sendMessage(m.key.remoteJid, { sticker: stickerBuffer }, { quoted: m });

        } catch (e) {
            console.error("VEX Sticker Error:", e);
            const failMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n` +
                            `┃ ⚠️ *Status:* Error\n` +
                            `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                            `*❌ CONVERSION FAILED ❌*\n` +
                            `| ◈ *Reason:* Media too large or invalid |\n` +
                            `| ◈ *Solution:* Try a shorter video/smaller image |`;
            await sock.sendMessage(m.key.remoteJid, { text: failMsg }, { quoted: m });
        }
    }
};