// 26PESA PAYMENT MODULE
// Dev: Lupin Starnley (Mr@lupin76)
// Powered by: Google Translate API

const { translate } = require('google-translate-api-x');

module.exports = {
    vex: 'pay',
    cyro: 'monetize',
    nova: 'Provides multi-network payment instructions with auto-translation.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        const network = args[0]?.toLowerCase();
        const lang = args[1]?.toLowerCase() || 'sw'; // Default ni Kiswahili

        if (!network) {
            return m.reply("⚠️ *Usage:* `.pay [voda/tigo/airtel/ttcl] [en/sw]`\nExample: `.pay voda sw` ");
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "💳", key: m.key } });

        let payMsg = "";
        const bizName = "MOSSES TECHNOLOGY HELP COMPANY LIMITED";
        const bizNum = "51330974";

        // Logic ya Mitandao
        switch (network) {
            case 'voda':
            case 'vodacom':
                payMsg = `*MAELEKEZO YA MALIPO (VODACOM)* 🏦\n\n` +
                         `Hatua fupi za kulipia activation fee:\n` +
                         `1. Piga *150*00#\n` +
                         `2. Chagua namba 4 (Lipa kwa M-Pesa)\n` +
                         `3. Chagua namba 4 (Lipa kwa namba)\n` +
                         `4. Ingiza namba ya biashara: *${bizNum}*\n` +
                         `5. Ingiza Kiasi (Activation Fee)\n` +
                         `6. Ingiza namba ya siri na kuthibitisha.\n\n` +
                         `*MUHIMU:* Baada ya kupata SMS ya muamala, rudi kwenye tovuti na bonyeza kitufe cha *"NIMELIPA"*.\n\n` +
                         `*Jina:* ${bizName}`;
                break;

            case 'tigo':
                payMsg = `*MAELEKEZO YA MALIPO (TIGO PESA)* 🏦\n\n` +
                         `Hatua fupi za kulipia:\n` +
                         `1. Piga *150*01#\n` +
                         `2. Chagua namba 5 (Lipa kwa Simu)\n` +
                         `3. Chagua namba 2 (Kwenda namba ya biashara)\n` +
                         `4. Ingiza namba ya biashara: *${bizNum}*\n` +
                         `5. Ingiza Kiasi\n` +
                         `6. Weka namba ya siri kuthibitisha.\n\n` +
                         `*MUHIMU:* Ukimaliza, rudi kwenye dashboard yako na ubonyeza *"NIMELIPA"*.\n\n` +
                         `*Jina:* ${bizName}`;
                break;

            case 'airtel':
                payMsg = `*MAELEKEZO YA MALIPO (AIRTEL MONEY)* 🏦\n\n` +
                         `Hatua fupi za kulipia:\n` +
                         `1. Piga *150*60#\n` +
                         `2. Chagua namba 5 (Lipa Lipa)\n` +
                         `3. Chagua namba 4 (Lipa kwa namba)\n` +
                         `4. Ingiza namba ya biashara: *${bizNum}*\n` +
                         `5. Ingiza Kiasi\n` +
                         `6. Weka namba ya siri kuthibitisha.\n\n` +
                         `*MUHIMU:* Hakikisha unabonyeza *"NIMELIPA"* ili mfumo utambue malipo yako.\n\n` +
                         `*Jina:* ${bizName}`;
                break;

            case 'ttcl':
                payMsg = `*MAELEKEZO YA MALIPO (TTCL T-PESA)* 🏦\n\n` +
                         `Hatua fupi za kulipia:\n` +
                         `1. Piga *150*71#\n` +
                         `2. Chagua namba 4 (Lipa kwa Simu)\n` +
                         `3. Chagua namba 2 (Lipa kwa namba)\n` +
                         `4. Ingiza namba ya biashara: *${bizNum}*\n` +
                         `5. Ingiza Kiasi\n` +
                         `6. Weka namba ya siri uthibitishe.\n\n` +
                         `*MUHIMU:* Baada ya malipo, rudi kwenye tovuti ubonyeze *"NIMELIPA"*.\n\n` +
                         `*Jina:* ${bizName}`;
                break;

            default:
                return m.reply("❌ *Error:* Mtandao haujapatikana. Tumia: voda, tigo, airtel, au ttcl.");
        }

        // 🛡️ MFUMO WA TAFSIRI (Translation Engine)
        try {
            if (lang === 'en') {
                const translated = await translate(payMsg, { to: 'en' });
                payMsg = translated.text;
            }

            // Kutuma Ujumbe wa Malipo
            await sock.sendMessage(m.key.remoteJid, { 
                text: payMsg + `\n\n*© 26Pesa Payment Support*`
            }, { quoted: m });

        } catch (err) {
            console.error("Translation Error:", err);
            // Ikishindikana kutafsiri, tuma original ya Kiswahili
            await sock.sendMessage(m.key.remoteJid, { text: payMsg }, { quoted: m });
        }
    }
};
