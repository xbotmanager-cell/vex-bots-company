const translate = require('google-translate-api-x');

module.exports = {
    command: "owner",
    category: "system",
    description: "Get developer and owner contact information",
    
    async execute(m, sock, { args, userSettings }) {
        const lang = args[0] && args[0].length === 2 ? args[0] : (userSettings?.lang || 'en');
        const style = userSettings?.style || 'harsh';
        const ownerNumber = "255780470905";
        const ownerName = "Lupin Starnley Jimmoh";

        // VCard Logic
        const vcard = 'BEGIN:VCARD\n'
            + 'VERSION:3.0\n'
            + `FN:Vex Owner\n`
            + `ORG:VEX Engine;\n`
            + `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}\n`
            + 'END:VCARD';

        // Response Matrix with specific Reactions and Styles
        const modes = {
            harsh: {
                text: `*OWNER CONTACT* 🛡️\n\n_Why are you bothering him? Here is the card, now go away._ 🖕`,
                react: "🛡️",
                err: "⚠️ _Can't even fetch a card? You're useless._"
            },
            normal: {
                text: `*OFFICIAL OWNER DATA* 👤\n\n_Below is the contact information for the developer of VEX._ ✅`,
                react: "👤",
                err: "❌ _Failed to retrieve owner information._"
            },
            girl: {
                text: `*MY CREATOR* 🌷✨\n\n_Here is my handsome master's contact. Be nice to him, okay?_ 🎀`,
                react: "🎀",
                err: "📂 _Oopsie! Master's card is missing. Try again later!_ 🌸"
            }
        };

        const currentMode = modes[style] || modes.normal;

        try {
            // Send Reaction
            await sock.sendMessage(m.chat, { react: { text: currentMode.react, key: m.key } });

            if (userSettings?.silent === true) return;

            let finalMessage = currentMode.text;

            // Translation Logic
            if (lang !== 'en') {
                const res = await translate(finalMessage, { to: lang });
                finalMessage = res.text;
            }

            // Send VCard + Message
            await sock.sendMessage(m.chat, { 
                contacts: { 
                    displayName: "Vex Owner", 
                    contacts: [{ vcard }] 
                }
            }, { quoted: m });

            await sock.sendMessage(m.chat, { text: finalMessage }, { quoted: m });

        } catch (error) {
            console.error("Owner Command Error:", error);
            await sock.sendMessage(m.chat, { text: currentMode.err });
        }
    }
};
