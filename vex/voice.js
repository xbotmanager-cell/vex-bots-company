// VEX MINI BOT - VEX: say
// Nova: Neural Speech Synthesizer
// Dev: Lupin Starnley

const axios = require('axios');

module.exports = {
    vex: 'say',
    cyro: 'tools',
    nova: 'Converts text or replied message to high-quality AI voice',

    async execute(m, sock) {
        // 1. KUPATA MAELEZO (Kutoka mbele ya command au kwenye reply)
        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || "";
        const argsText = m.message?.conversation?.split(' ').slice(1).join(' ') || 
                         m.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ');
        
        // Inachukua kilichopo mbele ya command, isipokuwepo inaangalia kwenye reply
        const textToSay = argsText || quotedText;

        if (!textToSay) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Please provide text or reply to a message to convert to voice!" 
            }, { quoted: m });
        }

        const sender = m.sender || m.key.participant || m.key.remoteJid;
        await sock.sendMessage(m.key.remoteJid, { react: { text: "🗣️", key: m.key } });

        // 2. ELEVENLABS LOGIC (Neural Engine)
        try {
            const response = await axios({
                method: 'post',
                url: 'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', // Rachel Voice ID
                headers: {
                    'accept': 'audio/mpeg',
                    'xi-api-key': 'sk_6fecf6122c7e88c9293bf97364f02f6b8114eaaa646beead',
                    'Content-Type': 'application/json',
                },
                data: { 
                    text: textToSay, 
                    model_id: "eleven_monolingual_v1", 
                    voice_settings: { stability: 0.5, similarity_boost: 0.5 } 
                },
                responseType: 'arraybuffer'
            });

            // 3. DESIGN YA REPORT (Iliyoandaliwa kwa ajili ya log)
            let voiceMsg = `╭━━━〔 🗣️ *VEX: VOICE-GEN* 〕━━━╮\n`;
            voiceMsg += `┃ 🌟 *Status:* Audio Synthesized\n`;
            voiceMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
            voiceMsg += `┃ 🧬 *Engine:* Eleven-Neural-V1H\n`;
            voiceMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            voiceMsg += `*🎙️ SPEECH ANALYSIS*\n`;
            voiceMsg += `| ◈ *Content:* ${textToSay.substring(0, 15)}... |\n`;
            voiceMsg += `| ◈ *Format:* MP3 High-Res |\n`;
            voiceMsg += `| ◈ *Stability:* Optimized 🛡️ |\n\n`;

            voiceMsg += `*📢 SYSTEM NOTE*\n`;
            voiceMsg += `┃ 💠 Voice stream is ready for playback.\n`;
            voiceMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            voiceMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            voiceMsg += `_VEX MINI BOT: Privacy is Power_`;

            // 4. KUTUMA AUDIO (Kama Voice Note/PTT)
            await sock.sendMessage(m.key.remoteJid, { 
                audio: Buffer.from(response.data), 
                mimetype: 'audio/mpeg', 
                ptt: true // Inatuma kama voice note
            }, { quoted: m });

            // Tuma na ile report ya mabox kama text ya ziada
            await sock.sendMessage(m.key.remoteJid, { text: voiceMsg, mentions: [sender] });

        } catch (error) {
            console.error("Voice Generation Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Neural voice interface failed to respond." 
            }, { quoted: m });
        }
    }
};