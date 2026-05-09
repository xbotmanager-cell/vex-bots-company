const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// =========================
// SUPABASE - FORCED CONNECTION
// =========================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL ||!SUPABASE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for VEX Battle');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

// =========================
// GAME STATE - COOLDOWNS ONLY IN RAM
// =========================
const cooldowns = new Map(); // userId_type -> timestamp
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

// =========================
// SUPABASE HELPERS
// =========================
async function getPlayer(userId, userName = null) {
    try {
        const { data, error } = await supabase.rpc('get_or_create_player', {
            p_user_id: userId,
            p_username: userName
        });
        if (error) throw error;
        return data;
    } catch (err) {
        console.error('SUPABASE GET PLAYER ERROR:', err);
        // Fallback default
        return {
            user_id: userId,
            username: userName,
            coins: 500,
            weapons: [],
            health: 100,
            max_health: 100,
            wins: 0,
            losses: 0,
            last_collect: new Date(Date.now() - 3600000).toISOString(),
            last_daily: new Date(Date.now() - 86400000).toISOString(),
            arrest_level: 0,
            skills: { damage: 0, defense: 0 },
            streak: 0
        };
    }
}

async function updatePlayer(userId, updates) {
    try {
        const { error } = await supabase
           .from('battle_players')
           .update(updates)
           .eq('user_id', userId);
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('SUPABASE UPDATE ERROR:', err);
        return false;
    }
}

async function getLeaderboard(limit = 10) {
    try {
        const { data, error } = await supabase
           .from('battle_leaderboard')
           .select('*')
           .limit(limit);
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('SUPABASE LEADERBOARD ERROR:', err);
        return [];
    }
}

module.exports = {
    command: "battle",
    category: "games",
    description: "VEX AI Battle Arena PRO - Full economy PVP with weapons, skills & leaderboard",

    async execute(m, sock, { args }) {
        const chatId = m.chat;
        const userId = m.sender;
        const userName = m.pushName || userId.split('@')[0];

        // Get player from Supabase
        const player = await getPlayer(userId, userName);
        const action = args[0]?.toLowerCase();

        // =========================
        // 1. HELP / PROFILE
        // =========================
        if (!action || action === 'help' || action === 'profile') {
            const imgPath = await downloadImage(BATTLE_IMAGE).catch(() => null);

            const profileText = `⚔️ *VEX BATTLE ARENA PRO* ⚔️\n\n` +
                `┌─ *PLAYER STATS* ─────────\n` +
                `│ 👤 Player: ${player.username || userName}\n` +
                `│ 💰 Coins: ${player.coins}\n` +
                `│ ❤️ Health: ${player.health}/${player.max_health}\n` +
                `│ 🛡️ Defense: ${getTotalDefense(player)}\n` +
                `│ ⚔️ Damage: ${getTotalDamage(player)}\n` +
                `│ 🏆 W/L: ${player.wins}/${player.losses}\n` +
                `│ 🔥 Streak: ${player.streak}\n` +
                `│ ⚠️ Arrest: ${player.arrest_level}/5\n` +
                `└────────────────────────\n\n` +
                `*COMMANDS:*\n` +
                `.battle collect - Hourly coins\n` +
                `.battle daily - Daily reward\n` +
                `.battle shop - Weapon shop\n` +
                `.battle buy <item> - Buy item\n` +
                `.battle sell <item> - Sell 60%\n` +
                `.battle use <item> - Use medkit\n` +
                `.battle inv - Inventory\n` +
                `.battle heal - Heal 50 coins\n` +
                `.battle fight @user - PVP battle\n` +
                `.battle rob @user - Rob player\n` +
                `.battle top - Leaderboard\n` +
                `.battle cheat <code> - Secret`;

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
            const now = new Date();
            const lastCollect = new Date(player.last_collect);
            const hourMs = 3600000;

            if (now - lastCollect < hourMs) {
                const timeLeft = Math.ceil((hourMs - (now - lastCollect)) / 60000);
                return m.reply(`⏰ *COOLDOWN ACTIVE*\n\nWait ${timeLeft} minutes\nNext collect: ${new Date(lastCollect.getTime() + hourMs).toLocaleTimeString()}`);
            }

            const amount = Math.floor(Math.random() * 200) + 100;
            await updatePlayer(userId, {
                coins: player.coins + amount,
                last_collect: now.toISOString()
            });

            return m.reply(`💰 *HOURLY COLLECT*\n\n+${amount} coins collected\n💵 Balance: ${player.coins + amount}\n⏰ Next: 1 hour`);
        }

        // =========================
        // 3. DAILY REWARD
        // =========================
        if (action === 'daily') {
            const now = new Date();
            const lastDaily = new Date(player.last_daily);
            const dayMs = 86400000;

            if (now - lastDaily < dayMs) {
                const timeLeft = Math.ceil((dayMs - (now - lastDaily)) / 3600000);
                return m.reply(`⏰ *DAILY CLAIMED*\n\nNext reward in ${timeLeft} hours`);
            }

            await updatePlayer(userId, {
                coins: player.coins + DAILY_REWARD,
                last_daily: now.toISOString(),
                health: player.max_health
            });

            return m.reply(`🎁 *DAILY REWARD*\n\n💰 +${DAILY_REWARD} coins\n❤️ Health restored to ${player.max_health}\n💵 Balance: ${player.coins + DAILY_REWARD}\n\nCome back tomorrow!`);
        }

        // =========================
        // 4. SHOP
        // =========================
        if (action === 'shop') {
            let shopText = `🏪 *VEX WEAPON SHOP*\n\n💰 Your Coins: ${player.coins}\n\n`;

            shopText += `┌─ *WEAPONS* ─────────────\n`;
            Object.entries(WEAPONS).filter(([k, v]) => v.type === 'weapon').forEach(([key, w]) => {
                shopText += `│ ${w.emoji} *${w.name}* - ${w.price} coins\n`;
                shopText += `│ └ DMG: ${w.damage} |.battle buy ${key}\n`;
            });
            shopText += `└────────────────────────\n\n`;

            shopText += `┌─ *ARMOR* ─────────────\n`;
            Object.entries(WEAPONS).filter(([k, v]) => v.type === 'armor').forEach(([key, w]) => {
                shopText += `│ ${w.emoji} *${w.name}* - ${w.price} coins\n`;
                shopText += `│ └ DEF: ${w.defense} |.battle buy ${key}\n`;
            });
            shopText += `└────────────────────────\n\n`;

            shopText += `┌─ *CONSUMABLES* ─────────\n`;
            Object.entries(WEAPONS).filter(([k, v]) => v.type === 'consumable').forEach(([key, w]) => {
                shopText += `│ ${w.emoji} *${w.name}* - ${w.price} coins\n`;
                shopText += `│ └ HEAL: ${w.heal} HP |.battle buy ${key}\n`;
            });
            shopText += `└────────────────────────`;

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
                return m.reply(`❌ *INSUFFICIENT FUNDS*\n\nNeed: ${item.price}\nHave: ${player.coins}\nMissing: ${item.price - player.coins}`);
            }

            const newWeapons = [...player.weapons, itemKey];
            await updatePlayer(userId, {
                coins: player.coins - item.price,
                weapons: newWeapons
            });

            return m.reply(`✅ *PURCHASED*\n\n${item.emoji} ${item.name}\n💰 Cost: ${item.price}\n💵 Balance: ${player.coins - item.price}\n\nUse:.battle inv`);
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
            const index = player.weapons.indexOf(itemKey);
            const newWeapons = [...player.weapons];
            newWeapons.splice(index, 1);

            await updatePlayer(userId, {
                coins: player.coins + sellPrice,
                weapons: newWeapons
            });

            return m.reply(`💰 *SOLD*\n\n${item.emoji} ${item.name}\n💵 Earned: ${sellPrice} coins (60%)\n💰 Balance: ${player.coins + sellPrice}`);
        }

        // =========================
        // 7. USE ITEM (Medkit)
        // =========================
        if (action === 'use') {
            const itemKey = args[1]?.toLowerCase();

            if (!player.weapons.includes(itemKey)) return m.reply(`❌ You don't own this item`);

            const item = WEAPONS[itemKey];
            if (item.type!== 'consumable') return m.reply(`❌ This item cannot be used`);

            if (player.health >= player.max_health) return m.reply(`❤️ Health already full!`);

            const healAmount = Math.min(item.heal, player.max_health - player.health);
            const index = player.weapons.indexOf(itemKey);
            const newWeapons = [...player.weapons];
            newWeapons.splice(index, 1);

            await updatePlayer(userId, {
                health: player.health + healAmount,
                weapons: newWeapons
            });

            return m.reply(`💊 *USED MEDKIT*\n\n+${healAmount} HP restored\n❤️ Health: ${player.health + healAmount}/${player.max_health}`);
        }

        // =========================
        // 8. HEAL (Pay)
        // =========================
        if (action === 'heal') {
            if (player.health >= player.max_health) return m.reply(`❤️ Health already full!`);

            const healCost = 50;
            if (player.coins < healCost) return m.reply(`❌ Need ${healCost} coins to heal`);

            await updatePlayer(userId, {
                coins: player.coins - healCost,
                health: player.max_health
            });

            return m.reply(`❤️ *HEALED*\n\n-${healCost} coins\nHealth: ${player.max_health}/${player.max_health}\n💰 Balance: ${player.coins - healCost}`);
        }

        // =========================
        // 9. INVENTORY
        // =========================
        if (action === 'inv' || action === 'inventory') {
            const weaponCount = {};
            player.weapons.forEach(w => weaponCount[w] = (weaponCount[w] || 0) + 1);

            let invText = `🎒 *INVENTORY*\n\n`;
            invText += `┌─ *STATS* ───────────────\n`;
            invText += `│ ❤️ Health: ${player.health}/${player.max_health}\n`;
            invText += `│ 💰 Coins: ${player.coins}\n`;
            invText += `│ ⚔️ Damage: ${getTotalDamage(player)}\n`;
            invText += `│ 🛡️ Defense: ${getTotalDefense(player)}\n`;
            invText += `│ 🏆 W/L: ${player.wins}/${player.losses}\n`;
            invText += `│ 🔥 Streak: ${player.streak}\n`;
            invText += `└────────────────────────\n\n`;

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
                return m.reply(`⏰ *FIGHT COOLDOWN*\n\nWait 30 seconds between battles`);
            }

            const target = args[1]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            if (!target || target === userId) return m.reply(`❌ Tag valid enemy:.battle fight @user`);

            const enemy = await getPlayer(target, args[1]?.replace('@', ''));
            const targetName = enemy.username || args[1].replace('@', '');

            if (player.health <= 0) return m.reply(`💀 You're dead! Use.battle heal to revive (50 coins)`);
            if (enemy.health <= 0) return m.reply(`💀 Enemy already defeated!`);

            // Combat calculation
            const playerDmg = getTotalDamage(player);
            const playerDef = getTotalDefense(player);
            const enemyDmg = getTotalDamage(enemy);
            const enemyDef = getTotalDefense(enemy);

            const finalPlayerDmg = Math.max(5, playerDmg - enemyDef + Math.floor(Math.random() * 10));
            const finalEnemyDmg = Math.max(5, enemyDmg - playerDef + Math.floor(Math.random() * 10));

            const newEnemyHealth = Math.max(0, enemy.health - finalPlayerDmg);
            const newPlayerHealth = Math.max(0, player.health - finalEnemyDmg);

            setCooldown(userId, 'fight', 30000);

            let resultText = `⚔️ *BATTLE REPORT* ⚔️\n\n`;
            resultText += `┌─ *COMBAT* ─────────────\n`;
            resultText += `│ 👤 ${userName} vs ${targetName}\n`;
            resultText += `│ 💥 You: ${finalPlayerDmg} DMG (${playerDmg} ATK - ${enemyDef} DEF)\n`;
            resultText += `│ 💥 Enemy: ${finalEnemyDmg} DMG (${enemyDmg} ATK - ${playerDef} DEF)\n`;
            resultText += `│ ❤️ Your HP: ${newPlayerHealth}/${player.max_health}\n`;
            resultText += `│ ❤️ Enemy HP: ${newEnemyHealth}/${enemy.max_health}\n`;
            resultText += `└────────────────────────\n\n`;

            if (newEnemyHealth <= 0) {
                const reward = Math.floor(Math.random() * 400) + 300;
                const stolen = Math.floor(enemy.coins * 0.15);

                await updatePlayer(userId, {
                    coins: player.coins + reward + stolen,
                    health: newPlayerHealth,
                    wins: player.wins + 1,
                    streak: player.streak + 1
                });

                await updatePlayer(target, {
                    coins: Math.max(0, enemy.coins - stolen),
                    health: enemy.max_health,
                    losses: enemy.losses + 1,
                    streak: 0
                });

                resultText += `🎉 *VICTORY!*\n💰 Reward: +${reward} coins\n💸 Stolen: +${stolen} coins\n💵 Balance: ${player.coins + reward + stolen}\n🔥 Streak: ${player.streak + 1}`;
            } else if (newPlayerHealth <= 0) {
                const loss = Math.floor(player.coins * 0.1);

                await updatePlayer(userId, {
                    coins: Math.max(0, player.coins - loss),
                    health: player.max_health,
                    losses: player.losses + 1,
                    streak: 0
                });

                await updatePlayer(target, {
                    wins: enemy.wins + 1,
                    streak: enemy.streak + 1
                });

                resultText += `💀 *DEFEATED!*\n💸 Lost: ${loss} coins\n💵 Balance: ${Math.max(0, player.coins - loss)}\n🔥 Streak broken`;
            } else {
                await updatePlayer(userId, { health: newPlayerHealth });
                await updatePlayer(target, { health: newEnemyHealth });
                resultText += `⚡ *BATTLE CONTINUES!*\nAttack again or heal`;
            }

            return sock.sendMessage(chatId, { text: resultText, mentions: [userId, target] }, { quoted: m });
        }

        // =========================
        // 11. ROB
        // =========================
        if (action === 'rob') {
            if (checkCooldown(userId, 'rob')) {
                return m.reply(`⏰ *ROB COOLDOWN*\n\nWait 60 seconds between robberies`);
            }

            const target = args[1]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            if (!target || target === userId) return m.reply(`❌ Tag valid player:.battle rob @user`);

            const enemy = await getPlayer(target, args[1]?.replace('@', ''));
            if (enemy.coins < 100) return m.reply(`❌ Target too poor! Minimum 100 coins to rob`);

            const successRate = 0.6 - (player.arrest_level * 0.1);
            const success = Math.random() < successRate;

            setCooldown(userId, 'rob', 60000);

            if (success) {
                const stolen = Math.floor(enemy.coins * (Math.random() * 0.3 + 0.1));

                await updatePlayer(userId, {
                    coins: player.coins + stolen,
                    arrest_level: Math.min(5, player.arrest_level + 1)
                });

                await updatePlayer(target, {
                    coins: enemy.coins - stolen
                });

                return sock.sendMessage(chatId, {
                    text: `🦹 *ROBBERY SUCCESS*\n\n💰 Stole: ${stolen} coins\n💵 Balance: ${player.coins + stolen}\n⚠️ Arrest Level: ${Math.min(5, player.arrest_level + 1)}/5\n\n${player.arrest_level + 1 >= 3? '🚨 Police are watching!' : ''}`,
                    mentions: [userId, target]
                }, { quoted: m });
            } else {
                const newArrestLevel = player.arrest_level + 2;
                const fine = Math.floor(player.coins * 0.25);

                if (newArrestLevel >= 5) {
                    await updatePlayer(userId, {
                        arrest_level: 0,
                        coins: Math.max(100, player.coins - 600)
                    });

                    return sock.sendMessage(chatId, {
                        text: `🚨 *ARRESTED!* 🚨\n\n❌ Robbery failed!\n🔒 Jail time! Lost 600 coins\n💸 Fine: ${fine} coins\n⚠️ Arrest reset to 0\n💵 Balance: ${Math.max(100, player.coins - 600)}`,
                        mentions: [userId]
                    }, { quoted: m });
                }

                await updatePlayer(userId, {
                    coins: Math.max(0, player.coins - fine),
                    arrest_level: newArrestLevel
                });

                return sock.sendMessage(chatId, {
                    text: `🚨 *CAUGHT!* 🚨\n\n❌ Robbery failed!\n💸 Fine: ${fine} coins\n⚠️ Arrest Level: ${newArrestLevel}/5\n💵 Balance: ${Math.max(0, player.coins - fine)}`,
                    mentions: [userId]
                }, { quoted: m });
            }
        }

        // =========================
        // 12. LEADERBOARD
        // =========================
        if (action === 'top' || action === 'leaderboard') {
            const leaderboard = await getLeaderboard(10);

            if (leaderboard.length === 0) return m.reply("📊 No warriors yet. Start fighting!");

            const leaderboardText = await Promise.all(leaderboard.map(async (p, i) => {
                const name = p.username || p.user_id.split('@')[0];
                const medal = i === 0? '🥇' : i === 1? '🥈' : i === 2? '🥉' : `${i + 1}.`;
                return `${medal} ${name}\n └ ${p.wins}W/${p.losses}L | ${p.coins} coins | ${p.streak}🔥`;
            }));

            return m.reply(`🏆 *BATTLE LEADERBOARD*\n${'━'.repeat(25)}\n\n${leaderboardText.join('\n\n')}\n\n${'━'.repeat(25)}\nFight to rank up!`);
        }

        // =========================
        // 13. CHEAT
        // =========================
        if (action === 'cheat') {
            const code = args[1];
            if (code === CHEAT_CODE) {
                const newWeapons = [...player.weapons, 'sniper', 'vest'];
                await updatePlayer(userId, {
                    coins: player.coins + 10000,
                    weapons: newWeapons,
                    health: player.max_health
                });
                return m.reply(`🎁 *GODMODE ACTIVATED*\n\n💰 +10,000 coins\n🎯 +Sniper\n🦺 +Vest\n❤️ Full heal\n\n💵 Balance: ${player.coins + 10000}\n\n🤫 Keep secret!`);
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
    let damage = 5;
    const weapons = player.weapons || [];
    weapons.forEach(w => {
        if (WEAPONS[w]?.damage) damage += WEAPONS[w].damage;
    });
    const skills = player.skills || { damage: 0, defense: 0 };
    return damage + skills.damage;
}

function getTotalDefense(player) {
    let defense = 0;
    const weapons = player.weapons || [];
    weapons.forEach(w => {
        if (WEAPONS[w]?.defense) defense += WEAPONS[w].defense;
    });
    const skills = player.skills || { damage: 0, defense: 0 };
    return defense + skills.defense;
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
