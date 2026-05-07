/**
 * VEX BRAIN MAP - AUTOMATED PLUGIN INDEXER
 * Logic: Lupin Starnley Jimmoh (VEX CEO)
 * Location: core/brain_map.js
 * * Hii script inapitia plugins zako zote 200+ na kutengeneza ramani
 * ili VEX AI ijue kila plugin inafanya nini bila wewe kuandika manual.
 */

const fs = require('fs');
const path = require('path');

class BrainMap {
    constructor() {
        this.pluginIndex = [];
        this.lastScan = null;
    }

    /**
     * SCAN ALL PLUGINS
     * Inasoma folder lako la plugins na kuchukua metadata.
     * @param {Map} commands - Hii ni commands map inayotoka kwenye cache.js/index.js
     */
    async generateMap(commands) {
        try {
            this.pluginIndex = []; // Reset index
            
            // Tunazunguka kwenye Map ya commands ambayo tayari imepakiwa kwenye RAM
            commands.forEach((cmd, name) => {
                // Tunahakikisha hatuchukui aliases mara mbili, tunachukua main command pekee
                if (cmd.command === name) {
                    this.pluginIndex.push({
                        invocation: name,
                        aliases: cmd.alias || [],
                        about: cmd.description || "Inafanya kazi fulani ya mfumo.",
                        group: cmd.category || "general"
                    });
                }
            });

            this.lastScan = new Date().toLocaleString();
            console.log(`✅ [VEX BRAIN MAP] Successfully indexed ${this.pluginIndex.length} plugins.`);
            
            return this.formatForAI();
        } catch (error) {
            console.error("❌ [BRAIN MAP ERROR]:", error.message);
            return "Unable to scan plugins.";
        }
    }

    /**
     * FORMAT FOR AI
     * Inageuza ramani kuwa text ambayo AI (Groq/Gemini/n.k.) inaweza kuielewa kirahisi.
     */
    formatForAI() {
        if (this.pluginIndex.length === 0) return "No plugins indexed.";

        let aiKnowledge = "CURRENT SYSTEM CAPABILITIES (PLUGINS):\n";
        aiKnowledge += "You can guide the user to use these commands if they need help:\n\n";

        this.pluginIndex.forEach((p, i) => {
            aiKnowledge += `${i + 1}. Command: ${p.invocation}\n`;
            aiKnowledge += `   Purpose: ${p.about}\n`;
            if (p.aliases.length > 0) aiKnowledge += `   Also known as: ${p.aliases.join(', ')}\n`;
            aiKnowledge += `\n`;
        });

        return aiKnowledge;
    }

    /**
     * GET QUICK STATS
     */
    getStats() {
        return {
            total_plugins: this.pluginIndex.length,
            last_updated: this.lastScan
        };
    }
}

module.exports = new BrainMap();
