// 26PESA MONETIZATION MODULE
// Dev: Lupin Starnley (Mr@lupin76)

module.exports = {
    vex: 'join',
    cyro: 'monetize',
    nova: 'Provides professional 26Pesa registration links and instructions.',

    async execute(m, sock) {
        const args = m.text.trim().split(/ +/).slice(1);
        const lang = args[0]?.toLowerCase();
        const myLink = "https://26pesa.store/page/reg.php?reg=Mr@lupin76";

        if (!lang) return m.reply("⚠️ *Usage:* `.join en` (English) or `.join sw` (Swahili)");

        let message = "";

        if (lang === 'en') {
            message = `*Welcome to 26Pesa Digital Opportunities* 🚀\n\n` +
                      `You have been personally invited by *Mr@lupin76* to join a verified platform for digital monetization.\n\n` +
                      `*How to Get Started:*\n` +
                      `To create your account and start earning, please follow these simple steps:\n\n` +
                      `*1. Access the Portal:* Click the official registration link below:\n` +
                      `🔗 ${myLink}\n\n` +
                      `*2. Fill the Form:* Enter the following details accurately:\n` +
                      `◈ *Email Address:* Your active email for notifications.\n` +
                      `◈ *Phone Number:* Your primary mobile money number.\n` +
                      `◈ *Card Name:* The official name registered on your phone number.\n` +
                      `◈ *Username:* Create a unique name for your profile.\n` +
                      `◈ *Password:* Must be 4-20 characters long.\n` +
                      `◈ *Country:* Select your current residence.\n\n` +
                      `*3. Complete Registration:* Click the "Sign Up" button to agree to the terms and activate your account.\n\n` +
                      `*MOSSES TECHNOLOGY HELP COMPANY LIMITED*\n` +
                      `*Secure | Transparent | Profitable*\n` +
                      `© 26Pesa Policy Status.`;
        } else if (lang === 'sw') {
            message = `*Karibu 26Pesa - Fursa za Kidijitali* 🚀\n\n` +
                      `Umealikwa rasmi na *Mr@lupin76* kujiunga na jukwaa lililothibitishwa la kutengeneza kipato mtandaoni.\n\n` +
                      `*Jinsi ya Kuanza:*\n` +
                      `Ili kutengeneza akaunti yako na kuanza kupata faida, fuata hatua hizi rahisi:\n\n` +
                      `*1. Fungua Tovuti:* Bonyeza link rasmi ya usajili hapa chini:\n` +
                      `🔗 ${myLink}\n\n` +
                      `*2. Jaza Fomu:* Ingiza taarifa zifuatazo kwa usahihi:\n` +
                      `◈ *Email Address:* Barua pepe yako inayofanya kazi.\n` +
                      `◈ *Phone Number:* Namba yako ya simu ya miamala.\n` +
                      `◈ *Card Name:* Jina lako kamili lililosajiliwa kwenye namba ya simu.\n` +
                      `◈ *Username:* Chagua jina la kipekee la utambulisho (user).\n` +
                      `◈ *Password:* Nywila ya herufi 4 mpaka 20.\n` +
                      `◈ *Country:* Chagua nchi unayoishi.\n\n` +
                      `*3. Kamilisha Usajili:* Bonyeza kitufe cha "Sign Up" kukubaliana na vigezo na kuwasha akaunti yako.\n\n` +
                      `*MOSSES TECHNOLOGY HELP COMPANY LIMITED*\n` +
                      `*Usalama | Uwazi | Faida*\n` +
                      `© 26Pesa Mfumo wa Sera.`;
        } else {
            return m.reply("❌ *Error:* Invalid language. Use `.join en` or `.join sw`.");
        }

        // Tunatuma ujumbe bila jina la bot ili uwe rasmi (Professional)
        await sock.sendMessage(m.key.remoteJid, { text: message }, { quoted: m });
    }
};
