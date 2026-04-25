// VEX MINI BOT - VEX: vault
// Nova: Global Repository for Cracked Games & Software
// Dev: Lupin Starnley

module.exports = {
    vex: 'vault',
    cyro: 'premium',
    nova: 'Provides direct links to top-tier cracked game repositories for PC, Android, and iOS',

    async execute(m, sock) {
        // 1. INPUT EXTRACTION (.vault pc / .vault android / .vault ios)
        const args = m.message?.conversation?.split(' ').slice(1) || 
                     m.message?.extendedTextMessage?.text?.split(' ').slice(1);
        
        const category = args[0]?.toLowerCase();

        if (!category || !['pc', 'android', 'ios', 'iphone'].includes(category)) {
            return await sock.sendMessage(m.key.remoteJid, { 
                text: "*⚠️ VEX-VAULT ERROR:*\nPlease specify a category.\nExample: `.vault pc` or `.vault android`" 
            }, { quoted: m });
        }

        await sock.sendMessage(m.key.remoteJid, { react: { text: "🎮", key: m.key } });

        // 2. DATABASE OF TRUSTED REPOSITORIES
        const repositories = {
            pc: [
                { name: "FitGirl Repacks", link: "https://fitgirl-repacks.site/", type: "Compressed Repacks" },
                { name: "DODI Repacks", link: "https://dodi-repacks.site/", type: "Fast Installation" },
                { name: "Skidrow Reloaded", link: "https://www.skidrowreloaded.com/", type: "Scene Releases" },
                { name: "Ocean of Games", link: "http://oceanofgames.com/", type: "Direct Download" },
                { name: "SteamUnlocked", link: "https://steamunlocked.net/", type: "Pre-installed" },
                { name: "GOG-Games", link: "https://gog-games.to/", type: "DRM-Free" },
                { name: "Igg-Games", link: "https://igg-games.com/", type: "Classic/Indie" },
                { name: "Rutracker", link: "https://rutracker.org/", type: "Torrent Master" },
                { name: "1337x", link: "https://1337x.to/", type: "General Torrent" },
                { name: "GamesTorrents", link: "https://www.gamestorrents.fm/", type: "Multilingual Torrents" }
            ],
            android: [
                { name: "Mobilism", link: "https://forum.mobilism.org/", type: "Top Forum" },
                { name: "ReXdl", link: "https://rexdl.com/", type: "Mods & Data" },
                { name: "RevDl", link: "https://www.revdl.com/", type: "Fast Links" },
                { name: "Android-1", link: "https://android-1.com/en/", type: "Unlimited Coins/Gems" },
                { name: "Happymod", link: "https://www.happymod.com/", type: "App Store for Mods" },
                { name: "APKPure", link: "https://apkpure.com/", type: "Global APKs" },
                { name: "ApkMirror", link: "https://www.apkmirror.com/", type: "Safe Updates" },
                { name: "ApkModDone", link: "https://apkmoddone.com/", type: "Game Modifications" },
                { name: "PlatinMods", link: "https://platinmods.com/", type: "Premium Mods" },
                { name: "Sbenny", link: "https://sbenny.com/", type: "Exclusive Mods" }
            ],
            ios: [
                { name: "iOSGods", link: "https://iosgods.com/", type: "Best for Hacks" },
                { name: "AppValley", link: "https://appvalley.vip/", type: "Third-party Store" },
                { name: "TweakBox", link: "https://www.tweakboxapp.com/", type: "No Jailbreak" },
                { name: "Ignition", link: "https://ignition.fun/", type: "IPA Library" },
                { name: "Panda Helper", link: "https://www.pandahelp.vip/", type: "Global Support" },
                { name: "CokernutX", link: "https://www.cokernutx.com/", type: "Premium IPAs" },
                { name: "AltStore", link: "https://altstore.io/", type: "Sideloading Expert" },
                { name: "EonHub", link: "https://eonhubapp.com/", type: "No Revoke" },
                { name: "TopStore", link: "https://topstorevipapp.com/", type: "Tweaked Games" },
                { name: "AppCake", link: "https://iphonecake.com/", type: "Legacy Support" }
            ]
        };

        const list = repositories[category === 'iphone' ? 'ios' : category];

        // 3. CONSTRUCT THE VAULT MESSAGE
        let vaultMsg = `╭━━━〔 🎮 *VEX: GAMING-VAULT* 〕━━━╮\n`;
        vaultMsg += `┃ 🌟 *Category:* ${category.toUpperCase()}\n`;
        vaultMsg += `┃ 👤 *Master:* Lupin Starnley\n`;
        vaultMsg += `┃ 🧬 *Engine:* Cyro-Premium V2\n`;
        vaultMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;

        vaultMsg += `*🛰️ TRUSTED REPOSITORIES (CRACKED)*\n\n`;

        list.forEach((site, index) => {
            vaultMsg += `*${index + 1}. ${site.name}* ✅\n`;
            vaultMsg += `| ◈ *Tag:* ${site.type}\n`;
            vaultMsg += `| ◈ *Link:* ${site.link}\n`;
            vaultMsg += `╰───────────────╯\n`;
        });

        vaultMsg += `\n*📢 SYSTEM NOTE*\n`;
        vaultMsg += `┃ 💠 Use an Ad-blocker for best experience.\n`;
        vaultMsg += `┃ 💠 Download at your own risk.\n`;
        vaultMsg += `┃ 🛰️ *Powered by:* VEX Arsenal\n`;
        vaultMsg += `╰━━━━━━━━━━━━━━━━━━━━╯\n\n`;
        vaultMsg += `_VEX MINI BOT: Unleash The Player_`;

        await sock.sendMessage(m.key.remoteJid, { text: vaultMsg }, { quoted: m });
    }
};