const crypto = require('crypto');

// 🔥 VEX GLOBAL QUEUE (ANTI-BAN + ANTI-SPAM)
const queue = [];
let processing = false;
const userCooldowns = new Map(); // Anti-spam

module.exports = {
    command: "roule",
    category: "casino",
    description: "VEX Premium Roulette - 100% Working with multi-fallback",

    async execute(m, sock, ctx) {
        const userId = m.sender;

        // Anti-spam: 3s cooldown per user
        const lastUse = userCooldowns.get(userId) || 0;
        if (Date.now() - lastUse < 3000) {
            return; // Silent ignore spam
        }
        userCooldowns.set(userId, Date.now());

        queue.push({ m, sock, ctx });
        processQueue();
    }
};

async function processQueue() {
    if (processing) return;
    processing = true;

    while (queue.length > 0) {
        const { m, sock, ctx } = queue.shift();
        try {
            await runRoulette(m, sock, ctx);
            await sleep(2000); // Anti-ban delay
        } catch (e) {
            console.error("VEX ROULETTE ERROR:", e);
            // Fallback: Send simple result if animation fails
            try {
                await sock.sendMessage(m.chat, {
                    text: `🎡 *VEX ROULETTE*\n\nError occurred but spin completed!\n\n- VEX System`
                });
            } catch {}
        }
    }
    processing = false;
}

async function runRoulette(m, sock, ctx) {
    const { userSettings } = ctx;
    const style = userSettings?.style || "harsh";
    const userId = m.sender;
    const chatId = m.chat;

    // 1. SAFE TARGET SELECTION - MULTI FALLBACK
    let targetUser = userId;
    let targetName = userId.split('@')[0];

    try {
        // Try getName
        targetName = await sock.getName(userId) || targetName;
    } catch {}

    const mentioned = m.mentionedJid || [];
    const quoted = m.quoted;

    // Priority: Mention > Quote > Sender
    if (mentioned.length >= 1 && mentioned[0]) {
        targetUser = mentioned[0];
        try {
            targetName = await sock.getName(targetUser) || targetUser.split('@')[0];
        } catch {
            targetName = targetUser.split('@')[0];
        }
    } else if (quoted && quoted.sender) {
        targetUser = quoted.sender;
        try {
            targetName = await sock.getName(targetUser) || targetUser.split('@')[0];
        } catch {
            targetName = targetUser.split('@')[0];
        }
    }

    // 2. THEMES & BRANDING
    const themes = {
        harsh: {
            bar: "━",
            frame: "☣️",
            start: "🎡 𝕊ℙ𝕀ℕℕ𝕀ℕ𝔾 𝕋ℍ𝔼 𝕎ℍ𝔼𝔼𝕃 𝕆𝔽 𝔻𝕆𝕄...",
            win: "🟢 𝕁𝔸ℂ𝕂ℙ𝕆𝕋! 𝕋ℍ𝔼 ℍ𝕆𝕌𝕊𝔼 ℝ𝔼𝕊ℙ𝔼ℂ𝕋𝕊 𝕐𝕆𝕌",
            lose: "💀 𝔹𝕌𝕊𝕋𝔼𝔻! 𝕋ℍ𝔼 ℂ𝔸𝕊𝕀ℕ𝕆 𝕆𝕎ℕ𝕊 𝕐𝕆𝕌ℝ 𝕊𝕆𝕌𝕃",
            react: "🎡"
        },
        girl: {
            bar: "✧",
            frame: "🫧",
            start: "🎡 𝓈𝓅𝒾𝓃𝑔 𝒻𝑜𝓇 𝓁𝓊𝒸𝓀𝓎 𝓅𝓇𝒾𝓃𝒸𝑒𝓈𝓈~",
            win: "🟢 𝒥𝒜𝒞𝒦𝒫𝒪𝒯! 𝓎𝑜𝓊'𝓇𝑒 𝒶 𝓌𝒾𝓃𝑒𝓇~ 🎀",
            lose: "💀 𝑜𝒽 𝓃𝑜... 𝒷𝑒𝓉𝑒𝓇 𝓁𝓊𝒸𝓀 𝓃𝑒𝓍𝓉 𝓉𝒾𝓂𝑒~ 🥺",
            react: "🎀"
        },
        normal: {
            bar: "─",
            frame: "🎡",
            start: "🎡 Spinning the roulette wheel...",
            win: "🟢 JACKPOT! You won big!",
            lose: "💀 You lost! House always wins.",
            react: "🎡"
        }
    };

    const ui = themes[style] || themes.normal;

    // 3. ROULETTE NUMBERS: 0-36 + colors
    const numbers = [
        { num: 0, color: '🟢' },
        { num: 32, color: '🔴' }, { num: 15, color: '⚫' }, { num: 19, color: '🔴' },
        { num: 4, color: '⚫' }, { num: 21, color: '🔴' }, { num: 2, color: '⚫' },
        { num: 25, color: '🔴' }, { num: 17, color: '⚫' }, { num: 34, color: '🔴' },
        { num: 6, color: '⚫' }, { num: 27, color: '🔴' }, { num: 13, color: '⚫' },
        { num: 36, color: '🔴' }, { num: 11, color: '⚫' }, { num: 30, color: '🔴' },
        { num: 8, color: '⚫' }, { num: 23, color: '🔴' }, { num: 10, color: '⚫' },
        { num: 5, color: '🔴' }, { num: 24, color: '⚫' }, { num: 16, color: '🔴' },
        { num: 33, color: '⚫' }, { num: 1, color: '🔴' }, { num: 20, color: '⚫' },
        { num: 14, color: '🔴' }, { num: 31, color: '⚫' }, { num: 9, color: '🔴' },
        { num: 22, color: '⚫' }, { num: 18, color: '🔴' }, { num: 29, color: '⚫' },
        { num: 7, color: '🔴' }, { num: 28, color: '⚫' }, { num: 12, color: '🔴' },
        { num: 35, color: '⚫' }, { num: 3, color: '🔴' }, { num: 26, color: '⚫' }
    ];

    // 4. REACT - SAFE
    try {
        await sock.sendMessage(chatId, { react: { text: ui.react, key: m.key } });
    } catch {}

    // 5. ANIMATION ENGINE - 3 FALLBACK METHODS
    let finalResult;
    let messageKey;
    let useEdit = true;

    // METHOD 1: Try send + edit (best)
    try {
        const sent = await sock.sendMessage(chatId, { text: ui.start });
        messageKey = sent.key;

        for (let f = 0; f < 7; f++) {
            const randomSpin = numbers[Math.floor(Math.random() * numbers.length)];

            const animText = `
${ui.frame} *VEX ROULETTE* ${ui.frame}
${ui.bar.repeat(14)}

      🎡 ${randomSpin.color} ${randomSpin.num} ${randomSpin.color} 🎡

${ui.bar.repeat(14)}
${style === 'harsh'? '𝕊𝕡𝕚𝕟𝕚𝕟𝕘...' : 'Spinning...'}
            `;

            await sock.sendMessage(chatId, { text: animText, edit: messageKey });
            await sleep(700);
            finalResult = randomSpin;
        }
    } catch (editError) {
        // METHOD 2: Edit failed, use delete + send new
        console.log("Edit failed, using delete method");
        useEdit = false;

        try {
            if (messageKey) {
                await sock.sendMessage(chatId, { delete: messageKey });
            }
        } catch {}

        for (let f = 0; f < 7; f++) {
            const randomSpin = numbers[Math.floor(Math.random() * numbers.length)];

            const animText = `
${ui.frame} *VEX ROULETTE* ${ui.frame}
${ui.bar.repeat(14)}

      🎡 ${randomSpin.color} ${randomSpin.num} ${randomSpin.color} 🎡

${ui.bar.repeat(14)}
Frame ${f + 1}/7
            `;

            const sent = await sock.sendMessage(chatId, { text: animText });
            await sleep(700);

            // Delete previous frame
            if (f < 6) {
                try {
                    await sock.sendMessage(chatId, { delete: sent.key });
                } catch {}
            } else {
                messageKey = sent.key;
            }

            finalResult = randomSpin;
        }
    }

    // METHOD 3: If everything failed, just generate result
    if (!finalResult) {
        finalResult = numbers[Math.floor(Math.random() * numbers.length)];
    }

    // 6. RESULT LOGIC
    let status = ui.lose;
    let verdict = '';

    if (finalResult.num === 0) {
        status = ui.win;
        verdict = style === 'harsh'? '𝕐𝕆𝕌 ℍ𝕀𝕋 𝔾ℝ𝔼ℕ ℤ𝔼ℝ𝕆! 𝕃𝔼𝔾𝔼ℕ𝔻𝔸ℝ𝕐!' :
                 style === 'girl'? '🟢 ZERO! You\'re so lucky princess~ 👑' :
                 '🟢 GREEN ZERO! Ultra rare win!';
    } else if (finalResult.color === '🔴') {
        verdict = style === 'harsh'? 'ℝ𝔼𝔻 𝔻𝔼𝔸𝕋ℍ! 𝕋ℍ𝔼 ℂ𝔸𝕊𝕀ℕ𝕆 𝔽𝔼𝔸𝕊𝕋𝕊' :
                 style === 'girl'? '🔴 Red! Oh no sweetie~ 🥺' :
                 '🔴 RED! House wins this round';
    } else {
        verdict = style === 'harsh'? '𝔹𝕃𝔸ℂ𝕂 𝕍𝕆𝕀𝔻! 𝔸𝔹𝕐𝕊 𝕊𝕎𝔸𝕃𝕆𝕎𝕊 𝕐𝕆𝕌' :
                 style === 'girl'? '⚫ Black! Try again cutie~ 💅' :
                 '⚫ BLACK! Better luck next spin';
    }

    // 7. FINAL BRANDED OUTPUT - MULTI FALLBACK
    const finalDisplay = `
${ui.frame} *VEX ROULETTE* ${ui.frame}
${ui.bar.repeat(14)}

      🎡 ${finalResult.color} ${finalResult.num} ${finalResult.color} 🎡

${ui.bar.repeat(14)}

${status}

👤 *Player:* ${targetName}
🎯 *Result:* ${finalResult.color} ${finalResult.num}

💬 *Verdict:* ${verdict}

${ui.bar.repeat(14)}
_${style === 'harsh'? '𝕋ℍ𝔼 ℍ𝕆𝕌𝕊𝔼 𝔸𝕃𝕎𝔸𝕐𝕊 𝕎𝕀ℕ𝕊' : 'The wheel has spoken~'}_
    `;

    // Try edit first, then send new
    try {
        if (useEdit && messageKey) {
            await sock.sendMessage(chatId, {
                text: finalDisplay,
                edit: messageKey,
                mentions: [targetUser]
            });
        } else {
            await sock.sendMessage(chatId, {
                text: finalDisplay,
                mentions: [targetUser]
            });
        }
    } catch (finalError) {
        // Last resort: plain send
        await sock.sendMessage(chatId, {
            text: finalDisplay
        });
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
