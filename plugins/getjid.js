const translate = require('google-translate-api-x');

module.exports = {
    command: "getjid",
    alias: ["jid", "id"],
    category: "admin",
    description: "Multi-mode JID extractor for any node or context.",

    async execute(m, sock, { args, userSettings }) {
        // 1. EXTRACT PREFERENCES
        const style = userSettings?.style || 'harsh';
        const lang = userSettings?.lang || 'en';
        
        // Tunachukua input kutoka kwa args, au quoted text, au quoted sender
        const input = args[0] || (m.quoted ? (m.quoted.text || m.quoted.sender) : null);

        const modes = {
            harsh: {
                title: "☣️ 𝕯𝕴𝕲𝕴𝕿𝕬𝕷 𝕱𝕴𝕹𝕕𝕰𝕽𝕻𝕽𝕴𝕹𝕿 ☣️",
                label: "🆔 𝕹𝕺𝕯𝕰 𝕵𝕴𝕯:",
                react: "🔍"
            },
            normal: {
                title: "💠 VEX Node Identifier 💠",
                label: "🆔 JID:",
                react: "🔍"
            },
            girl: {
                title: "🫧 𝐿𝓊𝓅𝑒𝓇'𝓈 𝐼𝒟 𝒢𝓁𝒶𝓈𝓈 🫧",
                label: "🆔 𝒿𝒾𝒹:",
                react: "🫧"
            }
        };

        const current = modes[style] || modes.normal;
        let finalJid = "";

        try {
            await sock.sendMessage(m.chat, { react: { text: current.react, key: m.key } });

            // 2. SMART RESOLUTION LOGIC (Mifumo Mingi)
            
            if (m.mentionedJid?.[0]) {
                // Mfumo 1: Ukim-tag mtu
                finalJid = m.mentionedJid[0];
            } 
            else if (m.quoted && !args[0]) {
                // Mfumo 2: Ukireply meseji bila kuandika namba/link (Inachukua sender)
                finalJid = m.quoted.sender;
            }
            else if (input && input.includes('chat.whatsapp.com/')) {
                // Mfumo 3: Group Links
                const code = input.split('chat.whatsapp.com/')[1].split(' ')[0];
                const metadata = await sock.groupGetInviteInfo(code);
                finalJid = metadata.id;
            } 
            else if (input && (input.includes('whatsapp.com/channel/') || input.includes('wa.me/channel/'))) {
                // Mfumo 4: Channel Links
                const parts = input.split('/');
                finalJid = parts[parts.length - 1].split(' ')[0] + "@newsletter";
            } 
            else if (input && !isNaN(input.replace(/[^0-9]/g, '')) && input.length > 5) {
                // Mfumo 5: Raw Numbers (Manual Input)
                finalJid = input.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
            } 
            else {
                // Mfumo 6: DEFAULT (Neno 'jid' tupu)
                // Inatoa ID ya sehemu husika uliyotuma amri
                finalJid = m.chat;
            }

            // Usalama: Hakikisha JID za watu binafsi hazina mabaki ya device code (:1)
            if (finalJid.includes('@s.whatsapp.net') && finalJid.includes(':')) {
                finalJid = finalJid.split(':')[0] + '@s.whatsapp.net';
            }

            // 3. REPORT GENERATION
            let report = `*${current.title}*\n\n`;
            report += `*${current.label}* ${finalJid}`;

            const { text: translatedMsg } = await translate(report, { to: lang });
            await m.reply(translatedMsg);

        } catch (error) {
            console.error("GETJID ERROR:", error);
            const failMsg = style === 'harsh' ? "☣️ SCAN FAILED. NODE IS ENCRYPTED OR DEAD." : "❌ Error: Could not resolve JID.";
            await m.reply(failMsg);
        }
    }
};
