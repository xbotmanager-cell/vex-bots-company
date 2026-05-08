const axios = require("axios");

module.exports = {
    command: "setname",
    alias: ["changename", "profilename"],
    category: "system",
    description: "Change WhatsApp profile name instantly",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'normal';
        const newName = args.join(" ").trim();

        // =========================
        // STYLES ZA REPORT
        // =========================
        const designs = {
            harsh: {
                react: "☣️",
                success: `☣️ 𝙉𝘼𝙈𝙀 𝘾𝙃𝘼𝙉𝙂𝙀𝘿 ☣️\n\n➤ 𝗡𝗲𝘄 𝗡𝗮𝗺𝗲: *${newName}*\n➤ 𝗦𝘁𝗮𝘁𝘂𝘀: 𝙀𝙓𝙀𝘾𝙐𝙏𝙀𝘿\n➤ 𝗘𝗻𝗴𝗶𝗻𝗲: 𝙑𝙀𝙓 𝙊𝙑𝙀𝙍𝙇𝙊𝙍𝘿\n⚡ 𝙎𝙔𝙎𝙏𝙀𝙈 𝙐𝙋𝘿𝘼𝙏𝙀𝘿`,
                error: `☣️ 𝙀𝙍𝙊𝙍 ☣️\n\n➤ 𝙍𝙚𝙖𝙨𝙤𝙣: 𝙉𝙊 𝙉𝘼𝙈𝙀 𝙂𝙄𝙑𝙀𝙉\n➤ 𝙐𝙨𝙖𝙜𝙚:.setname Vex AI\n\n⚠️ 𝘾𝙊𝙈𝘼𝙉𝘿 𝙁𝘼𝙄𝙇𝙀𝘿`
            },
            normal: {
                react: "✅",
                success: `✅ *NAME UPDATED*\n\n➤ New Name: *${newName}*\n➤ Status: Success\n➤ Time: ${new Date().toLocaleTimeString()}\n\n⚡ VEX AI SYSTEM`,
                error: `❌ *ERROR*\n\n➤ Reason: No name provided\n➤ Usage:.setname Lupin Starnley\n\n⚠️ Command Failed`
            },
            girl: {
                react: "💖",
                success: `💖 𝑵𝑨𝑴𝑬 𝑪𝑯𝑨𝑵𝑮𝑬𝑫 💖\n\n➤ 𝑵𝒆𝒘 𝑵𝒂𝒎𝒆: *${newName}*\n➤ 𝑺𝒕𝒂𝒕𝒖𝒔: 𝑺𝒖𝒄𝒆𝒔𝒔 ✨\n➤ 𝑻𝒊𝒎𝒆: ${new Date().toLocaleTimeString()}\n\n🎀 𝑽𝑬𝑿 𝑨𝑰 𝑼𝑷𝑫𝑨𝑻𝑬𝑫`,
                error: `💔 𝑶𝑶𝑷𝑺 💔\n\n➤ 𝑹𝒆𝒂𝒔𝒐𝒏: 𝑵𝒐 𝒏𝒂𝒎𝒆 𝒈𝒊𝒗𝒆𝒏\n➤ 𝑼𝒔𝒂𝒈𝒆:.setname Lupin\n\n🌸 𝑻𝒓𝒚 𝑨𝒈𝒂𝒊𝒏 𝑺𝒘𝒆𝒆𝒕𝒊𝒆`
            }
        };

        const ui = designs[style] || designs.normal;

        // =========================
        // CHECK JINA
        // =========================
        if (!newName) {
            await sock.sendMessage(m.chat, {
                react: { text: "❌", key: m.key }
            });
            return sock.sendMessage(m.chat, { text: ui.error }, { quoted: m });
        }

        if (newName.length > 25) {
            await sock.sendMessage(m.chat, {
                react: { text: "⚠️", key: m.key }
            });
            return sock.sendMessage(m.chat, {
                text: ui.error.replace("NO NAME GIVEN", "NAME TOO LONG").replace("No name provided", "Name too long").replace("𝑵𝒐 𝒏𝒂𝒎𝒆 𝒈𝒊𝒗𝒆𝒏", "𝑵𝒂𝒎𝒆 𝒕𝒐𝒐 𝒍𝒐𝒏𝒈")
            }, { quoted: m });
        }

        // =========================
        // BADILI JINA
        // =========================
        try {
            await sock.updateProfileName(newName);

            // REACT + REPORT PAPO HAPO
            await sock.sendMessage(m.chat, {
                react: { text: ui.react, key: m.key }
            });

            await sock.sendMessage(m.chat, {
                text: ui.success,
                mentions: [m.sender]
            }, { quoted: m });

        } catch (err) {
            console.log("SETNAME ERROR:", err);

            await sock.sendMessage(m.chat, {
                react: { text: "❌", key: m.key }
            });

            await sock.sendMessage(m.chat, {
                text: ui.error.replace("NO NAME GIVEN", "WHATSAPP ERROR").replace("No name provided", "WhatsApp rejected").replace("𝑵𝒐 𝒏𝒂𝒎𝒆 𝒈𝒊𝒗𝒆𝒏", "𝑾𝒉𝒂𝒕𝒔𝑨𝒑 𝑬𝒓𝒐𝒓")
            }, { quoted: m });
        }
    }
};
