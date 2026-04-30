/**
 * VEX PLUGIN: CONTACT EXPLOITER (MILLION POWER)
 * Feature: Group Scraper + Chat History Scraper + Store
 * Dev: Lupin Starnley
 */

const translate = require('google-translate-api-x');

module.exports = {
    command: "contact",
    alias: ["getcontacts", "harvest", "vcf"],
    category: "tools",
    description: "Export all contacts from Groups, Chats, and Memory",

    async execute(m, sock, { userSettings }) {
        const style = userSettings?.style?.value || 'harsh';
        await sock.sendMessage(m.chat, { react: { text: "📥", key: m.key } });

        // Njia ya 1: Pata contacts kutoka kwenye Memory (sock.contacts)
        let rawContacts = Object.values(sock.contacts || {});
        let contactMap = new Map();

        // Ongeza za kwenye memory kwanza
        rawContacts.forEach(c => {
            if (c.id) contactMap.set(c.id, c.name || c.verifiedName || c.pushName || c.id.split('@')[0]);
        });

        // Njia ya 2: Scrape kutoka kwenye Groups zote (Hapa ndipo kuna watu wengi)
        try {
            const groups = await sock.groupFetchAllParticipating();
            Object.values(groups).forEach(group => {
                group.participants.forEach(p => {
                    if (!contactMap.has(p.id)) {
                        contactMap.set(p.id, p.id.split('@')[0]);
                    }
                });
            });
        } catch (e) { console.log("Group scrape failed, skipping..."); }

        const totalContacts = contactMap.size;

        const modes = {
            harsh: {
                title: "☘️ 𝖁𝕰𝖃 𝕮𝕺𝕹𝕿𝕬𝕮𝕿 𝕰𝖃𝕻𝕷𝕺𝕴𝕿𝕰𝕽 ☘️",
                start: `☘️ Executing deep harvest... Found ${totalContacts} targets. Scrambling data! ☘️`,
                file: "VEX_EXPLOIT_LIST.vcf",
                react: "☘️"
            },
            normal: {
                title: "💠 VEX Contact Backup 💠",
                start: `💠 Database scan complete. Found ${totalContacts} contacts. Generating VCF...`,
                file: "Bot_Backup.vcf",
                react: "💠"
            },
            girl: {
                title: "🌸 𝐿𝓊𝓅𝒾𝓃'𝓈 𝐹𝓇𝒾𝑒𝓃𝒹𝓈𝒽𝒾𝓅 𝐵𝑜𝑜𝓀 🌸",
                start: `🌸 Yay! I found ${totalContacts} beautiful souls to save! 🌸`,
                file: "Sweet_Friends.vcf",
                react: "🌸"
            }
        };

        const current = modes[style] || modes.normal;
        await m.reply(current.start);

        // Phase 2: Building the VCF
        let vcfContent = "";
        let listText = `*${current.title}*\n\n`;
        let count = 0;

        contactMap.forEach((name, jid) => {
            count++;
            const cleanJid = jid.split('@')[0];
            // Format ya VCF
            vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;type=CELL;type=VOICE;waid=${cleanJid}:+${cleanJid}\nEND:VCARD\n`;
            
            // Preview ya namba 20 za mwanzo
            if (count <= 20) {
                listText += `${count}. 👤 ${name} (+${cleanJid})\n`;
            }
        });

        try {
            // Tuma list fupi kwanza
            await sock.sendMessage(m.chat, { text: listText + `\n_And ${totalContacts - 20} more..._` });

            // Tuma file la VCF
            await sock.sendMessage(m.chat, {
                document: Buffer.from(vcfContent),
                fileName: current.file,
                mimetype: "text/vcard",
                caption: `✅ *VEX HARVEST COMPLETE*\nTotal: ${totalContacts} Contacts`
            }, { quoted: m });

        } catch (error) {
            console.error("Export Error:", error);
            await m.reply("⚠️ Error: File was too large or system failed.");
        }
    }
};
