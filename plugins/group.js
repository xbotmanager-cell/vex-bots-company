const { downloadContentFromMessage, getContentType } = require("@whiskeysockets/baileys");
const axios = require("axios");
const fs = require('fs');
const path = require('path');

// PICHA YAKO YA ALIVE - SAME
const MENU_IMAGE = "https://i.ibb.co/4Z7Sf3q5/Chat-GPT-Image-May-8-2026-07-10-41-PM.png";

module.exports = {
    command: "group",
    alias: ["listgc", "gclist", "groups", "gc"],
    category: "group",
    description: "List all groups + mass add user to all groups",

    async execute(m, sock, { args, userSettings }) {
        const style = userSettings?.style || 'normal';
        const jid = m.sender;
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        const modes = {
            harsh: {
                react: "☣️",
                title: "☣️ 𝙑𝙀𝙓 𝙂𝙍𝙊𝙐𝙋 𝘾𝙊𝙉𝙏𝙍𝙊𝙇 ☣️",
                err: "💢 𝙍𝙀𝙋𝙇𝙔 𝙏𝙊 𝙐𝙎𝙀𝙍 𝙊𝙍 𝙋𝙍𝙊𝙑𝙄𝘿𝙀 𝙉𝙐𝙈𝘽𝙀𝙍! 🤬",
                adding: "☣️ 𝙄𝙉𝙄𝙏𝙄𝘼𝙏𝙄𝙉𝙂 𝙈𝘼𝙎 𝘼𝘿... ⚡"
            },
            normal: {
                react: "📋",
                title: "📋 VEX GROUP CONTROL",
                err: "❌ Reply to a user or provide number:.group 255xxx",
                adding: "📋 Adding user to all groups... ⏳"
            },
            girl: {
                react: "💖",
                title: "💖 𝑽𝑬𝑿 𝑮𝑹𝑶𝑼𝑷 𝑳𝑰𝑺𝑻 💖",
                err: "🌸 𝑅𝑒𝑝𝑙𝑦 𝑡𝑜 𝑢𝑠𝑒𝑟 𝑜𝑟 𝑔𝑖𝑣𝑒 𝑛𝑢𝑚𝑏𝑒𝑟 𝑏𝑎𝑏𝑒~ 🍭",
                adding: "💖 𝐴𝑑𝑑𝑖𝑛𝑔 𝑡𝑜 𝑎𝑙 𝑔𝑟𝑜𝑢𝑝𝑠... ✨"
            }
        };

        const ui = modes[style] || modes.normal;

        await sock.sendMessage(m.chat, {
            react: { text: ui.react, key: m.key }
        });

        try {
            // =========================
            // 1. PATA GROUPS ZOTE
            // =========================
            const allGroups = await sock.groupFetchAllParticipating();
            const groupIds = Object.keys(allGroups);

            if (groupIds.length === 0) {
                return m.reply("❌ Bot haijajiunga na group lolote.");
            }

            // =========================
            // 2. KAMA HAKUNA ARGS = LIST GROUPS
            // =========================
            if (!args[0]) {
                let listText = `╭━━━〔 ${ui.title} 〕━━━╮\n\n`;
                listText += `┃ 📊 TOTAL: ${groupIds.length} Groups\n┃ 🤖 BOT: @${botNumber.split('@')[0]}\n┣━━━━━━━━━━━━━━━━\n\n`;

                let count = 1;
                for (const groupId of groupIds) {
                    const metadata = allGroups[groupId];
                    const participants = metadata.participants || [];
                    const botParticipant = participants.find(p => p.id === botNumber);
                    const isAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';
                    const role = isAdmin? '👑 ADMIN' : '👤 MEMBER';

                    listText += `${count}. *${metadata.subject}*\n`;
                    listText += ` └ ${role} | ${participants.length} Members\n`;
                    listText += ` └ ID: ${groupId}\n\n`;
                    count++;

                    if (count > 50) {
                        listText += `...na ${groupIds.length - 50} zingine\n\n`;
                        break;
                    }
                }

                listText += `╰━━━━━━━━━━━━━━━━━━╯\n\n`;
                listText += `⚡ *Usage*: Reply user +.group\n`;
                listText += `⚡ *Usage*:.group 255780470905\n`;
                listText += `⚡ VEX AI SYSTEM`;

                // DOWNLOAD IMAGE
                let imageBuffer = null;
                try {
                    const response = await axios.get(MENU_IMAGE, {
                        responseType: "arraybuffer",
                        timeout: 20000,
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    if (response.headers['content-type']?.startsWith('image/')) {
                        imageBuffer = Buffer.from(response.data);
                    }
                } catch {}

                if (imageBuffer) {
                    await sock.sendMessage(m.chat, {
                        image: imageBuffer,
                        caption: listText,
                        mentions: [jid]
                    }, { quoted: m });
                } else {
                    await sock.sendMessage(m.chat, {
                        text: listText,
                        mentions: [jid]
                    }, { quoted: m });
                }
                return;
            }

            // =========================
            // 3. PATA TARGET USER WA KUADD
            // =========================
            let targetUser = null;

            // Check kama amereply
            if (m.message?.extendedTextMessage?.contextInfo?.participant) {
                targetUser = m.message.extendedTextMessage.contextInfo.participant;
            }
            // Check kama ameweka namba
            else if (args[0] && /^\d+$/.test(args[0])) {
                targetUser = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            }

            if (!targetUser) {
                return m.reply(ui.err);
            }

            // =========================
            // 4. MASS ADD - ANTI BAN SEQUENCE FIXED
            // =========================
            const addMsg = await m.reply(ui.adding);

            let success = [];
            let failed = [];
            let requested = [];
            let alreadyMember = [];
            let rateLimited = 0;

            for (let i = 0; i < groupIds.length; i++) {
                const groupId = groupIds[i];
                const metadata = allGroups[groupId];

                try {
                    // Check kama tayari yumo
                    const isAlready = metadata.participants.some(p => p.id === targetUser);
                    if (isAlready) {
                        alreadyMember.push(metadata.subject);
                        continue;
                    }

                    // Jaribu kuadd
                    const res = await sock.groupParticipantsUpdate(groupId, [targetUser], "add");

                    if (res[0]?.status === 200) {
                        success.push(metadata.subject); // 200 = SUCCESS FIXED
                    } else if (res[0]?.status === 409) {
                        alreadyMember.push(metadata.subject); // 409 = TAYARI YUMO FIXED
                    } else if (res[0]?.status === 408) {
                        requested.push(metadata.subject); // 408 = REQUEST SENT
                    } else if (res[0]?.status === 421) {
                        failed.push(`${metadata.subject} - Rate Limited`);
                        rateLimited++;
                        await new Promise(r => setTimeout(r, 10000)); // Subiri 10s
                    } else if (res[0]?.status === 403) {
                        failed.push(`${metadata.subject} - Bot not admin`);
                    } else {
                        failed.push(`${metadata.subject} - Error ${res[0]?.status}`);
                    }

                } catch (e) {
                    const errMsg = e.message || '';
                    if (errMsg.includes('admin') || errMsg.includes('403')) {
                        failed.push(`${metadata.subject} - Bot not admin`);
                    } else if (errMsg.includes('request') || errMsg.includes('408')) {
                        requested.push(metadata.subject);
                    } else if (errMsg.includes('409')) {
                        alreadyMember.push(metadata.subject); // 409 catch
                    } else if (errMsg.includes('421')) {
                        failed.push(`${metadata.subject} - Rate Limited`);
                        rateLimited++;
                        await new Promise(r => setTimeout(r, 10000));
                    } else {
                        failed.push(`${metadata.subject} - ${errMsg.slice(0, 30)}`);
                    }
                }

                // ANTI-BAN DELAY: 5 SEKUNDE - FIXED
                if (i < groupIds.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }

                // Update progress kila groups 5
                if ((i + 1) % 5 === 0 || i === groupIds.length - 1) {
                    try {
                        await sock.sendMessage(m.chat, {
                            edit: addMsg.key,
                            text: `${ui.adding}\n\nProgress: ${i + 1}/${groupIds.length}\n✅ Success: ${success.length}\n📩 Requested: ${requested.length}\n👥 Already: ${alreadyMember.length}\n❌ Failed: ${failed.length}${rateLimited > 0? `\n⚠️ Rate Limited: ${rateLimited}` : ''}`
                        });
                    } catch {}
                }
            }

            // =========================
            // 5. RIPOTI YA MWISHO FIXED
            // =========================
            let report = `╭━━━〔 ${ui.title} 〕━━━╮\n\n`;
            report += `┃ 👤 USER: @${targetUser.split('@')[0]}\n`;
            report += `┃ 📊 TOTAL GROUPS: ${groupIds.length}\n┣━━━━━━━━━━━━━━━━\n\n`;
            report += `✅ *SUCCESS*: ${success.length}\n`;
            if (success.length > 0) report += success.slice(0, 15).map(g => ` └ ${g}`).join('\n') + (success.length > 15? `\n └...na ${success.length - 15} zingine` : '') + '\n\n';

            report += `📩 *REQUESTED*: ${requested.length}\n`;
            if (requested.length > 0) report += requested.slice(0, 15).map(g => ` └ ${g}`).join('\n') + (requested.length > 15? `\n └...na ${requested.length - 15} zingine` : '') + '\n\n';

            report += `👥 *ALREADY MEMBER*: ${alreadyMember.length}\n`;
            if (alreadyMember.length > 0 && alreadyMember.length <= 10) report += alreadyMember.map(g => ` └ ${g}`).join('\n') + '\n\n';
            else if (alreadyMember.length > 10) report += ` └...${alreadyMember.length} groups\n\n`;

            report += `❌ *FAILED*: ${failed.length}\n`;
            if (failed.length > 0) report += failed.slice(0, 15).map(g => ` └ ${g}`).join('\n') + (failed.length > 15? `\n └...na ${failed.length - 15} zingine` : '') + '\n\n';

            report += `╰━━━━━━━━━━━━━━━━━━╯\n\n⚡ VEX AI SYSTEM`;

            // Tuma ripoti kwa group
            await sock.sendMessage(m.chat, {
                text: report,
                mentions: [targetUser],
                edit: addMsg.key
            });

            // Tuma DM kama kuna request/failed
            if (requested.length > 0 || failed.length > 0) {
                let dmReport = `⚛️ *VEX AI GROUP ADD REPORT*\n\n`;
                dmReport += `User: @${targetUser.split('@')[0]}\n`;
                dmReport += `Total Groups: ${groupIds.length}\n\n`;

                if (success.length > 0) {
                    dmReport += `✅ *SUCCESS ${success.length}:*\n`;
                    dmReport += success.map(g => `• ${g}`).join('\n') + '\n\n';
                }

                if (requested.length > 0) {
                    dmReport += `📩 *REQUESTED ${requested.length}:*\n`;
                    dmReport += requested.map(g => `• ${g}`).join('\n') + '\n\n';
                }

                if (alreadyMember.length > 0) {
                    dmReport += `👥 *ALREADY MEMBER ${alreadyMember.length}*\n\n`;
                }

                if (failed.length > 0) {
                    dmReport += `❌ *FAILED ${failed.length}:*\n`;
                    dmReport += failed.map(g => `• ${g}`).join('\n');
                }

                try {
                    await sock.sendMessage(jid, { text: dmReport, mentions: [targetUser] });
                } catch {}
            }

        } catch (err) {
            console.log("GROUP ERROR:", err);
            return m.reply("❌ System error. Jaribu tena.");
        }
    }
};
