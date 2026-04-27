/**
 * VEX SUBBOT DEPLOYER
 * Feature: Generates Pairing Code for new users
 * Path: vex/subbot.js
 */

const { delay } = require("@whiskeysockets/baileys");

module.exports = {
    vex: "getbot",
    category: "main",
    execute: async (m, sock, { args }) => {
        const phoneNumber = args[0];

        if (!phoneNumber) {
            return m.reply("❌ Please provide your phone number.\nExample: *.getbot 255712345678*");
        }

        // Clean phone number (remove +, spaces, etc.)
        const targetNumber = phoneNumber.replace(/[^0-9]/g, '');
        const targetJid = `${targetNumber}@s.whatsapp.net`;

        try {
            await m.reply("⏳ *Processing your request...* Connecting to VEX Cloud Servers.");
            
            // In index.js, we need to export the startVexInstance function 
            // or use a global trigger. For now, we use a message trigger.
            await m.reply(`🚀 *VEX BOT DEPLOYMENT INITIATED*\n\nTarget: ${targetNumber}\nMethod: Pairing Code\n\n*Please wait for the 8-digit code in your DM...*`);

            // This logic assumes startVexInstance is available globally or as a shared utility
            // For now, it logs the intent which the Manager (index.js) picks up
            global.startNewInstance(targetJid, true, targetNumber);

            // Wait for the code to be generated and sent via Socket/Event
            // In index.js, we add an event listener to send the code back to the user
            
        } catch (e) {
            console.error(e);
            m.reply("🔥 *Error:* Failed to initiate deployment. Contact Admin.");
        }
    }
};
