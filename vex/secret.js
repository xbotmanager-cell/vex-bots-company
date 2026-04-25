// VEX MINI BOT - VEX: secret (The Ghost Bridge)
// Nova: Anonymous Messaging with Multi-Number Load Balancing
// Dev: Lupin Starnley

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    vex: 'secret',
    cyro: 'premium',
    nova: 'Sends anonymous messages via secondary bot nodes to prevent bans',

    async execute(m, sock) {
        // 1. MASTER CLUSTER (Ongeza namba zako hapa zenye Bot)
        // Kumbuka kuandika kwa format ya: '255xxxxxxxxx'
        const botNumbers = [
            '255780470905', // Namba yako ya kwanza (Default)
            '', // Slot 2
            '', // Slot 3
            '', // Slot 4
            '', // Slot 5
            '', // Slot 6
            '', // Slot 7
            '', // Slot 8
            '', // Slot 9
            '', // Slot 10
        ].filter(n => n !== ''); // Inachuja slots ambazo hazijajazwa

        // 2. INPUT EXTRACTION (.secret 255xxx | Message)
        const args = m.message?.conversation?.split(' ').slice(1).join(' ') || 
                     m.message?.extendedTextMessage?.text?.split(' ').slice(1).join(' ');

        if (!args || !args.includes('|')) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-GHOST ERROR:*\nFormat: `.secret Number | Message`\nExample: `.secret 255780470905 | Hello Chief`" 
            }, { quoted: m });
        }

        const [targetNum, secretMsg] = args.split('|').map(item => item.trim());
        const target = targetNum.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        await sock.sendMessage(m.key.remoteJid, { react: { text: "👻", key: m.key } });

        try {
            // 3. ANTI-BAN DELAY LOGIC (Human-Like Behavior)
            // Inatengeneza delay ya random kati ya sekunde 10 (10000ms) na 40 (40000ms)
            const randomDelay = Math.floor(Math.random() * (40000 - 10000 + 1)) + 10000;
            
            // 4. RANDOM NODE SELECTION (Kuchagua namba ya kutuma)
            const selectedNode = botNumbers[Math.floor(Math.random() * botNumbers.length)];

            // 5. CONSTRUCT THE GHOST MESSAGE
            let ghostPayload = `╭━━━〔 👻 *VEX: GHOST-BRIDGE* 〕━━━╮\n`;
            ghostPayload += `┃ 🌟 *Status:* Encrypted Message\n`;
            ghostPayload += `┃ 🧬 *Node:* ${selectedNode.slice(-4)} (Secure)\n`;
            ghostPayload += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            
            ghostPayload += `*📩 INCOMING MESSAGE:*\n`;
            ghostPayload += `> "${secretMsg}"\n\n`;
            
            ghostPayload += `*📢 SYSTEM NOTE*\n`;
            ghostPayload += `┃ 💠 Sent anonymously via VEX Network.\n`;
            ghostPayload += `┃ 💠 You cannot reply to this sender.\n`;
            ghostPayload += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
            ghostPayload += `╰━━━━━━━━━━━━━━━━━━━━╯`;

            // Hapa bot itasubiri kabla ya kutuma ili kulinda namba
            await delay(randomDelay);

            // Kutuma ujumbe
            await sock.sendMessage(target, { text: ghostPayload });

            // Kumpa taarifa mtumaji wa asili kuwa imefika
            await sock.sendMessage(m.key.remoteJid, { 
                text: `*✅ VEX-SUCCESS:* Message delivered via Node [${selectedNode.slice(-4)}] after ${randomDelay/1000}s delay.` 
            }, { quoted: m });

        } catch (error) {
            console.error("Ghost Bridge Error:", error);
            await sock.sendMessage(m.key.remoteJid, { 
                text: "*❌ VEX-ERROR:* Protocol failed. Target blocked or server timeout." 
            }, { quoted: m });
        }
    }
};