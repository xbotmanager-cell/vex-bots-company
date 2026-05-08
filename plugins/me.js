const os = require("os");
const fs = require("fs");
const path = require("path");

module.exports = {
    command: "me",
    alias: ["myinfo", "whoami"],
    category: "system",
    description: "Show full user profile with all details",

    async execute(m, sock, ctx) {
        const { userSettings } = ctx;
        
        // =========================
        // TAARIFA ZAKO ZA BINAFSI
        // =========================
        const ownerInfo = {
            name: m.pushName || "Lupin Starnley", // Jina la WhatsApp
            number: "255780470905",
            jid: "255780470905@s.whatsapp.net",
            country: "Tanzania 🇹🇿",
            city: "Kibaha, Pwani",
            lovelySong: "King Von - Took Her To The O 🎵",
            tiktok: {
                username: "@mrlupin76_",
                link: "https://www.tiktok.com/@mrlupin76_"
            },
            instagram: {
                username: "@mrlupin76_",
                link: "https://www.instagram.com/mrlupin76_"
            },
            facebook: {
                username: "Lupin Starnley",
                link: "https://www.facebook.com/mrlupin76"
            },
            github: "https://github.com/mrlupin76",
            email: "mrlupin76@gmail.com",
            bio: "Vex AI Creator | Bot Developer | Tech Lover 💻",
            status: "Building the future with code ⚡"
        };

        // =========================
        // SYSTEM DATA
        // =========================
        const pluginDir = path.join(__dirname, "../plugins");
        let totalCommands = 0;
        let categories = new Set();

        try {
            const files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js'));
            for (const file of files) {
                try {
                    const plugin = require(path.join(pluginDir, file));
                    if (plugin.command) totalCommands++;
                    if (plugin.category) categories.add(plugin.category.toLowerCase());
                } catch (e) { continue; }
            }
        } catch (e) {}

        const style = userSettings?.style || 'normal';
        const lang = userSettings?.lang || 'en';
        const mode = userSettings?.mode || 'public';

        // =========================
        // REAL TIME DATA
        // =========================
        const totalMem = os.totalmem() / 1024 / 1024;
        const freeMem = os.freemem() / 1024 / 1024;
        const usedMem = totalMem - freeMem;
        const ramUsage = `${usedMem.toFixed(0)}MB / ${totalMem.toFixed(0)}MB`;

        const uptimeSeconds = process.uptime();
        const days = Math.floor(uptimeSeconds / 86400);
        const hours = Math.floor((uptimeSeconds % 86400) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const uptime = `${days}d ${hours}h ${minutes}m`;

        const currentTime = new Date().toLocaleString("en-US", {
            timeZone: "Africa/Dar_es_Salaam",
            hour12: false
        });

        const platform = os.platform();
        const nodeVersion = process.version;
        const hostname = os.hostname();

        const renderService = process.env.RENDER_SERVICE_NAME || "Render-Free";
        const renderRegion = process.env.RENDER_REGION || "Singapore";

        // =========================
        // DESIGN STYLES
        // =========================
        const designs = {
            harsh: {
                react: "☣️",
                header: `╭━━━〔 ☣️ OWNER PROFILE ☣️ 〕━━━╮`,
                footer: `╰━━━━━━━━━━━━━━━━━━━━╯\n☣️ VEX OVERLORD SYSTEM`
            },
            normal: {
                react: "👑",
                header: `╭━━━〔 👑 MY PROFILE 👑 〕━━━╮`,
                footer: `╰━━━━━━━━━━━━━━━━━━━━╯\n⚡ VEX AI SYSTEM`
            },
            girl: {
                react: "💖",
                header: `🌸 ╭━━〔 💖 MY INFO 💖 〕━━╮ 🌸`,
                footer: `╰━━━━━━━━━━━━━━━━━━━━╯\n🎀 VEX AI DARLING`
            }
        };

        const d = designs[style] || designs.normal;

        try {
            await sock.sendMessage(m.chat, {
                react: { text: d.react, key: m.key }
            });

            const profileText = `
${d.header}

┃ 👤 *PERSONAL INFO*
┃ ➤ Name: ${ownerInfo.name}
┃ ➤ Number: ${ownerInfo.number}
┃ ➤ JID: ${ownerInfo.jid}
┃ ➤ Country: ${ownerInfo.country}
┃ ➤ City: ${ownerInfo.city}
┃ ➤ Bio: ${ownerInfo.bio}
┃ ➤ Status: ${ownerInfo.status}

┣━━━━━━━━━━━━━━━━

┃ 🎵 *FAVORITES*
┃ ➤ Song: ${ownerInfo.lovelySong}
┃ ➤ Style: ${style.toUpperCase()}
┃ ➤ Language: ${lang.toUpperCase()}
┃ ➤ Mode: ${mode.toUpperCase()}

┣━━━━━━━━━━━━━━━━

┃ 🌐 *SOCIAL MEDIA*
┃ ➤ TikTok: ${ownerInfo.tiktok.username}
┃   Link: ${ownerInfo.tiktok.link}
┃ ➤ Instagram: ${ownerInfo.instagram.username}
┃   Link: ${ownerInfo.instagram.link}
┃ ➤ Facebook: ${ownerInfo.facebook.username}
┃   Link: ${ownerInfo.facebook.link}
┃ ➤ GitHub: ${ownerInfo.github}
┃ ➤ Email: ${ownerInfo.email}

┣━━━━━━━━━━━━━━━━

┃ 🤖 *BOT STATS*
┃ ➤ Total Commands: ${totalCommands}
┃ ➤ Categories: ${categories.size}
┃ ➤ Platform: ${platform}
┃ ➤ Node: ${nodeVersion}
┃ ➤ Hostname: ${hostname}

┣━━━━━━━━━━━━━━━━

┃ ☁️ *SERVER INFO*
┃ ➤ Host: RENDER
┃ ➤ Service: ${renderService}
┃ ➤ Region: ${renderRegion}
┃ ➤ RAM: ${ramUsage}
┃ ➤ Uptime: ${uptime}
┃ ➤ Time: ${currentTime}

${d.footer}
`;

            await sock.sendMessage(m.chat, {
                text: profileText,
                mentions: [m.sender, ownerInfo.jid]
            }, { quoted: m });

        } catch (err) {
            console.error("PROFILE ERROR:", err);
            await sock.sendMessage(m.chat, {
                text: "❌ Failed to load profile"
            }, { quoted: m });
        }
    }
};
