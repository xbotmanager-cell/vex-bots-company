/**
 * VEX MESSAGE HANDLER
 * Role: Real-time Logic Execution (Logic 1-6) + Command Executor
 * Path: lib/handler.js
 * System: High-Speed Async Processing (Ubuntu Optimized)
 */

const { SettingsManager } = require('./settings_manager');
const { AI_Manager } = require('./ai_logic');

async function vexHandler(vex, m, socketIO, commands) {
    try {
        // 1. Basic Check & Message Extraction
        if (!m.messages || !m.messages) return;
        const msg = m.messages;
        
        // Extract message body (Text, Caption, etc.)
        const body = msg.message?.conversation || 
                     msg.message?.extendedTextMessage?.text || 
                     msg.message?.imageMessage?.caption || 
                     msg.message?.videoMessage?.caption || "";
        
        const sender = msg.key.remoteJid;
        const isGroup = sender.endsWith('@g.us');
        const isStatus = sender === 'status@broadcast';

        // 2. Load Bot Settings (Using bot's own JID)
        const botJid = vex.user.id.split(':') + "@s.whatsapp.net";
        const config = await SettingsManager.initUser(botJid);

        // --- STATUS LOGIC (Auto View & Like) ---
        if (isStatus) {
            await statusHandler(vex, msg, config);
            return;
        }

        // Skip if message object is empty
        if (!msg.message) return;

        // --- LOGIC 1: Always Online ---
        if (config.alwaysOnline) {
            await vex.sendPresenceUpdate('available', sender);
        }

        // --- LOGIC 3: Autotyping (Only if not from me) ---
        if (config.autoTyping && !msg.key.fromMe) {
            await delay(1000);
            await vex.sendPresenceUpdate('composing', sender);
        }

        // --- LOGIC 4: Autoread ---
        if (!msg.key.fromMe && config.autoRead) {
            await vex.readMessages([msg.key]);
        }

        // --- COMMANDS HANDLER (Priority) ---
        const prefix = "."; 
        if (body.startsWith(prefix)) {
            const args = body.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();
            
            // Search in commands array
            const cmd = commands.find(c => c.vex === commandName);

            if (cmd) {
                // Visual feedback for command execution
                await vex.sendPresenceUpdate('composing', sender);
                await cmd.execute(msg, vex, commands); 
                console.log(`VEX EXECUTE: .${commandName} by ${msg.pushName || 'User'}`);
                return; // Stop here if it's a command
            }
        }

        // --- LOGIC 6: Autoreply (AI Neural Core) ---
        if (config.autoReply.enabled && !msg.key.fromMe && body.length > 1) {
            let shouldReply = false;
            const target = config.autoReply.target;

            if (target === 'all') shouldReply = true;
            else if (target === 'dm' && !isGroup) shouldReply = true;
            else if (target === 'groups' && isGroup) shouldReply = true;
            else if (target === 'specific' && config.autoReply.specificContacts.includes(sender)) shouldReply = true;

            if (shouldReply) {
                const aiReply = await AI_Manager.generateResponse(botJid, body, msg.pushName || 'Friend');
                if (aiReply) {
                    await delay(1500); // Wait for a more human feel
                    await vex.sendMessage(sender, { text: aiReply }, { quoted: msg });
                }
            }
        }

    } catch (err) {
        console.error("VEX HANDLER ERROR:", err);
    }
}

/**
 * STATUS HANDLER (Logic 2 & 5)
 */
async function statusHandler(vex, msg, config) {
    try {
        // --- LOGIC 5: Auto View Status ---
        if (config.autoViewStatus) {
            await delay(500);
            await vex.readMessages([msg.key]);
        }

        // --- LOGIC 2: Auto Like Status ---
        if (config.autoLikeStatus) {
            const emojis = config.statusEmojis || ["⚡", "🔥", "✨"];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            
            await vex.sendMessage(msg.key.remoteJid, {
                react: { text: randomEmoji, key: msg.key }
            }, { statusJidList: [msg.key.participant] });
        }
    } catch (err) {
        console.error("VEX STATUS ERROR:", err);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { vexHandler };
