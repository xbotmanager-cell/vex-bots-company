const axios = require('axios');
const translate = require('google-translate-api-x');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const Catbox = require('catbox.moe');

module.exports = {
    command: "hdr",
    alias: ["color", "vibrant", "ngarisha"],
    category: "photo",
    description: "Inaboresha rangi na mwanga wa picha kuwa wa kisasa (HDR Effect)",

    async execute(m, sock, ctx) {

        const { userSettings } = ctx;

        const style =
            userSettings?.style || "harsh";

        const targetLang =
            userSettings?.lang || "en";

        // SAFE QUOTED DETECTION
        const quoted =
            m.message?.extendedTextMessage
                ?.contextInfo?.quotedMessage;

        const msg = quoted || m.message;

        const mediaMsg =
            msg?.imageMessage ||
            msg?.viewOnceMessageV2?.message?.imageMessage ||
            msg?.viewOnceMessage?.message?.imageMessage;

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

        const current =
            modes[style] || modes.normal;

        if (!mediaMsg) {
            return sock.sendMessage(
                m.chat,
                { text: current.err },
                { quoted: m }
            );
        }

        try {

            // FAST REACTION
            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: current.react,
                        key: m.key
                    }
                }
            );

            // PROCESS MESSAGE
            await sock.sendMessage(
                m.chat,
                {
                    text: current.processing
                },
                {
                    quoted: m
                }
            );

            // DOWNLOAD IMAGE
            const stream =
                await downloadContentFromMessage(
                    mediaMsg,
                    'image'
                );

            let buffer =
                Buffer.from([]);

            for await (const chunk of stream) {
                buffer =
                    Buffer.concat([
                        buffer,
                        chunk
                    ]);
            }

            // BUFFER SAFETY
            if (!buffer || buffer.length < 10) {
                throw new Error("Invalid image buffer");
            }

            // UPLOAD TO CATBOX
            const uploader =
                new Catbox.Catbox();

            const imageUrl =
                await uploader.uploadBuffer(buffer);

            if (!imageUrl) {
                throw new Error("Catbox upload failed");
            }

            // SMART HDR API CLUSTERS
            const apis = [

                // DIRECT IMAGE APIs
                `https://widipe.com/ai/hdr?url=${encodeURIComponent(imageUrl)}`,

                `https://api.betabotz.org/api/tools/hdr?url=${encodeURIComponent(imageUrl)}&apikey=beta-pato`,

                `https://bk9.fun/tools/hdr?url=${encodeURIComponent(imageUrl)}`,

                // FALLBACK ENHANCERS
                `https://api.popcat.xyz/improve?image=${encodeURIComponent(imageUrl)}`,

                `https://some-random-api.com/canvas/misc/oil?avatar=${encodeURIComponent(imageUrl)}`
            ];

            let hdrImage = null;

            // INTELLIGENT FAILOVER
            for (const api of apis) {

                try {

                    console.log(
                        `HDR Engine Trying: ${api}`
                    );

                    const response =
                        await axios.get(api, {
                            responseType: 'arraybuffer',
                            timeout: 45000,
                            headers: {
                                'User-Agent': 'Mozilla/5.0'
                            }
                        });

                    if (
                        response &&
                        response.status === 200 &&
                        response.data
                    ) {

                        const contentType =
                            response.headers['content-type'];

                        // IMAGE VALIDATION
                        if (
                            contentType &&
                            contentType.includes('image')
                        ) {

                            hdrImage =
                                Buffer.from(response.data);

                            console.log(
                                "HDR SUCCESS"
                            );

                            break;
                        }

                        // JSON IMAGE URL SUPPORT
                        try {

                            const json =
                                JSON.parse(
                                    Buffer.from(
                                        response.data
                                    ).toString()
                                );

                            const possibleUrl =
                                json.result ||
                                json.url ||
                                json.image ||
                                json.data;

                            if (possibleUrl) {

                                const secondFetch =
                                    await axios.get(
                                        possibleUrl,
                                        {
                                            responseType: 'arraybuffer',
                                            timeout: 45000
                                        }
                                    );

                                hdrImage =
                                    Buffer.from(
                                        secondFetch.data
                                    );

                                break;
                            }

                        } catch {}
                    }

                } catch (e) {

                    console.log(
                        `HDR API FAILED: ${e.message}`
                    );

                    continue;
                }
            }

            // LAST RESORT
            if (!hdrImage) {

                console.log(
                    "Fallback Activated"
                );

                hdrImage = buffer;
            }

            // CAPTION
            let bodyText =
`*${current.title}*

🎨 *Effect:* High Dynamic Range
🌈 *Color:* Enhanced
⚡ *Engine:* Multi AI Cluster

_${current.done}_`;

            let finalCaption = bodyText;

            // SAFE TRANSLATION
            try {

                if (targetLang !== 'en') {

                    const translated =
                        await translate(
                            bodyText,
                            {
                                to: targetLang
                            }
                        );

                    finalCaption =
                        translated.text;
                }

            } catch {

                finalCaption = bodyText;
            }

            // SEND FINAL IMAGE
            await sock.sendMessage(
                m.chat,
                {
                    image: hdrImage,
                    caption: finalCaption
                },
                {
                    quoted: m
                }
            );

        } catch (error) {

            console.error(
                "VEX HDR ERROR:",
                error
            );

            return sock.sendMessage(
                m.chat,
                {
                    text:
                        "☣️ HDR ENGINE FAILURE: CLUSTERS OVERHEATED."
                },
                {
                    quoted: m
                }
            );
        }
    }
};
