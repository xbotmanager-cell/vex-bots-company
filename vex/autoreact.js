/**
 * VEX MINI BOT - VEX: autoreact (LIVE OVERRIDE)
 * Nova: Manages Auto-React state in Realtime RAM.
 * Dev: Lupin Starnley
 */

module.exports = {
    vex: 'autoreact',
    cyro: 'settings',
    nova: 'Enables or disables Auto-React instantly without restarting.',

    async execute(m, sock, commands) {
        const args = m.text.split(' ');
        const action = args[1]?.toLowerCase(); // Reads 'on' or 'off'

        // 1. 🔥 LIVE MEMORY OVERRIDE
        // Accessing the global vexSettings to apply changes immediately
        try {
            if (action === 'off') {
                // Disabling live in RAM
                if (typeof vexSettings !== 'undefined') {
                    vexSettings['autoreact'].value = false;
                    
                    await sock.sendMessage(m.chat, { react: { text: "🌑", key: m.key } });
                    return m.reply("✅ *VEX SYSTEM:* Auto-React has been disabled LIVE (RAM Override). No restart required.");
                } else {
                    return m.reply("⚠️ *ERROR:* Cannot access vexSettings in RAM.");
                }
            } 
            
            else if (action === 'on') {
                // Enabling live in RAM
                if (typeof vexSettings !== 'undefined') {
                    vexSettings['autoreact'].value = true;
                    
                    await sock.sendMessage(m.chat, { react: { text: "🌕", key: m.key } });
                    return m.reply("✅ *VEX SYSTEM:* Auto-React has been enabled LIVE (RAM Override). System ready.");
                } else {
                    return m.reply("⚠️ *ERROR:* Cannot access vexSettings in RAM.");
                }
            } 
            
            else {
                // If no valid action is provided
                return m.reply("❓ *USAGE:* Use `.autoreact off` or `.autoreact on` to control the system.");
            }

        } catch (err) {
            console.error("🛑 SETTINGS OVERRIDE ERROR:", err);
            await m.reply("❌ An error occurred while updating settings.");
        }
    }
};
