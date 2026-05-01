const fs = require('fs');
const path = require('path');
const translate = require('google-translate-api-x');

module.exports = {
    command: "logs",
    alias: ["history", "report"],
    category: "admin",
    description: "Generates a system activity report in a TXT file",

    async execute(m, sock, { supabase, userSettings, cache }) {
        // 1. EXTRACT PREFERENCES FROM CACHE
        const style = userSettings?.style || 'harsh';
        const lang = userSettings?.lang || 'en';

        const modes = {
            harsh: {
                title: "☣️ 𝕷𝖀𝕻𝕰𝕽 𝕾𝖄𝕾𝕿𝕰𝕸 𝕮𝕺𝕽𝕰 𝕷𝕺𝕲𝕾 ☣️",
                process: "⚙️ 𝕻𝖗𝖊𝖕𝖆𝖗𝖎𝖓𝖈 𝖉𝖎𝖌𝖎𝖙𝖆𝖑 𝖊𝖛𝖎𝖉𝖊𝖓𝖈𝖊...",
                done: "☘️ 𝕳𝖊𝖗𝖊 𝖎𝖘 𝖞𝖔𝖚𝖗 𝖉𝖆𝖒𝖓 𝖗𝖊𝖕𝖔𝖗𝖙. 𝕽𝖊𝖆𝖉 𝖎𝖙 𝖆𝖓𝖉 𝖛𝖆𝖓𝖎𝖘𝖍.",
                filename: "LUPER_CRITICAL_LOGS.txt",
                empty: "📭 No digital footprints found in the database."
            },
            normal: {
                title: "💠 VEX System Logs 💠",
                process: "⏳ Fetching logs from Supabase...",
                done: "✅ System report generated successfully.",
                filename: "Vex_System_Report.txt",
                empty: "📭 No logs found in the database."
            },
            girl: {
                title: "🫧 𝐿𝓊𝓅𝑒𝓇's 𝐿𝒾𝓉𝓉𝓁𝑒 𝒮𝑒𝒸𝓇𝑒𝓉 𝐿𝑜𝑔𝓈 🫧",
                process: "🫧 𝓌𝓇𝒾𝓉𝒾𝓃𝑔 𝒹𝑜𝓌𝓃 𝓉𝒽𝑒 𝓂𝑒𝓂𝑜𝓇𝒾𝑒𝓈... 🫧",
                done: "🫧 𝒽𝑒𝓇𝑒 𝒾𝓈 𝓉𝒽𝑒 𝓁𝑜𝑔𝒷𝑜𝑜𝓀, 𝒷𝒶𝒷𝑒! 🫧",
                filename: "Cute_System_Logs.txt",
                empty: "🫧 𝑜𝑜𝓅𝓈, 𝓉𝒽𝑒 𝓁𝑜𝑔𝒷𝑜𝑜𝓀 𝒾𝓈 𝑒𝓂𝓅𝓉𝓎! 🫧"
            }
        };

        const current = modes[style] || modes.normal;

        try {
            await m.reply(current.process);

            // 2. RETRIEVE DATA FROM LUPER_SYSTEM_LOGS
            const { data: logs, error } = await supabase
                .from("luper_system_logs")
                .select("*")
                .order("recorded_at", { ascending: false });

            if (error || !logs || logs.length === 0) {
                return m.reply(current.empty);
            }

            // 3. CONSTRUCT TXT FILE CONTENT
            let fileContent = `====================================\n`;
            fileContent += `   ${current.title}\n`;
            fileContent += `====================================\n\n`;
            fileContent += `Generated: ${new Date().toLocaleString()}\n`;
            fileContent += `Total Entries: ${logs.length}\n\n`;

            logs.forEach((log, index) => {
                fileContent += `${index + 1}. [${log.recorded_at}]\n`;
                fileContent += `   MODULE: ${log.module_name}\n`;
                fileContent += `   TARGET JID: ${log.target_identifier}\n`;
                fileContent += `   ACTIVITY: ${log.activity_desc}\n`;
                fileContent += `   EXECUTION: ${log.execution_status.toUpperCase()}\n`;
                fileContent += `   UI_STYLE: ${log.applied_style}\n`;
                fileContent += `------------------------------------\n`;
            });

            const tempPath = path.join(__dirname, `../../${current.filename}`);
            fs.writeFileSync(tempPath, fileContent);

            // 4. MULTILINGUAL CAPTION HANDLING
            let rawCaption = `*${current.title}*\n\n📋 _${current.done}_`;
            const { text: finalCaption } = await translate(rawCaption, { to: lang });

            // 5. DISPATCH DOCUMENT
            await sock.sendMessage(m.chat, {
                document: fs.readFileSync(tempPath),
                fileName: current.filename,
                mimetype: "text/plain",
                caption: finalCaption
            }, { quoted: m });

            // Clean up temporary file
            fs.unlinkSync(tempPath);

        } catch (error) {
            console.error("CRITICAL LOG ERROR:", error);
            await m.reply("☣️ Internal System Error: Failed to compile logs.");
        }
    }
};
