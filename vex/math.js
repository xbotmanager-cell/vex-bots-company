// VEX MINI BOT - VEX: calc
// Nova: High-level mathematical engine with graph support.
// Dev: Lupin Starnley

const { evaluate } = require('mathjs');
const path = require('path');
const fs = require('fs');

module.exports = {
    vex: 'calc',           
    cyro: 'tools',         
    nova: 'Solves complex math equations and generates function graphs',

    async execute(m, sock) {
        // 1. ⚛️ UNIQUE REACTION
        await sock.sendMessage(m.key.remoteJid, { react: { text: "⚛️", key: m.key } });

        const args = m.text.trim().split(/ +/).slice(1);
        const expression = args.join(' ');

        if (!expression) {
            const warningMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n` +
                               `┃ ⚠️ *Status:* Warning\n` +
                               `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                               `*❌ MISSING EQUATION ❌*\n` +
                               `| ◈ *Usage:* .calc [equation] |\n` +
                               `| ◈ *Example:* .calc 2 + 5 * 10 |\n` +
                               `| ◈ *Graph:* .calc plot sin(x) |\n\n` +
                               `_VEX MINI BOT: Scientific Engine_`;
            return await sock.sendMessage(m.key.remoteJid, { text: warningMsg }, { quoted: m });
        }

        try {
            const sender = m.sender;
            let resultText = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n`;
            resultText += `┃ 🌟 *Status:* Solved\n`;
            resultText += `┃ 👤 *Master:* Lupin Starnley\n`;
            resultText += `┃ 🧬 *Engine:* Math-Quantum V1\n`;
            resultText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

            // LOGIC: Check if user wants a graph (plot)
            if (expression.toLowerCase().startsWith('plot ')) {
                const func = expression.slice(5);
                const chartUrl = `https://chart.googleapis.com/chart?cht=tx&chl=${encodeURIComponent(func)}`;
                // Alternative graph generator (QuickChart)
                const graphUrl = `https://quickchart.io/chart?c={type:'line',data:{labels:[1,2,3,4,5],datasets:[{label:'Function',data:[1,4,9,16,25]}]}}`;
                
                resultText += `Hello @${sender.split('@')[0]}, function rendered!\n\n`;
                resultText += `✨ *CYRO: TOOLS* ✨\n`;
                resultText += `| ◈ *Function:* ${func} |\n`;
                resultText += `| ◈ *Category:* Graphical Representation |\n\n`;
                resultText += `_VEX MINI BOT: Visualizing Logic_`;

                return await sock.sendMessage(m.key.remoteJid, { 
                    image: { url: `https://api.chart-img.com/v1/graph?formula=${encodeURIComponent(func)}` }, 
                    caption: resultText,
                    mentions: [sender]
                }, { quoted: m });
            }

            // Standard Math Evaluation
            const result = evaluate(expression);
            
            resultText += `Hello @${sender.split('@')[0]}, equation solved!\n\n`;
            resultText += `✨ *CYRO: TOOLS* ✨\n`;
            resultText += `| ◈ *Query:* ${expression} |\n`;
            resultText += `| ◈ *Result:* ${result} |\n\n`;
            
            resultText += `*📊 CALC INFO*\n`;
            resultText += `┃ 💠 *Library:* MathJS Neural\n`;
            resultText += `┃ 🛰️ *Precision:* High-Density\n`;
            resultText += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
            resultText += `_VEX MINI BOT: Mathematical Precision_`;

            const botImageUrl = path.join(__dirname, '../assets/images/vex.png');
            await sock.sendMessage(m.key.remoteJid, { 
                image: { url: botImageUrl }, 
                caption: resultText,
                mentions: [sender]
            }, { quoted: m });

        } catch (e) {
            const errorMsg = `╭━━━〔 *VEX MINI BOT* 〕━━━╮\n` +
                             `┃ ⚠️ *Status:* Error\n` +
                             `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
                             `*❌ CALCULATION FAILED ❌*\n` +
                             `| ◈ *Reason:* Invalid Mathematical Syntax |\n` +
                             `| ◈ *Solution:* Check your symbols (e.g., *, /, ^) |`;
            await sock.sendMessage(m.key.remoteJid, { text: errorMsg }, { quoted: m });
        }
    }
};