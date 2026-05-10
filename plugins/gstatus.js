const axios = require("axios");

const REPORT_IMAGE = "https://i.ibb.co/Myk40VZF/Chat-GPT-Image-May-10-2026-12-07-48-PM.png";

module.exports = {
    command: "gstatus",
    alias: ["togroupstatus", "groupstatus", "postgroup", "gs"],
    category: "tools",
    description: "Intelligently post any media to any WhatsApp group",

    async execute(m, sock, ctx) {
        const { args, prefix } = ctx;

        try {
            const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const isGroup = m.chat.endsWith("@g.us");

            // SMART DETECTION: If in group and no args, post to current group
            let targetGroupId = null;
            let customCaption = "";

            if (isGroup &&!args[0]) {
                // Mode 1: Already in group, just reply to media
                targetGroupId = m.chat;
                customCaption = args.join(" ");
            } else if (args[0]) {
                // Mode 2: Provided group link/ID
                targetGroupId = args[0];
                customCaption = args.slice(1).join(" ");

                if (targetGroupId.includes("chat.whatsapp.com/")) {
                    try {
                        const code = targetGroupId.split("chat.whatsapp.com/")[1].split(/[? ]/)[0];
                        const info = await sock.groupGetInviteInfo(code);
                        targetGroupId = info.id;
                    } catch {
                        return await sendErrorReport(m, sock, "Invalid group link", prefix);
                    }
                }

                if (!targetGroupId.endsWith("@g.us")) targetGroupId += "@g.us";
            } else {
                return await sendErrorReport(m, sock, "No target group", prefix);
            }

            if (!quoted) {
                return await sendErrorReport(m, sock, "Reply to media required", prefix);
            }

            await sock.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

            // Verify bot in target group
            let groupMeta;
            try {
                groupMeta = await sock.groupMetadata(targetGroupId);
            } catch {
                return await sendErrorReport(m, sock, "Bot not in target group", prefix);
            }

            // INTELLIGENT MEDIA DETECTION
            const mediaData = await detectAndDownload(quoted, sock);
            if (!mediaData) {
                return await sendErrorReport(m, sock, "Unsupported media type", prefix);
            }

            const { type, buffer, mimetype, originalCaption } = mediaData;
            const finalCaption = customCaption || originalCaption || "";

            // BUILD STYLED CAPTIONS FOR DIFFERENT STYLES
            const userSettings = ctx.userSettings || {};
            const style = userSettings.style || "normal";

            const captions = {
                harsh: `╭━━━〔 ☣️ GROUP BROADCAST 〕━━━╮\n┃ 🎯 TARGET: ${groupMeta.subject}\n┃ 👤 OPERATOR: @${m.sender.split("@")[0]}\n┃ 📦 PAYLOAD: ${type.toUpperCase()}\n┃ ⚡ STATUS: DEPLOYED\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n${finalCaption}`,

                normal: `╭━━━〔 📢 GROUP STATUS 〕━━━╮\n┃ 🏷️ Group: ${groupMeta.subject}\n┃ 👤 Posted by: @${m.sender.split("@")[0]}\n┃ 📦 Type: ${type}\n┃ 🕒 ${new Date().toLocaleTimeString()}\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n${finalCaption}`,

                girl: `🌸 Posting to ${groupMeta.subject} ~\n💖 By: @${m.sender.split("@")[0]}\n✨ Type: ${type}\n🎀 Time: ${new Date().toLocaleTimeString()}\n\n${finalCaption}`
            };

            const styledCaption = captions[style] || captions.normal;

            // POST WITH AUTO-RETRY
            let success = false;
            let attempts = 0;

            while (!success && attempts < 3) {
                attempts++;
                try {
                    if (type === "image") {
                        await sock.sendMessage(targetGroupId, {
                            image: buffer,
                            caption: styledCaption,
                            mentions: [m.sender],
                            mimetype
                        });
                    } else if (type === "video") {
                        await sock.sendMessage(targetGroupId, {
                            video: buffer,
                            caption: styledCaption,
                            mentions: [m.sender],
                            mimetype
                        });
                    } else if (type === "audio") {
                        await sock.sendMessage(targetGroupId, {
                            audio: buffer,
                            mimetype,
                            ptt: false
                        });
                        if (finalCaption) {
                            await sock.sendMessage(targetGroupId, {
                                text: styledCaption,
                                mentions: [m.sender]
                            });
                        }
                    } else if (type === "sticker") {
                        await sock.sendMessage(targetGroupId, { sticker: buffer });
                        if (finalCaption) {
                            await sock.sendMessage(targetGroupId, {
                                text: styledCaption,
                                mentions: [m.sender]
                            });
                        }
                    } else if (type === "document") {
                        await sock.sendMessage(targetGroupId, {
                            document: buffer,
                            mimetype,
                            fileName: `VEX_${Date.now()}`,
                            caption: styledCaption,
                            mentions: [m.sender]
                        });
                    } else if (type === "text") {
                        await sock.sendMessage(targetGroupId, {
                            text: styledCaption,
                            mentions: [m.sender]
                        });
                    }
                    success = true;
                } catch (err) {
                    if (attempts === 3) throw err;
                    await new Promise(r => setTimeout(r, 1000));
                }
            }

            await sock.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
            await sendSuccessReport(m, sock, groupMeta, type, attempts);

        } catch (error) {
            console.error("gstatus error:", error);
            await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
            await sendErrorReport(m, sock, error.message, ctx.prefix);
        }
    }
};

// INTELLIGENT MEDIA DETECTOR
async function detectAndDownload(quoted, sock) {
    try {
        if (quoted.imageMessage) {
            const buf = await sock.downloadMediaMessage({ message: { imageMessage: quoted.imageMessage } });
            return {
                type: "image",
                buffer: buf,
                mimetype: quoted.imageMessage.mimetype || "image/jpeg",
                originalCaption: quoted.imageMessage.caption || ""
            };
        }
        if (quoted.videoMessage) {
            const buf = await sock.downloadMediaMessage({ message: { videoMessage: quoted.videoMessage } });
            return {
                type: "video",
                buffer: buf,
                mimetype: quoted.videoMessage.mimetype || "video/mp4",
                originalCaption: quoted.videoMessage.caption || ""
            };
        }
        if (quoted.audioMessage) {
            const buf = await sock.downloadMediaMessage({ message: { audioMessage: quoted.audioMessage } });
            return {
                type: "audio",
                buffer: buf,
                mimetype: quoted.audioMessage.mimetype || "audio/mp4",
                originalCaption: ""
            };
        }
        if (quoted.stickerMessage) {
            const buf = await sock.downloadMediaMessage({ message: { stickerMessage: quoted.stickerMessage } });
            return {
                type: "sticker",
                buffer: buf,
                mimetype: "image/webp",
                originalCaption: ""
            };
        }
        if (quoted.documentMessage) {
            const buf = await sock.downloadMediaMessage({ message: { documentMessage: quoted.documentMessage } });
            return {
                type: "document",
                buffer: buf,
                mimetype: quoted.documentMessage.mimetype,
                originalCaption: quoted.documentMessage.fileName || ""
            };
        }
        if (quoted.conversation || quoted.extendedTextMessage?.text) {
            return {
                type: "text",
                buffer: null,
                mimetype: "text/plain",
                originalCaption: quoted.conversation || quoted.extendedTextMessage.text
            };
        }
        return null;
    } catch {
        return null;
    }
}

// SUCCESS REPORT WITH IMAGE
async function sendSuccessReport(m, sock, groupMeta, type, attempts) {
    const report = `╭━━━〔 ✅ POST SUCCESS 〕━━━╮\n` +
                   `┃ 🎯 Group: ${groupMeta.subject}\n` +
                   `┃ 📦 Type: ${type.toUpperCase()}\n` +
                   `┃ 👥 Members: ${groupMeta.participants.length}\n` +
                   `┃ 🔄 Attempts: ${attempts}\n` +
                   `┃ ⚡ Status: Delivered\n` +
                   `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                   `✅ Media posted successfully to group status`;

    try {
        const img = await axios.get(REPORT_IMAGE, { responseType: "arraybuffer", timeout: 8000 });
        await sock.sendMessage(m.chat, {
            image: Buffer.from(img.data),
            caption: report
        }, { quoted: m });
    } catch {
        await m.reply(report);
    }
}

// ERROR REPORT WITH IMAGE
async function sendErrorReport(m, sock, reason, prefix) {
    const report = `╭━━━〔 ❌ POST FAILED 〕━━━╮\n` +
                   `┃ ⚠️ Reason: ${reason}\n` +
                   `┃ 💡 Solution: Check usage below\n` +
                   `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                   `📋 USAGE:\n` +
                   `1. Reply to any media\n` +
                   `2. In group: ${prefix}gstatus\n` +
                   `3. To other group: ${prefix}gstatus [link]\n\n` +
                   `✅ Supports: Image, Video, Audio, Sticker, Document, Text`;

    try {
        const img = await axios.get(REPORT_IMAGE, { responseType: "arraybuffer", timeout: 8000 });
        await sock.sendMessage(m.chat, {
            image: Buffer.from(img.data),
            caption: report
        }, { quoted: m });
    } catch {
        await m.reply(report);
    }
}
