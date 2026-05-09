const fs = require('fs');
const path = require('path');
const axios = require('axios');

// =========================
// GAME STATE - RAM ONLY
// =========================
const players = new Map(); // userId -> player data
const battles = new Map(); // chatId -> active battle
const cooldowns = new Map(); // userId -> {collect, fight, rob}

const BATTLE_IMAGE = 'https://i.ibb.co/4Z7Sf3q5/Chat-GPT-Image-May-8-2026-07-10-41-PM.png';

// =========================
// WEAPONS & ARMOR SHOP
// =========================
const WEAPONS = {
    knife: { name: "Knife", price: 100, damage: 10, emoji: "🔪", type: "weapon" },
    pistol: { name: "Pistol", price: 500, damage: 25, emoji: "🔫", type: "weapon" },
    rifle: { name: "Rifle", price: 1500, damage: 50, emoji: "🔫", type: "weapon" },
    bazooka: { name: "Bazooka", price: 5000, damage: 100, emoji: "💣", type: "weapon" },
    katana: { name: "Katana", price: 3000, damage: 75, emoji: "⚔️", type: "weapon" },
    sniper: { name: "Sniper", price: 8000, damage: 150, emoji: "🎯", type: "weapon" },
    shield: { name: "Shield", price: 300, defense: 15, emoji: "🛡️", type: "armor" },
    vest: { name: "Kevlar Vest", price: 1000, defense: 30, emoji: "🦺", type: "armor" },
    helmet: { name: "Helmet", price: 600, defense: 20, emoji: "🪖", type: "armor" },
    medkit: { name: "Medkit", price: 200, heal: 50, emoji: "💊", type: "consumable" }
};

const CHEAT_CODE = "VEX2026GODMODE";
const DAILY_REWARD = 1000;

module.exports = {
    command: "battle",
    category: "games",
    description: "VEX AI Battle Arena PRO - Full economy PVP with weapons, skills & leaderboard",

    async execute(m, sock, { args }) {
        const chatId = m.chat;
        const userId = m.sender;
        const userName = m.pushName || userId.split('@')[0];

        // Initialize player
        if (!players.has(userId)) {
            players.set(userId, {
                coins: 500,
                weapons: [],
                health: 100,
                maxHealth: 100,
                wins: 0,
                losses: 0,
                lastCollect: 0,
                lastDaily: 0,
                arrestLevel: 0,
                skills: { damage: 0, defense: 0 },
                streak: 0
            });
        }

        const player = players.get(userId);
        const action = args[0]?.toLowerCase();

        // =========================
        // 1. HELP / PROFILE
        // =========================
        if (!action || action === 'help' || action === 'profile') {
            const imgPath = await downloadImage(BATTLE_IMAGE).catch(() => null);

            const profileText = `⚔️ *VEX BATTLE ARENA PRO* ⚔️\n\n👤 Player: ${userName}\n💰 Coins: ${player.coins}\n❤️ Health: ${player.health}/${player.maxHealth}\n🛡️ Defense: ${getTotalDefense(player)}\n⚔️ Damage: ${getTotalDamage(player)}\n🏆 W/L: ${player.wins}/${player.losses}\n🔥 Streak: ${player.streak}\n⚠️ Arrest: ${player.arrestLevel}/5\n\n*COMMANDS:*\n.battle collect - Hourly coins\n.battle daily - Daily reward\n.battle shop - Weapon shop\n.battle buy <item> - Buy item\n.battle sell <item> - Sell 60%\n.battle use <item> - Use medkit\n.battle inv - Inventory\n.battle heal - Heal 50 coins\n.battle fight @user - PVP battle\n.battle rob @user - Rob player\n.battle top - Leaderboard\n.battle cheat <code> - Secret`;

            if (imgPath) {
                await sock.sendMessage(chatId, {
                    image: { url: imgPath },
                    caption: profileText,
                    mentions: [userId]
                }, { quoted: m });
                fs.unlinkSync(imgPath);
            } else {
                await m.reply(profileText);
            }
            return;
        }

        // =========================
        // 2. HOURLY COLLECT
        // =========================
        if (action === 'collect') {
            const now = Date.now();
            const hourMs = 3600000;

            if (now - player.lastCollect < hourMs) {
                const timeLeft = Math.ceil((hourMs - (now - player.lastCollect)) / 60000);
                return m.reply(`⏰ Cooldown active! Wait ${timeLeft} minutes\n\nNext collect: ${new Date(player.lastCollect + hourMs).toLocaleTimeString()}`);
            }

            const amount = Math.floor(Math.random() * 200) + 100; // 100-300
            player.coins += amount;
            player.lastCollect = now;

            return m.reply(`💰 *HOURLY COLLECT*\n\n+${amount} coins collected\n💵 Balance: ${player.coins}\n⏰ Next: 1 hour`);
        }

        // =========================
        // 3. DAILY REWARD
        // =========================
        if (action === 'daily') {
            const now = Date.now();
            const dayMs = 86400000;

            if (now - player.lastDaily < dayMs) {
                const timeLeft = Math.ceil((dayMs - (now - player.lastDaily)) / 3600000);
                return m.reply(`⏰ Daily already claimed!\n\nNext reward in ${timeLeft} hours`);
            }

            player.coins += DAILY_REWARD;
            player.lastDaily = now;
            player.health = player.maxHealth; // Full heal

            return m.reply(`🎁 *DAILY REWARD*\n\n💰 +${DAILY_REWARD} coins\n❤️ Health restored to ${player.maxHealth}\n💵 Balance: ${player.coins}\n\nCome back tomorrow!`);
        }

        // =========================
        // 4. SHOP
        // =========================
        if (action === 'shop') {
            let shopText = `🏪 *VEX WEAPON SHOP*\n\n💰 Your Coins: ${player.coins}\n\n*WEAPONS:*\n`;

            Object.entries(WEAPONS).filter(([k,v]) => v.type === 'weapon').forEach(([key, w]) => {
                shopText += `${w.emoji} *${w.name}* - ${w.price} coins\n └ DMG: ${w.damage}\n └.battle buy ${key}\n\n`;
            });

            shopText += `*ARMOR:*\n`;
            Object.entries(WEAPONS).filter(([k,v]) => v.type === 'armor').forEach(([key, w]) => {
                shopText += `${w.emoji} *${w.name}* - ${w.price} coins\n └ DEF: ${w.defense}\n └.battle buy ${key}\n\n`;
            });

            shopText += `*CONSUMABLES:*\n`;
            Object.entries(WEAPONS).filter(([k,v]) => v.type === 'consumable').forEach(([key, w]) => {
                shopText += `${w.emoji} *${w.name}* - ${w.price} coins\n └ HEAL: ${w.heal} HP\n └.battle buy ${key}\n\n`;
            });

            return m.reply(shopText);
        }

        // =========================
        // 5. BUY ITEM
        // =========================
        if (action === 'buy') {
            const itemKey = args[1]?.toLowerCase();
            const item = WEAPONS[itemKey];

            if (!item) return m.reply(`❌ Item not found! Check.battle shop`);

            if (player.coins < item.price) {
                return m.reply(`❌ Insufficient funds!\n\nNeed: ${item.price}\nHave: ${player.coins}\nMissing: ${item.price - player.coins}`);
            }

            player.coins -= item.price;
            player.weapons.push(itemKey);

            return m.reply(`✅ *PURCHASED*\n\n${item.emoji} ${item.name}\n💰 Cost: ${item.price}\n💵 Balance: ${player.coins}\n\nUse:.battle inv`);
        }

        // =========================
        // 6. SELL ITEM
        // =========================
        if (action === 'sell') {
            const itemKey = args[1]?.toLowerCase();
            const item = WEAPONS[itemKey];

            if (!item) return m.reply(`❌ Item not found!`);
            if (!player.weapons.includes(itemKey)) return m.reply(`❌ You don't own ${item.name}`);

            const sellPrice = Math.floor(item.price * 0.6);
            player.coins += sellPrice;
            const index = player.weapons.indexOf(itemKey);
            player.weapons.splice(index, 1);

            return m.reply(`💰 *SOLD*\n\n${item.emoji} ${item.name}\n💵 Earned: ${sellPrice} coins (60%)\n💰 Balance: ${player.coins}`);
        }

        // =========================
        // 7. USE ITEM (Medkit)
        // =========================
        if (action === 'use') {
            const itemKey = args[1]?.toLowerCase();

            if (!player.weapons.includes(itemKey)) return m.reply(`❌ You don't own this item`);

            const item = WEAPONS[itemKey];
            if (item.type!== 'consumable') return m.reply(`❌ This item cannot be used`);

            if (player.health >= player.maxHealth) return m.reply(`❤️ Health already full!`);

            const healAmount = Math.min(item.heal, player.maxHealth - player.health);
            player.health += healAmount;

            const index = player.weapons.indexOf(itemKey);
            player.weapons.splice(index, 1);

            return m.reply(`💊 *USED MEDKIT*\n\n+${healAmount} HP restored\n❤️ Health: ${player.health}/${player.maxHealth}`);
        }

        // =========================
        // 8. HEAL (Pay)
        // =========================
        if (action === 'heal') {
            if (player.health >= player.maxHealth) return m.reply(`❤️ Health already full!`);

            const healCost = 50;
            if (player.coins < healCost) return m.reply(`❌ Need ${healCost} coins to heal`);

            player.coins -= healCost;
            player.health = player.maxHealth;

            return m.reply(`❤️ *HEALED*\n\n-${healCost} coins\nHealth: ${player.health}/${player.maxHealth}\n💰 Balance: ${player.coins}`);
        }

        // =========================
        // 9. INVENTORY
        // =========================
        if (action === 'inv' || action === 'inventory') {
            const weaponCount = {};
            player.weapons.forEach(w => weaponCount[w] = (weaponCount[w] || 0) + 1);

            let invText = `🎒 *INVENTORY*\n\n❤️ Health: ${player.health}/${player.maxHealth}\n💰 Coins: ${player.coins}\n⚔️ Damage: ${getTotalDamage(player)}\n🛡️ Defense: ${getTotalDefense(player)}\n🏆 W/L: ${player.wins}/${player.losses}\n🔥 Streak: ${player.streak}\n\n`;

            if (player.weapons.length === 0) {
                invText += `❌ No items owned\nBuy:.battle shop`;
            } else {
                invText += `*ITEMS:*\n`;
                Object.entries(weaponCount).forEach(([key, count]) => {
                    const w = WEAPONS[key];
                    const stat = w.damage? `DMG ${w.damage}` : w.defense? `DEF ${w.defense}` : `HEAL ${w.heal}`;
                    invText += `${w.emoji} ${w.name} x${count} (${stat})\n`;
                });
            }

            return m.reply(invText);
        }

        // =========================
        // 10. FIGHT PVP
        // =========================
        if (action === 'fight' || action === 'attack') {
            if (checkCooldown(userId, 'fight')) {
                return m.reply(`⏰ Fight cooldown! Wait 30 seconds`);
            }

            const target = args[1]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            if (!target || target === userId) return m.reply(`❌ Tag valid enemy:.battle fight @user`);

            if (!players.has(target)) {
                players.set(target, { coins: 500, weapons: [], lastCollect: 0, lastDaily: 0, arrestLevel: 0, wins: 0, losses: 0, health: 100, maxHealth: 100, skills: { damage: 0, defense: 0 }, streak: 0 });
            }

            const enemy = players.get(target);
            const targetName = args[1].replace('@', '');

            if (player.health <= 0) return m.reply(`💀 You're dead! Use.battle heal to revive (50 coins)`);
            if (enemy.health <= 0) return m.reply(`💀 Enemy already defeated!`);

            // Combat calculation
            const playerDmg = getTotalDamage(player);
            const playerDef = getTotalDefense(player);
            const enemyDmg = getTotalDamage(enemy);
            const enemyDef = getTotalDefense(enemy);

            const finalPlayerDmg = Math.max(5, playerDmg - enemyDef + Math.floor(Math.random() * 10));
            const finalEnemyDmg = Math.max(5, enemyDmg - playerDef + Math.floor(Math.random() * 10));

            enemy.health -= finalPlayerDmg;
            player.health -= finalEnemyDmg;

            setCooldown(userId, 'fight', 30000);

            let resultText = `⚔️ *BATTLE REPORT* ⚔️\n\n👤 ${userName} vs ${targetName}\n\n`;
            resultText += `💥 You: ${finalPlayerDmg} DMG (${playerDmg} ATK - ${enemyDef} DEF)\n`;
            resultText += `💥 Enemy: ${finalEnemyDmg} DMG (${enemyDmg} ATK - ${playerDef} DEF)\n\n`;
            resultText += `❤️ Your HP: ${Math.max(0, player.health)}/${player.maxHealth}\n`;
            resultText += `❤️ Enemy HP: ${Math.max(0, enemy.health)}/${enemy.maxHealth}\n\n`;

            if (enemy.health <= 0) {
                const reward = Math.floor(Math.random() * 400) + 300;
                const stolen = Math.floor(enemy.coins * 0.15);
                player.coins += reward + stolen;
                enemy.coins = Math.max(0, enemy.coins - stolen);
                player.wins++;
                enemy.losses++;
                player.streak++;
                enemy.streak = 0;
                enemy.health = enemy.maxHealth;

                resultText += `🎉 *VICTORY!*\n💰 Reward: +${reward} coins\n💸 Stolen: +${stolen} coins\n💵 Balance: ${player.coins}\n🔥 Streak: ${player.streak}`;
            } else if (player.health <= 0) {
                const loss = Math.floor(player.coins * 0.1);
                player.coins = Math.max(0, player.coins - loss);
                player.losses++;
                enemy.wins++;
                player.streak = 0;
                enemy.streak++;
                player.health = player.maxHealth;

                resultText += `💀 *DEFEATED!*\n💸 Lost: ${loss} coins\n💵 Balance: ${player.coins}\n🔥 Streak broken`;
            } else {
                resultText += `⚡ *BATTLE CONTINUES!*\nAttack again or heal`;
            }

            return sock.sendMessage(chatId, { text: resultText, mentions: [userId, target] }, { quoted: m });
        }

        // =========================
        // 11. ROB
        // =========================
        if (action === 'rob') {
            if (checkCooldown(userId, 'rob')) {
                return m.reply(`⏰ Rob cooldown! Wait 60 seconds`);
            }

            const target = args[1]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            if (!target || target === userId) return m.reply(`❌ Tag valid player:.battle rob @user`);

            if (!players.has(target)) {
                players.set(target, { coins: 500, weapons: [], lastCollect: 0, lastDaily: 0, arrestLevel: 0, wins: 0, losses: 0, health: 100, maxHealth: 100, skills: { damage: 0, defense: 0 }, streak: 0 });
            }

            const enemy = players.get(target);
            if (enemy.coins < 100) return m.reply(`❌ Target too poor! Minimum 100 coins to rob`);

            const successRate = 0.6 - (player.arrestLevel * 0.1); // Higher arrest = lower success
            const success = Math.random() < successRate;

            setCooldown(userId, 'rob', 60000);

            if (success) {
                const stolen = Math.floor(enemy.coins * (Math.random() * 0.3 + 0.1));
                player.coins += stolen;
                enemy.coins -= stolen;
                player.arrestLevel = Math.min(5, player.arrestLevel + 1);

                return sock.sendMessage(chatId, {
                    text: `🦹 *ROBBERY SUCCESS*\n\n💰 Stole: ${stolen} coins\n💵 Balance: ${player.coins}\n⚠️ Arrest Level: ${player.arrestLevel}/5\n\n${player.arrestLevel >= 3? '🚨 Police are watching!' : ''}`,
                    mentions: [userId, target]
                }, { quoted: m });
            } else {
                player.arrestLevel += 2;
                const fine = Math.floor(player.coins * 0.25);

                if (player.arrestLevel >= 5) {
                    player.arrestLevel = 0;
                    player.coins = Math.max(100, player.coins - 600);
                    return sock.sendMessage(chatId, {
                        text: `🚨 *ARRESTED!* 🚨\n\n❌ Robbery failed!\n🔒 Jail time! Lost 600 coins\n💸 Fine: ${fine} coins\n⚠️ Arrest reset to 0\n💵 Balance: ${player.coins}`,
                        mentions: [userId]
                    }, { quoted: m });
                }

                player.coins = Math.max(0, player.coins - fine);
                return sock.sendMessage(chatId, {
                    text: `🚨 *CAUGHT!* 🚨\n\n❌ Robbery failed!\n💸 Fine: ${fine} coins\n⚠️ Arrest Level: ${player.arrestLevel}/5\n💵 Balance: ${player.coins}`,
                    mentions: [userId]
                }, { quoted: m });
            }
        }

        // =========================
        // 12. LEADERBOARD
        // =========================
        if (action === 'top' || action === 'leaderboard') {
            const sorted = Array.from(players.entries())
              .sort((a, b) => b[1].wins - a[1].wins)
              .slice(0, 10);

            if (sorted.length === 0) return m.reply("📊 No warriors yet. Start fighting!");

            const leaderboard = await Promise.all(sorted.map(async ([id, p], i) => {
                const name = await sock.getName(id) || id.split('@')[0];
                const medal = i === 0? '🥇' : i === 1? '🥈' : i === 2? '🥉' : `${i + 1}.`;
                return `${medal} ${name}\n └ ${p.wins}W/${p.losses}L | ${p.coins} coins`;
            }));

            return m.reply(`🏆 *BATTLE LEADERBOARD*\n━━━━━━━━━━━━━━\n\n${leaderboard.join('\n\n')}\n\n━━━━━━━━━━━━━━\nFight to rank up!`);
        }

        // =========================
        // 13. CHEAT
        // =========================
        if (action === 'cheat') {
            const code = args[1];
            if (code === CHEAT_CODE) {
                player.coins += 10000;
                player.weapons.push('sniper', 'vest');
                player.health = player.maxHealth;
                return m.reply(`🎁 *GODMODE ACTIVATED*\n\n💰 +10,000 coins\n🎯 +Sniper\n🦺 +Vest\n❤️ Full heal\n\n💵 Balance: ${player.coins}\n\n🤫 Keep secret!`);
            } else {
                return m.reply(`❌ Invalid code!`);
            }
        }

        return m.reply(`❌ Unknown command. Use.battle help`);
    }
};

// =========================
// HELPERS
// =========================
function getTotalDamage(player) {
    let damage = 5; // Base
    player.weapons.forEach(w => {
        if (WEAPONS[w]?.damage) damage += WEAPONS[w].damage;
    });
    return damage + player.skills.damage;
}

function getTotalDefense(player) {
    let defense = 0;
    player.weapons.forEach(w => {
        if (WEAPONS[w]?.defense) defense += WEAPONS[w].defense;
    });
    return defense + player.skills.defense;
}

function checkCooldown(userId, type) {
    const key = `${userId}_${type}`;
    const last = cooldowns.get(key) || 0;
    return Date.now() - last < 0;
}

function setCooldown(userId, type, ms) {
    const key = `${userId}_${type}`;
    cooldowns.set(key, Date.now() + ms);
}

async function downloadImage(url) {
    const imgPath = path.join(__dirname, `../temp/battle_${Date.now()}.png`);
    const writer = fs.createWriteStream(imgPath);

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(imgPath));
        writer.on('error', reject);
    });
}
