const os = require("os");
const axios = require("axios");
const translate = require("google-translate-api-x");

const MENU_IMAGE = "https://i.ibb.co/7JXpzLf6/menu.jpg";

module.exports = {
    command: "ping2",
    alias: ["speed2", "latency2", "response2"],
    category: "system",
    description: "Advanced realtime ping checker",

    async execute(m, sock, { userSettings }) {

        const lang = userSettings?.lang || "en";
        const style = userSettings?.style || "normal";

        const styles = {
            harsh: {
                react: "☣️",
                title: "☣️ VEX LATENCY CORE ☣️",
                mode: "HARSH EXECUTION"
            },

            normal: {
                react: "⚡",
                title: "⚡ VEX RESPONSE PANEL ⚡",
                mode: "NORMAL MODE"
            },

            girl: {
                react: "💖",
                title: "💖 VEX SPEED STATUS 💖",
                mode: "CUTE MODE"
            }
        };

        const ui = styles[style] || styles.normal;

        try {

            await sock.sendMessage(m.chat, {
                react: {
                    text: ui.react,
                    key: m.key
                }
            });

            // =========================
            // REALTIME SPEED TEST
            // =========================

            const start = Date.now();

            await axios.get("https://api.github.com", {
                timeout: 10000
            });

            const end = Date.now();

            const latency = end - start;

            // =========================
            // SYSTEM DATA
            // =========================

            const totalMem = os.totalmem() / 1024 / 1024;
            const freeMem = os.freemem() / 1024 / 1024;
            const usedMem = totalMem - freeMem;

            const ramUsage =
                `${usedMem.toFixed(0)}MB / ${totalMem.toFixed(0)}MB`;

            const cpuLoad = os.loadavg()[0].toFixed(2);

            const platform = os.platform();
            const hostname = os.hostname();

            const renderService =
                process.env.RENDER_SERVICE_NAME ||
                process.env.RENDER_SERVICE_ID ||
                "Unknown";

            const renderRegion =
                process.env.RENDER_REGION ||
                "Singapore";

            // =========================
            // SPEED STATUS
            // =========================

            let speedStatus = "Excellent";

            if (latency >= 150) speedStatus = "Good";
            if (latency >= 300) speedStatus = "Slow";
            if (latency >= 500) speedStatus = "Very Slow";

            // =========================
            // UPTIME
            // =========================

            const uptimeSeconds = process.uptime();

            const hours = Math.floor(uptimeSeconds / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            const seconds = Math.floor(uptimeSeconds % 60);

            const uptime =
                `${hours}h ${minutes}m ${seconds}s`;

            // =========================
            // DESIGN
            // =========================

            const invisible = "\u200E".repeat(400);

            let caption = `
╭━━━〔 ${ui.title} 〕━━━╮

┃ ⚡ Response Time: ${latency}ms
┃ 📡 Network Status: ${speedStatus}
┃ 🌐 Platform: ${platform}
┃ 🖥️ Host: ${hostname}

┣━━━━━━━━━━━━━━━━

┃ ☁️ Server: Render
┃ 📦 Service: ${renderService}
┃ 🌍 Region: ${renderRegion}
┃ 💾 RAM Usage: ${ramUsage}
┃ 🧠 CPU Load: ${cpuLoad}

┣━━━━━━━━━━━━━━━━

┃ ⏳ Runtime: ${uptime}
┃ 🔥 Engine: VEX AI
┃ ⚙️ Mode: ${ui.mode}
┃ 👤 User: @${m.sender.split("@")[0]}

╰━━━━━━━━━━━━━━━━━━╯

🚀 Realtime Response Successful
⚡ VEX AI System Running Stable

${invisible}
`;

            // =========================
            // TRANSLATE
            // =========================

            if (lang !== "en") {

                try {

                    const translated = await translate(caption, {
                        to: lang
                    });

                    caption = translated.text;

                } catch {}
            }

            // =========================
            // SAFE IMAGE DOWNLOAD
            // =========================

            let imageBuffer = null;

            try {

                const response = await axios.get(MENU_IMAGE, {
                    responseType: "arraybuffer",
                    timeout: 15000
                });

                imageBuffer = Buffer.from(response.data);

            } catch (e) {
                console.log("PING2 IMAGE ERROR:", e.message);
            }

            // =========================
            // BUTTONS
            // =========================

            const buttons = [
                {
                    buttonId: ".menu",
                    buttonText: {
                        displayText: "📂 MENU"
                    },
                    type: 1
                },
                {
                    buttonId: ".alive",
                    buttonText: {
                        displayText: "⚡ ALIVE"
                    },
                    type: 1
                }
            ];

            // =========================
            // SEND MESSAGE
            // =========================

            if (imageBuffer) {

                await sock.sendMessage(
                    m.chat,
                    {
                        image: imageBuffer,
                        caption,
                        footer: "VEX AI • REALTIME PING",
                        buttons,
                        headerType: 4,
                        mentions: [m.sender]
                    },
                    { quoted: m }
                );

            } else {

                await sock.sendMessage(
                    m.chat,
                    {
                        text: caption,
                        footer: "VEX AI • REALTIME PING",
                        buttons,
                        headerType: 1,
                        mentions: [m.sender]
                    },
                    { quoted: m }
                );
            }

        } catch (err) {

            console.log("PING2 ERROR:", err);

            try {

                await sock.sendMessage(
                    m.chat,
                    {
                        text: `⚠️ Ping2 recovered from error:\n${err.message}`
                    },
                    { quoted: m }
                );

            } catch {}
        }
    }
};
