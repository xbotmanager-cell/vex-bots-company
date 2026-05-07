const axios = require('axios');
const translate = require('google-translate-api-x');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const Catbox = require('catbox.moe');

module.exports = {
    command: "removebg",
    alias: ["rmbg", "transparent", "futa"],
    category: "photo",
    description: "Inatoa background ya picha na kuiacha PNG safi",

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

        const msg =
            quoted || m.message;

        const mediaMsg =
            msg?.imageMessage ||
            msg?.viewOnceMessageV2?.message?.imageMessage ||
            msg?.viewOnceMessage?.message?.imageMessage;

        const modes = {

            harsh: {
                title: "『 💀 𝕭𝕬𝕮𝕶𝕲𝕽𝕺𝖀𝕹𝕯 𝕰𝕽𝕬𝕾𝕰𝕽 𝕱𝕺𝕽𝕮𝕰 💀 』",
                processing: "⚙️ 𝕯𝖎𝖘𝖎𝖓𝖙𝖊𝖌𝖗𝖆𝖙𝖎𝖓𝖌 𝖇𝖆𝖈𝖐𝖌𝖗𝖔𝖚𝖓𝖉... ⚡",
                done: "💀 𝕿𝖆𝖗𝖌𝖊𝖙 𝖎𝖘𝖔𝖑𝖆𝖙𝖊𝖉. 𝕻𝕹𝕲 𝖗𝖊𝖆𝖉𝖞. 💀",
                err: "☣️ 𝕴 𝖓𝖊𝖊𝖉 𝖆 𝖕𝖍𝖔𝖙𝖔 𝖙𝖔 𝖊𝖗𝖆𝖘𝖊 𝖇𝖆𝖈𝖐𝖌𝖗𝖔𝖚𝖓𝖉! ☣️",
                react: "✂️"
            },

            normal: {
                title: "💠 VEX Background Remover 💠",
                processing: "🎨 Removing background...",
                done: "✅ Background removed successfully.",
                err: "❌ Reply to an image first.",
                react: "💠"
            },

            girl: {
                title: "🫧 𝒫𝒩𝒢 𝑀𝒶𝑔𝒾𝒸 🫧",
                processing: "🫧 𝓇𝑒𝓂𝑜𝓋𝒾𝓃𝑔 𝒷𝒶𝒸𝓀𝑔𝓇𝑜𝓊𝓃𝒹... 🫧",
                done: "🫧 𝓅𝓇𝑒𝓉𝓉𝓎 𝓉𝓇𝒶𝓃𝓈𝓅𝒶𝓇𝑒𝓃𝓉 𝓅𝓃𝑔 𝒾𝓈 𝓇𝑒𝒶𝒹𝓎! 🫧",
                err: "🫧 𝓈𝑒𝓃𝒹 𝓂𝑒 𝒶 𝓅𝒾𝒸𝓉𝓊𝓇𝑒 𝒻𝒾𝓇𝓈𝓉! 🫧",
                react: "✨"
            }
        };

        const current =
            modes[style] || modes.normal;

        // NO IMAGE
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

            // PROCESS MSG
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

            // BUFFER VALIDATION
            if (
                !buffer ||
                buffer.length < 20
            ) {
                throw new Error(
                    "Invalid image buffer"
                );
            }

            // UPLOAD TO CATBOX
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

            // API CLUSTERS
            const apis = [

                // PRIMARY
                `https://api.betabotz.org/api/tools/removebg?url=${encodeURIComponent(imageUrl)}&apikey=beta-pato`,

                `https://widipe.com/api/removebg?url=${encodeURIComponent(imageUrl)}`,

                `https://bk9.fun/tools/removebg?url=${encodeURIComponent(imageUrl)}`,

                `https://api.maher-zubair.tech/ai/removebg?url=${encodeURIComponent(imageUrl)}`,

                `https://api.popcat.xyz/removebg?image=${encodeURIComponent(imageUrl)}`,

                `https://api.vyturex.com/removebg?url=${encodeURIComponent(imageUrl)}`
            ];

            let pngImage = null;

            // SMART FAILOVER ENGINE
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
                            (
                                type.includes('image/png') ||
                                type.includes('image')
                            )
                        ) {

                            pngImage =
                                Buffer.from(
                                    response.data
                                );

                            console.log(
                                "PNG Success"
                            );

                            break;
                        }

                        // JSON RESPONSE
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
                                    `Fetching PNG: ${possible}`
                                );

                                const second =
                                    await axios.get(
                                        possible,
                                        {
                                            responseType: 'arraybuffer',
                                            timeout: 45000
                                        }
                                    );

                                pngImage =
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
            if (!pngImage) {

                throw new Error(
                    "All removebg APIs failed"
                );
            }

            // PNG VALIDATION
            if (
                !pngImage ||
                pngImage.length < 20
            ) {

                throw new Error(
                    "Invalid PNG output"
                );
            }

            // FINAL TEXT
            let bodyText =
`*${current.title}*

🖼️ *Format:* PNG
✨ *Background:* Removed
⚙️ *Engine:* VEX Cluster

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

            // SEND PNG
            await sock.sendMessage(
                m.chat,
                {
                    image: pngImage,
                    mimetype: 'image/png',
                    caption: finalCaption
                },
                {
                    quoted: m
                }
            );

        } catch (error) {

            console.error(
                "REMOVE BG ERROR:",
                error
            );

            return sock.sendMessage(
                m.chat,
                {
                    text:
                        "☣️ REMOVEBG ENGINE FAILURE: ALL CLUSTERS FAILED."
                },
                {
                    quoted: m
                }
            );
        }
    }
};
