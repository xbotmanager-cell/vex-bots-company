const fs = require("fs");
const path = require("path");

module.exports = {
    name: "menu_reply_handler",

    trigger: (m) => {
        if (!m.message) return false;

        const text =
            m.message.conversation ||
            m.message.extendedTextMessage?.text;

        return /^[0-9]+$/.test(text);
    },

    async onMessage(m, sock, ctx) {
        const { cache } = ctx;

        try {
            const input =
                m.message.conversation ||
                m.message.extendedTextMessage?.text;

            const index = parseInt(input) - 1;

            const map = cache.get(`menu_map_${m.chat}`);
            if (!map) return;

            const category = map[index];
            if (!category) return;

            const pluginDir = path.join(__dirname, "../plugins");

            let commands = [];

            const files = fs.readdirSync(pluginDir);

            for (const file of files) {
                if (!file.endsWith(".js")) continue;

                try {
                    const pluginPath = path.join(pluginDir, file);

                    delete require.cache[require.resolve(pluginPath)];
                    const plugin = require(pluginPath);

                    if (
                        plugin.category &&
                        plugin.category.toLowerCase() === category
                    ) {
                        commands.push(plugin.command);
                    }
                } catch {}
            }

            if (!commands.length) return;

            // ================= UI =================
            let text = `╭━━━〔 ${category.toUpperCase()} 〕━━━╮\n`;

            commands.sort().forEach((cmd, i) => {
                const num = (i + 1).toString().padStart(2, "0");
                text += `│ ${num} ➤ .${cmd}\n`;
            });

            text += "╰━━━━━━━━━━━━━━━━━━╯";

            await sock.sendMessage(
                m.chat,
                { text },
                { quoted: m }
            );

        } catch {
            // silent
        }
    }
};
