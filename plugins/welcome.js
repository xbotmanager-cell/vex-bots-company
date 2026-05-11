const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

// Clear cache
const settingsCache = new Map();

module.exports = {
    command: "welcome",
    alias: ["setwelcome", "goodbye", "bye"],
    category: "group",
    description: "Control welcome/goodbye messages",

    async execute(m, sock, ctx) {
        const { args } = ctx;
        const isGroup = m.chat.endsWith('@g.us');

        if (!isGroup) {
            await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
            return m.reply("❌ Group only");
        }

        const groupId = m.chat;
        const clientId = process.env.TENANT_ID || 'vex_default';
        const action = args[0]?.toLowerCase();

        await sock.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

        try {
            // Get current config
            const { data: current } = await supabase
            .from('vex_group_settings')
            .select('setting_value')
            .eq('group_id', groupId)
            .eq('client_id', clientId)
            .eq('setting_name', 'welcome')
            .maybeSingle();

            let config = current?.setting_value || {
                enabled: false,
                welcome_msg: null,
                goodbye_msg: null,
                show_dp: true,
                show_count: true,
                delete_after: 0
            };

            // STATUS
            if (!action || action === 'status' || action === 'info') {
                await sock.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
                const status = config.enabled? '✅ ENABLED' : '❌ DISABLED';
                const customWelcome = config.welcome_msg? '✅ Custom' : '❌ Default';
                const customGoodbye = config.goodbye_msg? '✅ Custom' : '❌ Default';
                return m.reply(
                    `${status}\n` +
                    `Welcome Msg: ${customWelcome}\n` +
                    `Goodbye Msg: ${customGoodbye}\n` +
                    `Show DP: ${config.show_dp? '✅' : '❌'}\n` +
                    `Show Count: ${config.show_count? '✅' : '❌'}\n` +
                    `Auto Delete: ${config.delete_after? config.delete_after + 's' : '❌'}`
                );
            }

            // ON/OFF
            if (['on', 'enable', '1', 'activate'].includes(action)) {
                config.enabled = true;
            }
            else if (['off', 'disable', '0', 'deactivate'].includes(action)) {
                config.enabled = false;
            }
            // SET CUSTOM WELCOME
            else if (['set', 'welcome', 'setwelcome'].includes(action)) {
                const customMsg = args.slice(1).join(' ');
                if (!customMsg) {
                    await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
                    return m.reply("Usage: welcome set <message>\nUse @user for mention, @group for name, @count for member count");
                }
                config.welcome_msg = customMsg;
                config.enabled = true;
            }
            // SET CUSTOM GOODBYE
            else if (['goodbye', 'setgoodbye', 'bye'].includes(action)) {
                const customMsg = args.slice(1).join(' ');
                if (!customMsg) {
                    await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
                    return m.reply("Usage: welcome goodbye <message>\nUse @user for mention, @group for name");
                }
                config.goodbye_msg = customMsg;
                config.enabled = true;
            }
            // TOGGLE DP
            else if (['dp', 'picture', 'image'].includes(action)) {
                config.show_dp =!config.show_dp;
            }
            // TOGGLE COUNT
            else if (['count', 'members'].includes(action)) {
                config.show_count =!config.show_count;
            }
            // AUTO DELETE
            else if (['autodelete', 'delete', 'timer'].includes(action)) {
                const seconds = parseInt(args[1]) || 0;
                config.delete_after = seconds > 0 && seconds <= 300? seconds : 0;
            }
            // RESET
            else if (['reset', 'clear', 'default'].includes(action)) {
                config = {
                    enabled: false,
                    welcome_msg: null,
                    goodbye_msg: null,
                    show_dp: true,
                    show_count: true,
                    delete_after: 0
                };
            }
            else {
                await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
                return m.reply(
                    "Usage:\n" +
                    "welcome on/off\n" +
                    "welcome set <text>\n" +
                    "welcome goodbye <text>\n" +
                    "welcome dp (toggle)\n" +
                    "welcome count (toggle)\n" +
                    "welcome autodelete 10\n" +
                    "welcome reset"
                );
            }

            // SAVE
            await supabase
            .from('vex_group_settings')
            .upsert({
                    group_id: groupId,
                    client_id: clientId,
                    setting_name: 'welcome',
                    setting_value: config,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'group_id,client_id,setting_name' });

            // Clear cache
            settingsCache.delete(groupId);

            await sock.sendMessage(m.chat, { react: { text: "✅", key: m.key } });

            // STYLES
            const style = ctx.userSettings?.style || 'normal';
            const reports = {
                normal: `✅ Welcome ${config.enabled? 'ENABLED' : 'DISABLED'}\nDP: ${config.show_dp? 'ON' : 'OFF'} | Count: ${config.show_count? 'ON' : 'OFF'}`,
                harsh: `☣️ WELCOME ${config.enabled? 'ARMED' : 'DISARMED'}\n⚡ DP:${config.show_dp? 'YES' : 'NO'} COUNT:${config.show_count? 'YES' : 'NO'}`,
                girl: `🌸 Welcome ${config.enabled? 'on' : 'off'} ~\n💖 DP:${config.show_dp? 'yes' : 'no'} Count:${config.show_count? 'yes' : 'no'}`
            };

            return m.reply(reports[style] || reports.normal);

        } catch (err) {
            console.error('Welcome plugin error:', err);
            await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
            return m.reply("❌ Database error");
        }
    }
};
