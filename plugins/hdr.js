/**
 * VEX PLUGIN: AI HDR ENHANCER (ULTIMATE LIGHTING FORCE)
 * Feature: Color Correction + Contrast Boost + Multi-API Failover
 * Version: 4.5 (Lupin Edition)
 * Category: Photo
 * Dev: Lupin Starnley
 */

const axios = require('axios');
const translate = require('google-translate-api-x');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    command: "hdr",
    alias: ["color", "vibrant", "ngarisha"],
    category: "photo",
    description: "Inaboresha rangi na mwanga wa picha kuwa wa kisasa (HDR Effect)",

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
                title: "『 ⚡ 𝕳𝕯𝕽 𝕮𝕺𝕷𝕺𝕽 𝕰𝖃𝕰𝕮𝕿𝕴𝕺𝕹 ⚡ 』",
                processing: "⚙️ 𝕽𝖊-𝖈𝖆𝖑𝖎𝖇𝖗𝖆𝖙𝖎𝖓𝖌 𝖕𝖍𝖔𝖙𝖔𝖓𝖘... 𝕱𝖔𝖗𝖈𝖎𝖓𝖌 𝖛𝖎𝖇𝖗𝖆𝖓𝖈𝖞 𝖑𝖊𝖛𝖊𝖑𝖘! ⚡",
                done: "⚡ 𝕿𝖍𝖊 𝖈𝖔𝖑𝖔𝖗𝖘 𝖆𝖗𝖊 𝖓𝖔𝖜 𝖆𝖑𝖎𝖛𝖊. 𝖁𝕰𝖃 𝕾𝖙𝖞𝖑𝖊. ⚡",
                err: "☣️ 𝕱𝖚𝖈𝖐! 𝕴 𝖓𝖊𝖊𝖉 𝖆 𝖕𝖍𝖔𝖙𝖔 𝖙𝖔 𝖕𝖗𝖔𝖈𝖊𝖘𝖘! ☣️",
                react: "🌈"
            },
            normal: {
                title: "💠 VEX HDR Studio 💠",
                processing: "🎨 Adjusting dynamic range and color balance...",
                done: "✅ HDR processing complete. Professional quality applied.",
                err: "❌ Please reply to an image to apply HDR effect.",
                react: "💠"
            },
            girl: {
                title: "🫧 𝒫𝓇𝑒𝓉𝓉𝓎 𝒞𝑜𝓁𝑜𝓇𝓈 🫧",
                processing: "🫧 𝒶𝒹𝒹𝒾𝓃𝑔 𝓈𝑜𝓂𝑒 𝓈𝓅𝒶𝓇𝓀𝓁𝑒 𝓉𝑜 𝓎𝑜𝓊𝓇 𝓅𝒽𝑜𝓉𝑜... 🫧",
                done: "🫧 𝓁𝑜𝑜𝓀 𝒶𝓉 𝓉𝒽𝑜𝓈𝑒 𝒷𝑒𝒶𝓊𝓉𝒾𝒻𝓊𝓁 𝒸𝑜𝓁𝑜𝓇𝓈! 🫧",
                err: "🫧 𝒷𝒶𝒷𝑒, 𝓈𝑒𝓃𝒹 𝒶 𝓅𝒾𝒸𝓉𝓊𝓇𝑒 𝒻𝑜𝓇 𝓂𝑒 𝓉𝑜 𝒷𝑒𝒶𝓊𝓉𝒾𝒻𝓎! 🫧",
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

            // 3. Upload to Catbox for API usage
            const Catbox = require('catbox.moe');
            const uploader = new Catbox.Catbox();
            const imageUrl = await uploader.uploadBuffer(buffer);

            // 4. HDR BRUTE FORCE CLUSTERS (40+ Logic Backup)
            const apis = [
                `https://api.vyturex.com/hdr?url=${imageUrl}`,
                `https://widipe.com/ai/hdr?url=${imageUrl}`,
                `https://api.maher-zubair.tech/ai/hdr?url=${imageUrl}`,
                `https://bk9.fun/tools/hdr?url=${imageUrl}`,
                `https://api.betabotz.org/api/tools/hdr?url=${imageUrl}&apikey=beta-pato`,
                `https://api.boxi.me/api/hdr?url=${imageUrl}`
            ];

            let hdrImage = null;

            // 5. THE NEVER-STOP LOOP
            for (let api of apis) {
                try {
                    const response = await axios.get(api, { responseType: 'arraybuffer', timeout: 30000 });
                    if (response.status === 200) {
                        hdrImage = Buffer.from(response.data);
                        break; 
                    }
                } catch (e) {
                    console.log(`HDR Cluster [${apis.indexOf(api)}] busy, jumping...`);
                    continue; 
                }
            }

            if (!hdrImage) throw new Error("HDR Clusters Offline");

            // 6. UI & Final Translation
            let bodyText = `*${current.title}*\n\n🎨 *Effect:* High Dynamic Range\n🌈 *Color:* Enhanced 100%\n\n⚠️ _${current.done}_`;
            const { text: finalCaption } = await translate(bodyText, { to: targetLang });

            await sock.sendMessage(m.chat, { 
                image: hdrImage, 
                caption: finalCaption 
            }, { quoted: m });

        } catch (error) {
            console.error("VEX HDR ERROR:", error);
            await sock.sendMessage(m.chat, { text: "☣️ HDR ENGINE FAILURE: CLUSTERS OVERHEATED." }, { quoted: m });
        }
    }
};
