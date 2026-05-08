const os = require("os");
const axios = require("axios");
const translate = require("google-translate-api-x");

// PICHA MPYA YA ALIVE
const MENU_IMAGE = "https://i.ibb.co/4Z7Sf3q5/Chat-GPT-Image-May-8-2026-07-10-41-PM.png";

module.exports = {
    command: "alive",
    alias: ["botalive", "systemalive", "vexalive"],
    category: "system",
    description: "Advanced live status checker",

    async execute(m, sock, { userSettings }) {

        const lang = userSettings?.lang || "en";
        const style = userSettings?.style || "normal";

        const styles = {
            harsh: {
                react: "☣️",
                title: "☣️ VEX OVERLORD STATUS ☣️",
                mode: "HARSH EXECUTION"
            },

            normal: {
                react: "⚡",
                title: "⚡ VEX AI STATUS ⚡",
                mode: "NORMAL MODE"
            },

            girl: {
                react: "💖",
                title: "💖 VEX SWEET STATUS 💖",
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
            // REAL SYSTEM DATA
            // =========================

            const totalMem = os.totalmem() / 1024 / 1024;
            const freeMem = os.freemem() / 1024 / 1024;
            const usedMem = totalMem - freeMem;

            const ramUsage = `${usedMem.toFixed(0)}MB / ${totalMem.toFixed(0)}MB`;

            const cpuLoad = os.loadavg()[0].toFixed(2);

            const platform = os.platform();
            const hostname = os.hostname();
            const nodeVersion = process.version;

            // PING - FIXED 403
            let ping = "N/A";
            try {
                const pingStart = Date.now();
                await axios.get("https://api.github.com", {
                    timeout: 5000,
                    headers: {
                        'User-Agent': 'Vex-AI-Bot/1.0'
                    }
                });
                ping = `${Date.now() - pingStart}ms`;
            } catch (e) {
                console.log("PING FAILED:", e.message);
                ping = "Timeout";
            }

            // =========================
            // RENDER ENVIRONMENT
            // =========================

            const renderService =
                process.env.RENDER_SERVICE_NAME ||
                process.env.RENDER_SERVICE_ID ||
                "Unknown";

            const renderRegion =
                process.env.RENDER_REGION ||
                "Singapore";

            const renderInstance =
                process.env.RENDER_INSTANCE_ID ||
                "Free-Tier";

            const renderHost =
                process.env.RENDER_EXTERNAL_HOSTNAME ||
                hostname;

            // =========================
            // EXTRA REALTIME DATA
            // =========================

            const currentTime = new Date().toLocaleString("en-US", {
                timeZone: "Africa/Dar_es_Salaam"
            });

            const uptimeSeconds = process.uptime();

            const days = Math.floor(uptimeSeconds / 86400);
            const hours = Math.floor((uptimeSeconds % 86400) / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            const seconds = Math.floor(uptimeSeconds % 60);

            const uptime =
                `${days}d ${hours}h ${minutes}m ${seconds}s`;

            // =========================
            // UI DESIGN
            // =========================

            const invisible = "\u200E".repeat(400);

            let caption = `
╭━━━〔 ${ui.title} 〕━━━╮

┃ 🤖 BOT: ONLINE
┃ ⚡ MODE: ${ui.mode}
┃ 🌐 PLATFORM: ${platform}
┃ 🧠 CPU LOAD: ${cpuLoad}
┃ 💾 RAM: ${ramUsage}
┃ 📡 RESPONSE: ${ping}
┃ 🔥 NODE: ${nodeVersion}

┣━━━━━━━━━━━━━━━━

┃ ☁️ HOST: RENDER
┃ 🖥️ SERVICE: ${renderService}
┃ 🌍 REGION: ${renderRegion}
┃ 📦 INSTANCE: ${renderInstance}
┃ 🔗 HOSTNAME: ${renderHost}

┣━━━━━━━━━━━━━━━━

┃ ⏳ ACTIVE: ${uptime}
┃ 🕒 TIME: ${currentTime}
┃ 👤 USER: @${m.sender.split("@")[0]}

╰━━━━━━━━━━━━━━━━━━╯

⚡ VEX AI SYSTEM ACTIVE
🚀 REALTIME ENGINE RUNNING

${invisible}
`;

            // =========================
            // TRANSLATE
            // =========================

            if (lang!== "en") {
                try {
                    const translated = await translate(caption, {
                        to: lang
                    });

                    caption = translated.text;
                } catch {}
            }

            // =========================
            // IMAGE DOWNLOAD SAFE
            // =========================

            let imageBuffer = null;

            try {
                const response = await axios.get(MENU_IMAGE, {
                    responseType: "arraybuffer",
                    timeout: 20000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'image/jpeg,image/png,image/*'
                    }
                });

                const contentType = response.headers['content-type'];
                if (contentType && contentType.startsWith('image/')) {
                    imageBuffer = Buffer.from(response.data);
                } else {
                    console.log("ALIVE IMAGE ERROR: Not an image, got", contentType);
                }

            } catch (e) {
                console.log("ALIVE IMAGE ERROR:", e.message);
            }

            // =========================
            // SEND MESSAGE - HAKUNA BUTTONS
            // =========================

            if (imageBuffer) {
                await sock.sendMessage(
                    m.chat,
                    {
                        image: imageBuffer,
                        caption,
                        mentions: [m.sender]
                    },
                    { quoted: m }
                );

            } else {
                await sock.sendMessage(
                    m.chat,
                    {
                        text: caption,
                        mentions: [m.sender]
                    },
                    { quoted: m }
                );
            }

        } catch (err) {
            console.log("ALIVE ERROR:", err);
            try {
                await sock.sendMessage(
                    m.chat,
                    {
                        text: `⚠️ Alive system error. Contact dev.`
                    },
                    { quoted: m }
                );
            } catch {}
        }
    }
};
