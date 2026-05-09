const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// =========================
// SUPABASE - FORCED CONNECTION - NEVER FAIL
// =========================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL ||!SUPABASE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for VEX Firewall');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
    db: { schema: 'public' }
});

// =========================
// BAN IMAGE - DOWNLOAD FIRST
// =========================
const BAN_IMAGE = 'https://i.ibb.co/4Z7Sf3q5/Chat-GPT-Image-May-8-2026-07-10-41-PM.png';
let banImageBuffer = null;

// Pre-download image on startup
(async () => {
    try {
        const response = await axios.get(BAN_IMAGE, { responseType: 'arraybuffer', timeout: 10000 });
        banImageBuffer = Buffer.from(response.data);
    } catch (err) {
        console.error('VEX FIREWALL: Failed to pre-download ban image:', err.message);
    }
})();

// =========================
// VEX GLOBAL QUEUE (ANTI-BAN)
// =========================
const queue = [];
let processing = false;
const OWNER_ID = "255780470905@s.whatsapp.net";

module.exports = {
    command: "ban",
    alias: ["firewall", "block", "vexban", "unban", "banlist"],
    category: "owner",
    description: "VEX Firewall - Advanced ban system with temp/perm bans and auto-enforcement",

    async execute(m, sock, ctx) {
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
            await runBan(m, sock, ctx);
            await sleep(1500);
        } catch (e) {
            console.error("VEX BAN ERROR:", e);
            try {
                await sock.sendMessage(m.chat, {
                    text: `⚠️ *VEX FIREWALL ERROR*\n\nSystem temporarily unavailable.\n\n- VEX Security`
                });
            } catch {}
        }
    }
    processing = false;
}

async function runBan(m, sock, ctx) {
    const { args, userSettings, prefix, command } = ctx;
    const style = userSettings?.style || 'harsh';
    const chatId = m.chat;
    const sender = m.sender;
    const userRole = ctx.userRole || 'user';

    // =========================
    // STYLE CONFIG - ALL STYLES
    // =========================
    const themes = {
        harsh: {
            react: "☣️",
            title: "☣️ 𝖁𝕰𝖃 𝕱𝕴𝕽𝕰𝖂𝕬𝕷 ☣️",
            line: "━",
            success: "☣️ 𝕋𝔸ℝ𝔾𝔼𝕋 ℕ𝔼𝕌𝕋ℝ𝔸𝕃𝕀𝕫𝔼𝔻",
            unban: "☣️ 𝔸ℂ𝔼𝕊𝕊 ℝ𝔼𝕊𝕋𝕆ℝ𝔼𝔻",
            error: "☣️ 𝔸ℂ𝔼𝕊 𝔻𝔼ℕ𝕀𝔼𝔻",
            banned: "☣️ 𝕐𝕆𝕌 𝔸ℝ𝔼 𝔹𝔸ℕℕ𝔼𝔻"
        },
        normal: {
            react: "🚫",
            title: "🚫 VEX FIREWALL 🚫",
            line: "─",
            success: "✅ User Banned Successfully",
            unban: "✅ User Unbanned Successfully",
            error: "❌ Access Denied",
            banned: "🚫 You Are Banned"
        },
        girl: {
            react: "🎀",
            title: "🫧 𝒱𝑒𝓍 𝐹𝒾𝓇𝑒𝓌𝒶𝓁 🫧",
            line: "┄",
            success: "💖 𝒯𝒶𝓇𝑔𝑒𝓉 𝒩𝑒𝓊𝓉𝓇𝒶𝓁𝒾𝓏𝑒𝒹~",
            unban: "💖 𝒜𝒸𝑒𝓈 𝑅𝑒𝓈𝓉𝑜𝓇𝑒𝒹~",
            error: "💔 𝒜𝒸𝑒𝓈 𝒟𝑒𝓃𝒾𝑒𝒹~",
            banned: "💔 𝒴𝑜𝓊 𝒜𝓇𝑒 𝐵𝒶𝓃𝓃𝑒𝒹~"
        }
    };

    const ui = themes[style] || themes.normal;

    // =========================
    // REACT
    // =========================
    await sock.sendMessage(m.chat, { react: { text: ui.react, key: m.key } });

    // =========================
    // SUB-COMMANDS
    // =========================
    const subCmd = args[0]?.toLowerCase();

    // UNBAN COMMAND
    if (command === 'unban' || subCmd === 'unban') {
        return await handleUnban(m, sock, ctx, ui, chatId, sender, userRole);
    }

    // BANLIST COMMAND
    if (command === 'banlist' || subCmd === 'list' || subCmd === 'banlist') {
        return await handleBanList(m, sock, ctx, ui, chatId);
    }

    // BAN COMMAND
    return await handleBan(m, sock, ctx, ui, chatId, sender, userRole, args);
}

// =========================
// HANDLE BAN
// =========================
async function handleBan(m, sock, ctx, ui, chatId, sender, userRole, args) {
    // Check permissions
    if (userRole!== 'owner' && sender!== OWNER_ID) {
        return m.reply(`${ui.error}\n\nOnly bot owner can use firewall commands.`);
    }

    const mentioned = m.mentionedJid || [];
    const quoted = m.quoted;

    let targetUser = null;
    if (mentioned.length > 0) {
        targetUser = mentioned[0];
    } else if (quoted) {
        targetUser = quoted.sender;
    } else if (args[0] && args[0].includes('@')) {
        targetUser = args[0].replace('@', '') + '@s.whatsapp.net';
    }

    if (!targetUser) {
        return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n*Usage:*\n.ban @user 7d spam\n.ban @user perm toxicity\n.ban @user 1h flood\n\n*Duration:* 1m, 1h, 1d, 1w, perm\n\n_VEX Firewall v2.0_`);
    }

    // Prevent banning owner
    if (targetUser === OWNER_ID) {
        return m.reply(`${ui.error}\n\nCannot ban the owner.`);
    }

    // Parse duration and reason
    let duration = 'perm';
    let reason = 'No reason provided';

    const durationArg = args[1]?.toLowerCase();
    if (durationArg) {
        if (durationArg === 'perm' || durationArg === 'permanent') {
            duration = 'perm';
            reason = args.slice(2).join(' ') || 'Permanent ban';
        } else {
            const match = durationArg.match(/^(\d+)([mhdw])$/);
            if (match) {
                duration = durationArg;
                reason = args.slice(2).join(' ') || 'Temporary ban';
            } else {
                reason = args.slice(1).join(' ') || 'No reason provided';
            }
        }
    }

    // Calculate expires_at
    let expiresAt = null;
    let durationSeconds = null;

    if (duration!== 'perm') {
        const match = duration.match(/^(\d+)([mhdw])$/);
        if (match) {
            const value = parseInt(match[1]);
            const unit = match[2];
            const multipliers = { m: 60, h: 3600, d: 86400, w: 604800 };
            durationSeconds = value * multipliers[unit];
        }
    }

    // Call Supabase function
    try {
        const { data, error } = await supabase.rpc('add_ban', {
            p_user_id: targetUser,
            p_chat_id: chatId,
            p_reason: reason,
            p_ban_type: duration === 'perm'? 'perm' : 'temp',
            p_banned_by: sender,
            p_duration_seconds: durationSeconds
        });

        if (error) throw error;

        let targetName = targetUser.split('@')[0];
        try {
            targetName = await sock.getName(targetUser) || targetName;
        } catch {}

        // Build response table
        let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
        response += `${ui.success}\n\n`;
        response += `┌─ *TARGET DATA* ${ui.line.repeat(10)}\n`;
        response += `│\n`;
        response += `│ 👤 *User:* ${targetName}\n`;
        response += `│ 🆔 *ID:* ${targetUser.split('@')[0]}\n`;
        response += `│ ⏱️ *Duration:* ${duration === 'perm'? 'Permanent' : duration}\n`;
        response += `│ 📝 *Reason:* ${reason}\n`;
        if (data.expires_at) {
            response += `│ 📅 *Expires:* ${new Date(data.expires_at).toLocaleString()}\n`;
        }
        response += `│\n`;
        response += `└${ui.line.repeat(25)}\n\n`;
        response += `_VEX Firewall Active - Created by Lupin Starnley_`;

        // Send with image
        if (banImageBuffer) {
            await sock.sendMessage(chatId, {
                image: banImageBuffer,
                caption: response,
                mentions: [targetUser, sender]
            });
        } else {
            await sock.sendMessage(chatId, {
                text: response,
                mentions: [targetUser, sender]
            });
        }

    } catch (err) {
        console.error('VEX BAN SUPABASE ERROR:', err);
        await m.reply(`${ui.error}\n\nDatabase error: ${err.message}\n\nSupabase connection failed. Check credentials.`);
    }
}

// =========================
// HANDLE UNBAN
// =========================
async function handleUnban(m, sock, ctx, ui, chatId, sender, userRole) {
    if (userRole!== 'owner' && sender!== OWNER_ID) {
        return m.reply(`${ui.error}\n\nOnly bot owner can use firewall commands.`);
    }

    const mentioned = m.mentionedJid || [];
    const quoted = m.quoted;
    const args = ctx.args;

    let targetUser = null;
    if (mentioned.length > 0) {
        targetUser = mentioned[0];
    } else if (quoted) {
        targetUser = quoted.sender;
    } else if (args[0] && args[0].includes('@')) {
        targetUser = args[0].replace('@', '') + '@s.whatsapp.net';
    }

    if (!targetUser) {
        return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n*Usage:*\n.unban @user\n\n_VEX Firewall v2.0_`);
    }

    try {
        const { error } = await supabase
           .from('vex_bans')
           .delete()
           .eq('user_id', targetUser)
           .eq('chat_id', chatId);

        if (error) throw error;

        let targetName = targetUser.split('@')[0];
        try {
            targetName = await sock.getName(targetUser) || targetName;
        } catch {}

        let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
        response += `${ui.unban}\n\n`;
        response += `┌─ *TARGET DATA* ${ui.line.repeat(10)}\n`;
        response += `│\n`;
        response += `│ 👤 *User:* ${targetName}\n`;
        response += `│ 🆔 *ID:* ${targetUser.split('@')[0]}\n`;
        response += `│ ✅ *Status:* Access Restored\n`;
        response += `│\n`;
        response += `└${ui.line.repeat(25)}\n\n`;
        response += `_VEX Firewall - Created by Lupin Starnley_`;

        await sock.sendMessage(chatId, {
            text: response,
            mentions: [targetUser]
        });

    } catch (err) {
        console.error('VEX UNBAN ERROR:', err);
        await m.reply(`${ui.error}\n\nDatabase error: ${err.message}`);
    }
}

// =========================
// HANDLE BANLIST
// =========================
async function handleBanList(m, sock, ctx, ui, chatId) {
    try {
        const { data: bans, error } = await supabase
           .from('vex_bans')
           .select('*')
           .eq('chat_id', chatId)
           .order('created_at', { ascending: false })
           .limit(20);

        if (error) throw error;

        if (!bans || bans.length === 0) {
            return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n✅ No active bans in this chat.\n\n_VEX Firewall v2.0_`);
        }

        let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
        response += `📋 *ACTIVE BANS: ${bans.length}*\n\n`;

        for (let i = 0; i < bans.length; i++) {
            const ban = bans[i];
            let userName = ban.user_id.split('@')[0];
            try {
                userName = await sock.getName(ban.user_id) || userName;
            } catch {}

            const expiresText = ban.expires_at
               ? new Date(ban.expires_at).toLocaleDateString()
                : 'Permanent';

            const isActive =!ban.expires_at || new Date(ban.expires_at) > new Date();

            response += `*${i + 1}.* ${userName}\n`;
            response += ` ${ui.line.repeat(15)}\n`;
            response += ` • Type: ${ban.ban_type === 'perm'? '🔴 Permanent' : '🟡 Temporary'}\n`;
            response += ` • Status: ${isActive? '🟢 Active' : '⚫ Expired'}\n`;
            response += ` • Reason: ${ban.reason}\n`;
            response += ` • Expires: ${expiresText}\n`;
            response += ` • Violations: ${ban.violations}\n`;
            response += ` ${ui.line.repeat(15)}\n\n`;
        }

        response += `_VEX Firewall - Created by Lupin Starnley_`;

        await m.reply(response);

    } catch (err) {
        console.error('VEX BANLIST ERROR:', err);
        await m.reply(`${ui.error}\n\nDatabase error: ${err.message}`);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
