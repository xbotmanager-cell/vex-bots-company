const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

// Cache settings 30s
const settingsCache = new Map();

module.exports = {
    name: "welcome_goodbye_v2",

    // Baileys event
    trigger: "group-participants.update",

    async onParticipantsUpdate(update, sock, ctx) {
        const { userSettings } = ctx;
        const style = userSettings?.style || 'normal';
        const groupId = update.id;
        const clientId = process.env.TENANT_ID || 'vex_default';

        try {
            // 1. GET SETTINGS FROM DB
            let config = settingsCache.get(groupId);

            if (!config) {
                const { data } = await supabase
                .from('vex_group_settings')
                .select('setting_value')
                .eq('group_id', groupId)
                .eq('client_id', clientId)
                .eq('setting_name', 'welcome')
                .maybeSingle();

                config = data?.setting_value || { enabled: false };
                settingsCache.set(groupId, config);
                setTimeout(() => settingsCache.delete(groupId), 30000);
            }

            if (!config.enabled) return;

            const groupMetadata = await sock.groupMetadata(groupId);
            const groupName = groupMetadata.subject;
            const memberCount = groupMetadata.participants.length;

            // Default values from plugin
            const showDp = config.show_dp!== false;
            const showCount = config.show_count!== false;
            const deleteAfter = config.delete_after || 0;

            // Parse variables helper
            const parseMessage = (template, participant, groupName, count) => {
                const userTag = participant.split('@')[0];
                return template
                 .replace(/@user/g, `@${userTag}`)
                 .replace(/@group/g, groupName)
                 .replace(/@count/g, count);
            };

            // 2. HANDLE JOIN
            if (update.action === 'add') {
                for (const participant of update.participants) {
                    const userTag = participant.split('@')[0];
                    let profilePic = null;

                    // Get DP if enabled
                    if (showDp) {
                        try {
                            profilePic = await sock.profilePictureUrl(participant, 'image');
                        } catch {
                            profilePic = null;
                        }
                    }

                    // Default templates
                    const templates = {
                        normal: {
                            text: `✅ *WELCOME TO ${groupName}*\n\n👤 @${userTag}${showCount? `\n📊 You are member #${memberCount}` : ''}\n\nWe're glad to have you here. Read the rules and enjoy your stay.`,
                            noDp: `✅ *WELCOME*\n\n👤 @${userTag}${showCount? `\n📊 Member #${memberCount}` : ''}\n\nEnjoy your stay in ${groupName}.`
                        },
                        harsh: {
                            text: `☣️ *NEW TRASH ENTERED*\n\n👤 @${userTag}${showCount? `\n📊 Victim #${memberCount}` : ''}\n\nRules? Follow them or get kicked, idiot.\nBreak rules = instant elimination.`,
                            noDp: `☣️ *ANOTHER ONE*\n\n👤 @${userTag}${showCount? `\n📊 #${memberCount}` : ''}\n\nDon't be stupid here.`
                        },
                        girl: {
                            text: `🌸 *WELCOME CUTIE~*\n\n👤 @${userTag}${showCount? `\n📊 Member #${memberCount} 💖` : ''}\n\nOmg new friend! Welcome to ${groupName}~ 💕\nBe nice and have fun okay? 🫧`,
                            noDp: `🌸 *HI THERE~*\n\n👤 @${userTag}${showCount? `\n📊 #${memberCount} 💖` : ''}\n\nWelcome to the family! 🥺💕`
                        }
                    };

                    // Use custom message if set
                    let msg;
                    if (config.welcome_msg) {
                        msg = parseMessage(config.welcome_msg, participant, groupName, memberCount);
                    } else {
                        msg = profilePic? templates[style].text : templates[style].noDp;
                    }

                    let sentMsg;
                    if (profilePic && showDp) {
                        sentMsg = await sock.sendMessage(groupId, {
                            image: { url: profilePic },
                            caption: msg,
                            mentions: [participant]
                        });
                    } else {
                        sentMsg = await sock.sendMessage(groupId, {
                            text: msg,
                            mentions: [participant]
                        });
                    }

                    // Auto delete if set
                    if (deleteAfter > 0 && sentMsg) {
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
                        }, deleteAfter * 1000);
                    }
                }
            }

            // 3. HANDLE LEAVE
            if (update.action === 'remove' || update.action === 'leave') {
                for (const participant of update.participants) {
                    const userTag = participant.split('@')[0];

                    // Default templates
                    const templates = {
                        normal: {
                            text: `❌ *GOODBYE*\n\n👤 @${userTag} left ${groupName}${showCount? `\n📊 Members remaining: ${memberCount}` : ''}\n\nWe hope to see you again.`
                        },
                        harsh: {
                            text: `☣️ *TRASH REMOVED*\n\n👤 @${userTag} got lost${showCount? `\n📊 ${memberCount} left` : ''}\n\nGood riddance. Nobody cares.`
                        },
                        girl: {
                            text: `🌸 *BYE BYE~*\n\n👤 @${userTag} left us 💔${showCount? `\n📊 ${memberCount} members left` : ''}\n\nWe'll miss you... maybe 🥺💕`
                        }
                    };

                    // Use custom goodbye if set
                    let msg;
                    if (config.goodbye_msg) {
                        msg = parseMessage(config.goodbye_msg, participant, groupName, memberCount);
                    } else {
                        msg = templates[style].text;
                    }

                    const sentMsg = await sock.sendMessage(groupId, {
                        text: msg,
                        mentions: [participant]
                    });

                    // Auto delete if set
                    if (deleteAfter > 0 && sentMsg) {
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
                        }, deleteAfter * 1000);
                    }
                }
            }

        } catch (error) {
            console.error('Welcome observer error:', error.message);
        }
    }
};
