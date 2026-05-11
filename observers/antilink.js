const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

// Cache settings for 30 seconds
const settingsCache = new Map();
const processedMessages = new Set();

// Regex for ALL link types
const LINK_REGEX = /(https?:\/\/|www\.|chat\.whatsapp\.com\/|t\.me\/|telegram\.me\/|discord\.gg\/|instagram\.com\/|fb\.me\/|bit\.ly\/|tinyurl\.com\/|youtu\.be\/|youtube\.com\/)/i;

module.exports = {
    name: "antilink_observer_v1",

    trigger: (m) => {
        return m.message &&
               m.key.remoteJid?.endsWith('@g.us') &&
              !m.key.fromMe &&
              !processedMessages.has(m.key.id);
    },

    async onMessage(m, sock, ctx) {
        const { userSettings } = ctx;
        const style = userSettings?.style || 'normal';
        const groupId = m.key.remoteJid;
        const userId = m.key.participant || m.sender;
        const msgId = m.key.id;
        const clientId = process.env.TENANT_ID || 'vex_default';

        processedMessages.add(msgId);
        setTimeout(() => processedMessages.delete(msgId), 60000);

        try {
            // 1. GET SETTINGS (cached)
            let config = settingsCache.get(groupId);

            if (!config) {
                const { data } = await supabase
                   .from('vex_group_settings')
                   .select('setting_value')
                   .eq('group_id', groupId)
                   .eq('client_id', clientId)
                   .eq('setting_name', 'antilink')
                   .maybeSingle();

                config = data?.setting_value || { enabled: false };
                settingsCache.set(groupId, config);
                setTimeout(() => settingsCache.delete(groupId), 30000);
            }

            if (!config.enabled) return;

            // 2. EXTRACT TEXT
            const messageText =
                m.message.conversation ||
                m.message.extendedTextMessage?.text ||
                m.message.imageMessage?.caption ||
                m.message.videoMessage?.caption ||
                '';

            if (!messageText) return;

            // 3. CHECK FOR LINK
            if (!LINK_REGEX.test(messageText)) return;

            // 4. DELETE MESSAGE (even if not admin, try)
            try {
                await sock.sendMessage(groupId, {
                    delete: {
                        remoteJid: groupId,
                        fromMe: false,
                        id: msgId,
                        participant: userId
                    }
                });
            } catch (delErr) {
                // If can't delete, just warn
                console.log('Cannot delete (not admin):', delErr.message);
            }

            // 5. WARN USER
            const warnLimit = config.warnlimit || 3;

            const { data: existingWarn } = await supabase
               .from('vex_group_warnings')
               .select('warn_count')
               .eq('group_id', groupId)
               .eq('user_id', userId)
               .eq('client_id', clientId)
               .maybeSingle();

            const newWarnCount = (existingWarn?.warn_count || 0) + 1;

            await supabase
               .from('vex_group_warnings')
               .upsert({
                    group_id: groupId,
                    user_id: userId,
                    client_id: clientId,
                    warn_count: newWarnCount,
                    reason: 'Antilink violation',
                    warned_by: 'system'
                }, { onConflict: 'group_id,user_id,client_id' });

            // 6. KICK IF LIMIT REACHED (try, even if not admin)
            let kicked = false;
            if (newWarnCount >= warnLimit) {
                try {
                    await sock.groupParticipantsUpdate(groupId, [userId], 'remove');
                    kicked = true;

                    // Reset warns after kick
                    await supabase
                       .from('vex_group_warnings')
                       .delete()
                       .eq('group_id', groupId)
                       .eq('user_id', userId)
                       .eq('client_id', clientId);
                } catch (kickErr) {
                    console.log('Cannot kick (not admin):', kickErr.message);
                }
            }

            // 7. SEND REPORT (simple with styles)
            const userName = userId.split('@')[0];
            const reports = {
                normal: {
                    deleted: `✅ Link deleted\n👤 @${userName}\n⚠️ Warn ${newWarnCount}/${warnLimit}`,
                    kicked: `✅ User kicked\n👤 @${userName}\n🚫 Exceeded ${warnLimit} warns`
                },
                harsh: {
                    deleted: `☣️ LINK NEUTRALIZED\n👤 @${userName}\n⚡ Warn ${newWarnCount}/${warnLimit}`,
                    kicked: `☣️ TARGET ELIMINATED\n👤 @${userName}\n💀 Limit exceeded`
                },
                girl: {
                    deleted: `🌸 Link removed~\n👤 @${userName}\n💖 Warn ${newWarnCount}/${warnLimit}`,
                    kicked: `🌸 Bye bye~\n👤 @${userName}\n💔 Too many warns`
                }
            };

            const report = kicked?
                reports[style].kicked :
                reports[style].deleted;

            // Send report (delete after 5 seconds)
            const sentMsg = await sock.sendMessage(groupId, {
                text: report,
                mentions: [userId]
            });

            setTimeout(async () => {
                try {
                    await sock.sendMessage(groupId, {
                        delete: {
                            remoteJid: groupId,
                            fromMe: true,
                            id: sentMsg.key.id
                        }
                    });
                } catch {}
            }, 5000);

        } catch (error) {
            console.error('Antilink observer error:', error.message);
        }
    }
};
