/**
 * VEX PLUGIN: AI IMAGE UPSCALER (4K RESOLUTION FORCE)
 * Feature: 4x Scaling + Pixel Density Boost + Multi-API Failover
 * Version: 3.0 (Immortal Edition)
 * Category: Photo
 * Dev: Lupin Starnley
 */

const axios = require('axios');
const translate = require('google-translate-api-x');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    command: "upscale",
    alias: ["4k", "hd-photo", "kuza"],
    category: "photo",
    description: "Inakuza picha ndogo kuwa kubwa na yenye ubora wa 4K",

    async execute(m, sock, ctx) {
        const { args, userSettings } = ctx;
        const style = userSettings?.style || 'harsh';
        const targetLang = userSettings?.lang || 'sw';

        // 1. Quoted Media Check
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const msg = quoted || m.message;
        const mediaMsg = msg?.imageMessage || msg?.viewOnceMessageV2?.message?.imageMessage;

        const modes = {
            harsh: {
                title: "『 ⚡ 4𝕶 𝖀𝕻𝕾𝕮𝕬𝕷𝕰 𝕰𝖃𝕰𝕮𝕿𝖀𝕿𝕴𝕺𝕹 ⚡ 』",
                processing: "⚙️ 𝕸𝖚𝖑𝖙𝖎𝖕𝖑𝖞𝖎𝖓𝖌 𝖕𝖎𝖝𝖊𝖑 𝖉𝖊𝖓𝖘𝖎𝖙𝖞... 𝕭𝖗𝖚𝖙𝖊 𝖋𝖔𝖗𝖈𝖎𝖓𝖌 4𝕶 𝖈𝖑𝖚𝖘𝖙𝖊𝖗𝖘! ⚡",
                done: "⚡ 𝕽𝖊𝖘𝖔𝖑𝖚𝖙𝖎𝖔𝖓 𝖒𝖆𝖝𝖎𝖒𝖎𝖟𝖊𝖉. 𝖁𝕰𝖃 𝕻𝖔𝖜𝖊𝖗. ⚡",
                err: "☣️ 𝕰𝕽𝕽𝕺𝕽: 𝕹𝖔 𝖎𝖒𝖆𝖌𝖊 𝖉𝖊𝖙𝖊𝖈𝖙𝖊𝖉 𝖙𝖔 𝖚𝖕𝖘𝖈𝖆𝖑𝖊! ☣️",
                react: "🚀"
            },
            normal: {
                title: "💠 VEX 4K Upscaler 💠",
                processing: "🎨 Scaling image resolution to 4K... please wait.",
                done: "✅ Upscaling complete. High-resolution image delivered.",
                err: "❌ Please reply to an image to upscale.",
                react: "💠"
            },
            girl: {
                title: "🫧 𝐵𝒾𝑔𝑔𝑒𝓇 & 𝐵𝑒𝓉𝓉𝑒𝓇 🫧",
                processing: "🫧 𝓂𝒶𝓀𝒾𝓃𝑔 𝓎𝑜𝓊𝓇 𝓅𝒽𝑜𝓉𝑜 𝒷𝒾𝑔 𝒶𝓃𝒹 𝒸𝓁𝑒𝒶𝓇 𝒻𝑜𝓇 𝓎𝑜𝓊... 🫧",
                done: "🫧 𝓁𝑜𝑜𝓀 𝒽𝑜𝓌 𝒸𝓁𝑒𝒶𝓇 𝒾𝓉 𝒾𝓈 𝓃𝑜𝓌, 𝒷𝒶𝒷𝑒! 🫧",
                err: "🫧 𝑜𝑜𝓅𝓈𝒾𝑒, I 𝓃𝑒𝑒𝒹 𝒶 𝓅𝒾𝒸𝓉𝓊𝓇𝑒 𝓉𝑜 𝓂𝒶𝓀𝑒 𝒾𝓉 𝒷𝒾𝑔! 🫧",
                react: "✨"
            }
        };

        const current = modes[style] || modes.normal;
        if (!mediaMsg) return sock.sendMessage(m.chat, { text: current.err }, { quoted: m });

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });
            await sock.sendMessage(m.chat, { text: current.processing }, { quoted: m });

            // 2. Download Image
            const stream = await downloadContentFromMessage(mediaMsg, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 3. Upload to Catbox
            const Catbox = require('catbox.moe');
            const uploader = new Catbox.Catbox();
            const imageUrl = await uploader.uploadBuffer(buffer);

            // 4. THE 4K BRUTE FORCE API LIST
            const apis = [
                `https://api.vyturex.com/upscale?url=${imageUrl}`,
                `https://widipe.com/ai/upscale?url=${imageUrl}`,
                `https://api.betabotz.org/api/tools/upscale?url=${imageUrl}&apikey=beta-pato`,
                `https://bk9.fun/tools/upscale?url=${imageUrl}`,
                `https://api.maher-zubair.tech/ai/upscale?url=${imageUrl}`,
                `https://api.boxi.me/api/upscale?url=${imageUrl}`
            ];

            let upscaledImage = null;

            // 5. THE FAILOVER LOOP
            for (let api of apis) {
                try {
                    const response = await axios.get(api, { responseType: 'arraybuffer', timeout: 35000 });
                    if (response.status === 200) {
                        upscaledImage = Buffer.from(response.data);
                        break; 
                    }
                } catch (e) {
                    console.log(`Upscale Cluster [${apis.indexOf(api)}] failed, switching...`);
                    continue; 
                }
            }

            if (!upscaledImage) throw new Error("Upscale Engine Exhausted");

            // 6. UI & Final Translation
            let bodyText = `*${current.title}*\n\n📈 *Scale:* 400% (4K)\n💎 *Quality:* Ultra HD\n\n⚠️ _${current.done}_`;
            const { text: finalCaption } = await translate(bodyText, { to: targetLang });

            await sock.sendMessage(m.chat, { 
                image: upscaledImage, 
                caption: finalCaption 
            }, { quoted: m });

        } catch (error) {
            console.error("VEX UPSCALE ERROR:", error);
            await sock.sendMessage(m.chat, { text: "☣️ UPSCALE ENGINE FAILURE: ALL CLUSTERS ARE DOWN." }, { quoted: m });
        }
    }
};
