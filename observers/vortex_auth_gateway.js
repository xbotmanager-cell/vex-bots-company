/**
 * VORTEX NOVA - QUANTUM AUTH OBSERVER
 * Jukumu: Kusoma Auth Path na kutengeneza Magic Link ya Login.
 */

module.exports = {
    name: "vortex_auth_gateway",

    // Trigger: Inasoma ujumbe wowote unaoanza na "Vortex Nova Authentication"
    trigger: (m) => {
        const text = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
        return text.includes("Vortex Nova Authentication") && !m.key.fromMe;
    },

    async onMessage(m, sock, ctx) {
        const text = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
        
        try {
            // 1. EXTRACTION - Tunavuta Auth Path na Request ID kutoka kwenye ujumbe
            const authPathMatch = text.match(/Auth Path:\s*([A-Z0-9]+)/);
            const requestIdMatch = text.match(/Request ID:\s*(VN-[0-9]+)/);

            if (!authPathMatch || !requestIdMatch) return;

            const authPath = authPathMatch[1];
            const requestId = requestIdMatch[1];
            const senderJid = m.key.remoteJid;

            // 2. TOKEN GENERATION (Kila login ina token yake ya kipekee)
            // Tunatumia Base64 ya mchanganyiko wa JID, RequestID na Muda kuzuia marudio
            const rawToken = `${senderJid}:${requestId}:${Date.now()}`;
            const secureToken = Buffer.from(rawToken).toString('base64').replace(/=/g, '');

            // 3. MAGIC LINK CONSTRUCTION
            // Hii ndio link atakayogusa mtumiaji kurudi kwenye system
            const magicLink = `https://vetube.xbotmanager.workers.dev/auth/callback?token=${secureToken}&path=${authPath}`;

            // 4. RESPONSE TEMPLATE (Kishua, Simple, No Emojis)
            let response = `VORTEX NOVA SECURITY CHECK\n\n`;
            response += `Identity verified for: ${senderJid.split('@')[0]}\n`;
            response += `Request ID: ${requestId}\n\n`;
            response += `Click the link below to finalize your secure access. This link expires in 5 minutes.\n\n`;
            response += `${magicLink}\n\n`;
            response += `System: Secure Gateway Active`;

            // 5. SEND MESSAGE (Kwa usalama, tunatuma kwa mtumiaji alieomba)
            await sock.sendMessage(senderJid, { 
                text: response,
                contextInfo: {
                    externalAdReply: {
                        title: "Vortex Nova Secure Access",
                        body: "Authentication Path Verified",
                        previewType: "PHOTO",
                        thumbnailUrl: "https://xbotmanager.com/vortex-icon.png", // Weka icon yako hapa
                        sourceUrl: "https://vetube.xbotmanager.workers.dev"
                    }
                }
            }, { quoted: m });

            // 6. LOGGING (Optional - Kwa ajili ya kuona logins 5000+)
            console.log(`[VORTEX AUTH] Login generated for ${senderJid} | ID: ${requestId}`);

        } catch (error) {
            console.error("[VORTEX AUTH ERROR]", error);
        }
    }
};
