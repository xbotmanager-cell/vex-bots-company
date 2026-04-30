const translate = require('google-translate-api-x');

module.exports = {
    command: "contact",
    alias: ["getcontacts", "harvest", "vcf"],
    category: "tools",
    description: "Export all saved and unsaved contacts from the bot's database",

    async execute(m, sock, { userSettings }) {
        const style = userSettings?.style?.value || 'harsh';
        
        // Fetching all contacts from the bot's store/memory
        const contacts = Object.values(sock.contacts || {});
        const totalContacts = contacts.length;

        const modes = {
            harsh: {
                title: "☘️ 𝖁𝕰𝖃 𝕮𝕺𝕹𝕿𝕬𝕮𝕿 𝕰𝖃𝕻𝕷𝕺𝕴𝕿𝕰𝕽 ☘️",
                start: `☘️ 𝕴𝖓𝖎𝖙𝖎𝖆𝖙𝖎𝖓𝖌 𝖉𝖆𝖙𝖆 𝖊𝖝𝖕𝖑𝖔𝖎𝖙... 𝕾𝖙𝖊𝖆𝖑𝖎𝖓𝖌 ${totalContacts} 𝖈𝖔𝖓𝖙𝖆𝖈𝖙𝖘. 𝕯𝖔𝖓'𝖙 𝖇𝖑𝖎𝖓𝖐. ☘️`,
                file: "☘️ 𝖀𝖘𝖊𝖑𝖊𝖘𝖘_𝕻𝖊𝖔𝖕𝖑𝖊_𝕷𝖎𝖘𝖙.𝖛𝖈𝖋 ☘️",
                react: "☘️"
            },
            normal: {
                title: "💠 VEX System Contact Export 💠",
                start: `💠 Analyzing database... Found ${totalContacts} entries. Exporting now.`,
                file: "💠 Bot_Contact_Backup.vcf 💠",
                react: "💠"
            },
            girl: {
                title: "🌸 𝐿𝓊𝓅𝒾𝓃'𝓈 𝒮𝑒𝒸𝓇𝑒𝓉 𝒜𝒹𝒹𝓇𝑒𝓈𝓈 𝐵𝑜𝑜𝓀 🌸",
                start: `🌸 𝒪𝒽! 𝐼 𝒻𝑜𝓊𝓃𝒹 ${totalContacts} 𝒻𝓇𝒾𝑒𝓃𝒹𝓈 𝒾𝓃 𝓎𝑜𝓊𝓇 𝓁𝒾𝓈𝓉. 𝒮𝒶𝓋𝒾𝓃𝑔 𝓉𝒽𝑒𝓂 𝒻𝑜𝓇 𝓎𝑜𝓊! 🌸`,
                file: "🌸 𝑀𝓎_𝒮𝓌𝑒𝑒𝓉_𝒞𝑜𝓃𝓉𝒶𝒸𝓉𝓈.𝒱𝒸𝒻 🌸",
                react: "🌸"
            }
        };

        const current = modes[style] || modes.normal;
        await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

        // Phase 1: Notify the user about the harvest
        const { text: translatedStart } = await translate(current.start, { to: 'en' });
        await m.reply(`*${current.title}*\n\n${translatedStart}`);

        // Phase 2: Building the VCF (Virtual Contact File)
        let vcfContent = "";
        let textList = `*${current.title}*\n\n`;

        contacts.forEach((contact, index) => {
            const name = contact.name || contact.verifiedName || contact.pushName || `Unknown User ${index + 1}`;
            const jid = contact.id.split('@')[0];
            
            // Build VCF string
            vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;type=CELL;type=VOICE;waid=${jid}:+${jid}\nEND:VCARD\n`;
            
            // Build Text List for immediate viewing (limited to first 50 to avoid ban)
            if (index < 50) {
                textList += `${index + 1}. 👤 *Name:* ${name}\n📱 *Number:* ${jid}\n\n`;
            }
        });

        // Phase 3: Anti-Ban Safe Delivery
        try {
            // Send the text list first
            const { text: translatedList } = await translate(textList, { to: 'en' });
            await sock.sendMessage(m.chat, { text: translatedList });

            // Small delay before sending the full file
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Send the complete VCF file
            await sock.sendMessage(m.chat, {
                document: Buffer.from(vcfContent),
                fileName: current.file,
                mimetype: "text/vcard",
                caption: `✅ Total Contacts Exported: ${totalContacts}`
            }, { quoted: m });

        } catch (error) {
            console.error("Contact Export Error:", error);
            await m.reply("⚠️ Failed to generate contact file.");
        }
    }
};
