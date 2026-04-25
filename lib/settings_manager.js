const { createClient } = require('@supabase/supabase-js');

// Render itasoma hizi kutoka kwenye Environment Variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SettingsManager = {
    // Mpangilio wa kuanzia (Defaults)
    getDefaults: () => ({
        alwaysOnline: true,
        autoLikeStatus: true,
        statusEmojis: ["🔥", "❤️", "😂", "🙌", "💯", "✨", "🚀", "⚡", "💎", "🦾"],
        autoTyping: false,
        autoRead: false,
        autoViewStatus: true,
        autoReply: {
            enabled: false,
            target: "all",
            specificContacts: [],
            aiPrompt: "You are the owner of this WhatsApp account. Respond naturally as a human.",
            geminiKey: null
        }
    }),

    // Inatafuta au inatengeneza user
    initUser: async (jid) => {
        try {
            // FIX: Ongeza ili kupata namba pekee kama String
            const userId = jid.split('@');
            
            const { data: user, error } = await supabase
                .from('users')
                .select('config')
                .eq('id', userId)
                .single();

            if (error || !user) {
                const defaultData = SettingsManager.getDefaults();
                // Tunatengeneza row mpya kama haipo
                await supabase.from('users').upsert([{ id: userId, config: defaultData }]);
                return defaultData;
            }

            return user.config;
        } catch (err) {
            console.error("SUPABASE INIT ERROR:", err);
            return SettingsManager.getDefaults();
        }
    },

    // Inasave mabadiliko
    updateUserSetting: async (jid, newData) => {
        try {
            // FIX: Ongeza hapa pia
            const userId = jid.split('@');
            const currentConfig = await SettingsManager.initUser(jid);
            const mergedData = { ...currentConfig, ...newData };

            const { error } = await supabase
                .from('users')
                .update({ 
                    config: mergedData, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', userId);

            if (error) throw error;
            return mergedData;
        } catch (err) {
            console.error("SUPABASE UPDATE ERROR:", err);
            return newData;
        }
    }
};

module.exports = { SettingsManager };
