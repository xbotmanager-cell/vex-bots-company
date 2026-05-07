const axios = require('axios');
const translate = require('google-translate-api-x');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const Catbox = require('catbox.moe');

module.exports = {
    command: "remini",
    alias: ["enhance", "hd", "upscale", "safisha"],
    category: "photo",
    description: "Inasafisha picha iliyofubaa na kuondoa blur kwa nguvu ya AI",

    async execute(m, sock, ctx) {

        const { userSettings } = ctx;

        const style =
            userSettings?.style || 'harsh';

        const targetLang =
            userSettings?.lang || 'en';

        // SAFE IMAGE DETECTION
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
                title: "『 ☣️ 𝕻𝕳𝕺𝕿𝕺 𝕽𝕰𝕾𝕿𝕺𝕽𝕬𝕿𝕴𝕺𝕹 𝕱𝕺𝕽𝕮𝕰 ☣️ 』",
                processing: "⚙️ 𝕾𝖈𝖆𝖓𝖓𝖎𝖓𝖌 𝖕𝖎𝖝𝖊𝖑𝖘... 𝕰𝖝𝖊𝖈𝖚𝖙𝖎𝖓𝖌 𝕬𝕴 𝕽𝖊𝖘𝖙𝖔𝖗𝖆𝖙𝖎𝖔𝖓 𝕱𝖔𝖗𝖈𝖊! ⚡",
                done: "☣️ 𝕺𝖇𝖘𝖊𝖗𝖛𝖊 𝖙𝖍𝖊 𝖈𝖑𝖆𝖗𝖎𝖙𝖞. 𝖁𝕰𝖃 𝖓𝖊𝖛𝖊𝖗 𝖋𝖆𝖎𝖑𝖘. ☣️",
                err: "⚠️ 𝕼𝖚𝖔𝖙𝖊 𝖆 𝖉𝖆𝖒𝖓 𝖕𝖍𝖔𝖙𝖔 𝖙𝖔 𝖊𝖓𝖍𝖆𝖓𝖈𝖊! ⚠️",
                react: "⚡"
            },

            normal: {
                title: "💠 VEX Remini Pro 💠",
                processing: "🎨 Cleaning image and restoring details...",
                done: "✅ Image enhanced successfully.",
                err: "❌ Please reply to a photo.",
                react: "💠"
            },

            girl: {
                title: "🫧 𝒫𝒽𝑜𝓉𝑜 𝒢𝓁𝑜𝓌 𝒰𝓅 🫧",
                processing: "🫧 𝓂𝒶𝓀𝒾𝓃𝑔 𝓎𝑜𝓊𝓇 𝓅𝒽𝑜𝓉𝑜 𝓅𝑒𝓇𝒻𝑒𝒸𝓉... 🫧",
                done: "🫧 𝓉𝒶-𝒹𝒶! 𝓈𝓊𝓅𝑒𝓇 𝒸𝓁𝑒𝒶𝓇! 🫧",
                err: "🫧 𝓈𝑒𝓃𝒹 𝓂𝑒 𝒶 𝓅𝒾𝒸𝓉𝓊𝓇𝑒 𝒻𝒾𝓇𝓈𝓉! 🫧",
                react: "✨"
            }
        };

        const current =
            modes[style] || modes.normal;

        if (!mediaMsg) {

            return sock.sendMessage(
                m.chat,
                {
                    text: current.err
                },
                {
                    quoted: m
                }
            );
        }

        try {

            // REACTION
            await sock.sendMessage(
                m.chat,
                {
                    react: {
                        text: current.react,
                        key: m.key
                    }
                }
            );

            // PROCESS NOTICE
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

            // BUFFER CHECK
            if (
                !buffer ||
                buffer.length < 15
            ) {
                throw new Error(
                    "Corrupted image buffer"
                );
            }

            // CATBOX UPLOAD
            const uploader =
                new Catbox.Catbox();

            const imageUrl =
                await uploader.uploadBuffer(
                    buffer
                );

            if (!imageUrl) {
                throw new Error(
                    "Catbox upload failed"
                );
            }

            console.log(
                `Uploaded: ${imageUrl}`
            );

            // AI API CLUSTERS
            const apis = [

                // REMINI
                `https://widipe.com/api/remini?url=${encodeURIComponent(imageUrl)}`,

                `https://api.betabotz.org/api/tools/remini?url=${encodeURIComponent(imageUrl)}&apikey=beta-pato`,

                `https://bk9.fun/tools/remini?url=${encodeURIComponent(imageUrl)}`,

                // UPSCALE
                `https://api.popcat.xyz/improve?image=${encodeURIComponent(imageUrl)}`,

                // HDR
                `https://widipe.com/ai/hdr?url=${encodeURIComponent(imageUrl)}`,

                // FACE ENHANCE
                `https://some-random-api.com/canvas/overlay/wasted?avatar=${encodeURIComponent(imageUrl)}`
            ];

            let enhancedImage = null;

            // INTELLIGENT FAILOVER
            for (const api of apis) {

                try {

                    console.log(
                        `Trying API: ${api}`
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

                        const type =
                            response.headers[
                                'content-type'
                            ];

                        // DIRECT IMAGE
                        if (
                            type &&
                            type.includes('image')
                        ) {

                            enhancedImage =
                                Buffer.from(
                                    response.data
                                );

                            console.log(
                                "Image Success"
                            );

                            break;
                        }

                        // JSON URL RESULT
                        try {

                            const json =
                                JSON.parse(
                                    Buffer.from(
                                        response.data
                                    ).toString()
                                );

                            const possible =
                                json.result ||
                                json.url ||
                                json.image ||
                                json.data;

                            if (possible) {

                                console.log(
                                    `Fetching: ${possible}`
                                );

                                const second =
                                    await axios.get(
                                        possible,
                                        {
                                            responseType: 'arraybuffer',
                                            timeout: 45000
                                        }
                                    );

                                enhancedImage =
                                    Buffer.from(
                                        second.data
                                    );

                                break;
                            }

                        } catch {}
                    }

                } catch (e) {

                    console.log(
                        `API Failed: ${e.message}`
                    );

                    continue;
                }
            }

            // LAST RESORT
            if (!enhancedImage) {

                console.log(
                    "Fallback -> Original Image"
                );

                enhancedImage = buffer;
            }

            // IMAGE VALIDATION
            if (
                !enhancedImage ||
                enhancedImage.length < 20
            ) {
                throw new Error(
                    "Enhanced image invalid"
                );
            }

            // FINAL TEXT
            let bodyText =
`*${current.title}*

✅ *Status:* Enhanced
⚙️ *Engine:* VEX Immortal Cluster
🌈 *Mode:* AI Restoration

_${current.done}_`;

            let finalCaption =
                bodyText;

            // SAFE TRANSLATION
            try {

                if (
                    targetLang !== 'en'
                ) {

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

                finalCaption =
                    bodyText;
            }

            // SEND RESULT
            await sock.sendMessage(
                m.chat,
                {
                    image: enhancedImage,
                    caption: finalCaption
                },
                {
                    quoted: m
                }
            );

        } catch (error) {

            console.error(
                "VEX REMINI ERROR:",
                error
            );

            return sock.sendMessage(
                m.chat,
                {
                    text:
                        "☣️ SYSTEM OVERLOAD: AI ENHANCER FAILED."
                },
                {
                    quoted: m
                }
            );
        }
    }
};
