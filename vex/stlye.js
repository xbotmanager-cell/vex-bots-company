// VEX MINI BOT - VEX: style
// Nova: Typography & Font Architect
// Dev: Lupin Starnley

module.exports = {
    vex: 'style',
    cyro: 'tools',
    nova: 'Converts normal text into various fancy font styles',

    async execute(m, sock) {
        // 1. KUPATA MAELEZO (Kutoka mbele ya command au kwenye reply)
        const quotedMsg = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text || "";
        
        // Fix: Simplified argument extraction
        const argsText = m.text?.trim().split(/ +/).slice(1).join(' ');
        
        const textToStyle = argsText || quotedText;

        if (!textToStyle) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-ERROR:* Please provide text or reply to a message to style it!\nExample: `.style VEX BOT`" 
            }, { quoted: m });
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "✍️", key: m.key } });

        // 2. FONT STYLING LOGIC
        const styler = (text) => {
            const fonts = {
                bold: text.toUpperCase().split('').map(char => "ABCDEFGHIJKLMNOPQRSTUVWXYZ".includes(char) ? String.fromCodePoint(char.charCodeAt(0) + 120211) : char).join(''),
                monospace: "```" + text + "```",
                italic: "_" + text + "_",
                fancy: text.toLowerCase().split('').map(char => {
                    const map = {
                        'a': 'α', 'b': 'в', 'c': '¢', 'd': '∂', 'e': 'є', 'f': 'ƒ', 'g': 'g', 'h': 'н', 'i': 'ι', 'j': 'נ',
                        'k': 'к', 'l': 'ℓ', 'm': 'м', 'n': 'η', 'o': 'σ', 'p': 'ρ', 'q': 'q', 'r': 'я', 's': 'ѕ', 't': 'т',
                        'u': 'υ', 'v': 'ν', 'w': 'ω', 'x': 'χ', 'y': 'у', 'z': 'z'
                    };
                    return map[char] || char;
                }).join('')
            };
            return fonts;
        };

        const styled = styler(textToStyle);

        // 3. CONSTRUCTING THE REPORT (Design ya Mabox) - FIXED SYNTAX ERRORS
        const sender = m.sender || m.key.participant || m.key.remoteJid;
        let styleMsg = `╭━━━〔 ✍️ *VEX: STYLE-GEN* 〕━━━╮\n`;
        styleMsg += `┃ 🌟 *Status:* Fonts Rendered\n`;
        styleMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
        styleMsg += `┃ 🧬 *Engine:* Typography-V1\n`;
        styleMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        styleMsg += `*✨ FANCY RESULTS*\n`;
        styleMsg += `*1.* ${styled.monospace}\n`;
        styleMsg += `*2.* ${styled.fancy}\n`;
        styleMsg += `*3.* ${styled.italic}\n\n`;

        styleMsg += `*📊 SPECS ANALYSIS*\n`;
        styleMsg += `| ◈ *Input:* ${textToStyle.substring(0, 10)}... |\n`;
        styleMsg += `| ◈ *Styles:* 3 Unique Filters |\n\n`;

        styleMsg += `*📢 DESIGNER TIP*\n`;
        styleMsg += `┃ 💠 Copy your favorite style and use it anywhere.\n`;
        styleMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
        styleMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        styleMsg += `_VEX MINI BOT: Privacy is Power_`;

        // 4. SEND MESSAGE
        await sock.sendMessage(m.key.remoteJid, { text: styleMsg, mentions: [sender] }, { quoted: m });
    }
};
