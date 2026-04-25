// VEX MINI BOT - Mail Listener Engine V2
// Nova: Advanced Monitoring for OTPs & Magic Links.
// Dev: Lupin Starnley

const imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;

const config = {
    imap: {
        user: 'lupinstarnley009@gmail.com', // Email yako mama
        password: 'wfgj jfwa bcre nvgj', // App Password yako
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 3000,
        tlsOptions: { rejectUnauthorized: false }
    }
};

// Sehemu ya kuweka JID ya Channel yako (e.g. 123456789@newsletter)
const MY_CHANNEL_JID = 'WEKA_JID_HAPA@newsletter'; 

async function startMailListener(sock) {
    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        console.log("╭━━━〔 VEX MINI BOT 〕━━━╮");
        console.log("┃  MAIL LISTENER V2 ACTIVE  ┃");
        console.log("┃  Monitoring Arsenal...    ┃");
        console.log("╰━━━━━━━━━━━━━━━━━━━━━━━╯");

        setInterval(async () => {
            const searchCriteria = ['UNSEEN'];
            const fetchOptions = { bodies: ['HEADER', 'TEXT'], markSeen: true };

            const messages = await connection.search(searchCriteria, fetchOptions);

            messages.forEach(async (item) => {
                const all = item.parts.find(part => part.which === 'TEXT');
                const header = item.parts.find(part => part.which === 'HEADER');

                simpleParser(all.body, async (err, parsed) => {
                    if (err) return;

                    const from = parsed.from.text;
                    const to = header.body.to[0]; 
                    const subject = parsed.subject;
                    const body = parsed.text || "";
                    const html = parsed.html || "";

                    // 1. SMART SCANNER: Inatafuta OTP (Namba 4-8)
                    const otpMatch = body.match(/\b\d{4,8}\b/);
                    const otpCode = otpMatch ? otpMatch[0] : null;

                    // 2. MAGIC LINK SCANNER: Inatafuta link za uhakiki (Verify/Login/Confirm)
                    const linkMatch = body.match(/https?:\/\/[^\s<>"]+/g);
                    let magicLink = "No Link Detected";
                    
                    if (linkMatch) {
                        // Inatafuta link yenye maneno ya "confirm", "verify", au "login"
                        const importantLink = linkMatch.find(l => 
                            l.toLowerCase().includes('verify') || 
                            l.toLowerCase().includes('confirm') || 
                            l.toLowerCase().includes('magic') ||
                            l.toLowerCase().includes('login')
                        );
                        if (importantLink) magicLink = importantLink;
                    }

                    // 3. Muundo wa Meseji ya Kishua (The Report)
                    let report = `╭━━━〔 *VEX: INCOMING DATA* 〕━━━╮\n`;
                    report += `┃ 🌟 *Status:* Decrypted\n`;
                    report += `┃ 👤 *User Alias:* ${to}\n`;
                    report += `┃ 🏢 *Source:* ${from}\n`;
                    report += `┃ 📝 *Subject:* ${subject}\n`;
                    report += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

                    if (otpCode) {
                        report += `*🔑 AUTHENTICATION CODE*\n`;
                        report += `┃ 💠 *OTP:* [ ${otpCode} ]\n\n`;
                    }

                    if (magicLink !== "No Link Detected") {
                        report += `*🔗 MAGIC ACCESS LINK*\n`;
                        report += `┃ 🛰️ ${magicLink}\n\n`;
                    }

                    report += `*📊 ANALYSIS COMPLETE*\n`;
                    report += `┃ 🛰️ *Time:* ${new Date().toLocaleTimeString()}\n`;
                    report += `┃ 💠 *Security:* Public Exploit\n`;
                    report += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
                    report += `_VEX MINI BOT: Lupin-V1H Arsenal_`;

                    // Kutuma kwenye Channel yako moja kwa moja
                    await sock.sendMessage(MY_CHANNEL_JID, { text: report });
                    console.log(`[✔] Exploit sent for: ${to}`);
                });
            });
        }, 30000); 

    } catch (err) {
        console.error("VEX-MAIL-ERROR:", err);
    }
}

module.exports = { startMailListener };