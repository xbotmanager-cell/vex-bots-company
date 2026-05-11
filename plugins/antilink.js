const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

module.exports = {
    command: "antilink",
    alias: ["setantilink", "antilinkwarn", "nolink"],
    category: "group",
    description: "Control antilink protection",

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
            // Get current config (exactly as observer expects)
            const { data: current } = await supabase
             .from('vex_group_settings')
             .select('setting_value')
             .eq('group_id', groupId)
             .eq('client_id', clientId)
             .eq('setting_name', 'antilink')
             .maybeSingle();

            let enabled = current?.setting_value?.enabled || false;
            let warnlimit = current?.setting_value?.warnlimit || 3;

            // STATUS
            if (!action || action === 'status') {
                await sock.sendMessage(m.chat, { react: { text: "✅", key: m.key } });
                const status = enabled? '✅ ENABLED' : '❌ DISABLED';
                return m.reply(`${status}\nWarn limit: ${warnlimit}`);
            }

            // ON
            if (['on', 'enable', '1', 'activate'].includes(action)) {
                enabled = true;
            }
            // OFF
            else if (['off', 'disable', '0', 'deactivate'].includes(action)) {
                enabled = false;
            }
            // SET WARN LIMIT
            else if (['warn', 'limit', 'set'].includes(action)) {
                warnlimit = parseInt(args[1]) || 3;
                if (warnlimit < 1) warnlimit = 1;
                if (warnlimit > 10) warnlimit = 10;
                enabled = true;
            }
            else {
                await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
                return m.reply("Usage: antilink on / off / warn 3");
            }

            // SAVE - exact structure observer reads
            const setting_value = { enabled, warnlimit };

            await supabase
             .from('vex_group_settings')
             .upsert({
                    group_id: groupId,
                    client_id: clientId,
                    setting_name: 'antilink',
                    setting_value
                }, { onConflict: 'group_id,client_id,setting_name' });

            await sock.sendMessage(m.chat, { react: { text: "✅", key: m.key } });

            // Styles matching observer
            const style = ctx.userSettings?.style || 'normal';
            const reports = {
                normal: `✅ Antilink ${enabled? 'ENABLED' : 'DISABLED'}\nWarn limit: ${warnlimit}`,
                harsh: `☣️ ANTILINK ${enabled? 'ARMED' : 'DISARMED'}\n⚡ Warns: ${warnlimit}`,
                girl: `🌸 Antilink ${enabled? 'on' : 'off'} ~\n💖 Limit: ${warnlimit}`
            };

            return m.reply(reports[style] || reports.normal);

        } catch (err) {
            console.error('Antilink plugin error:', err);
            await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
            return m.reply("❌ Database error");
        }
    }
};
