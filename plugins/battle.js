const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Game state - RAM based, no DB
const players = new Map(); // userId -> { coins, weapons, lastCollect, arrestLevel, wins, losses }
const BATTLE_IMAGE = 'https://i.ibb.co/4Z7Sf3q5/Chat-GPT-Image-May-8-2026-07-10-41-PM.png';

// Weapons shop - English code
const WEAPONS = {
    knife: { name: "Knife", price: 100, damage: 10, emoji: "🔪" },
    pistol: { name: "Pistol", price: 500, damage: 25, emoji: "🔫" },
    rifle: { name: "Rifle", price: 1500, damage: 50, emoji: "🔫" },
    bazooka: { name: "Bazooka", price: 5000, damage: 100, emoji: "💣" },
    shield: { name: "Shield", price: 300, defense: 15, emoji: "🛡️" }
};

const CHEAT_CODE = "VEX2026GODMODE"; // Secret cheat code

module.exports = {
    command: "battle",
    alias: ["fight", "pvp", "war"],
    category: "game",
    description: "VEX AI Battle - Full economy war game with weapons and rob system",

    async execute(m, sock, { args }) {
        const chatId = m.chat;
        const userId = m.sender;
        const userName = m.pushName || userId.split('@')[0];

        // Initialize player if not exists
        if (!players.has(userId)) {
            players.set(userId, {
                coins: 500, // Starting coins
                weapons: [],
                lastCollect: 0,
                arrestLevel: 0,
                wins: 0,
                losses: 0,
                health: 100
            });
        }

        const player = players.get(userId);
        const action = args[0]?.toLowerCase();

        // =========================
        // 1. START / HELP
        // =========================
        if (!action || action === 'help') {
            const imgPath = await downloadImage(BATTLE_IMAGE);

            await sock.sendMessage(chatId, {
                image: { url: imgPath },
                caption: `⚔️ *VEX BATTLE ARENA* ⚔️\n\n👤 Player: ${userName}\n💰 Coins: ${player.coins}\n❤️ Health: ${player.health}/100\n🏆 Wins: ${player.wins} | 💀 Losses: ${player.losses}\n\n*COMMANDS:*\n.battle collect - Collect hourly coins\n.battle shop - View weapon shop\n.battle buy <weapon> - Buy weapon\n.battle sell <weapon> - Sell weapon\n.battle inv - Check inventory\n.battle fight @user - Attack player\n.battle rob @user - Rob player\n.battle balance - Check coins\n.battle cheat <code> - Secret code`,
                mentions: [userId]
            }, { quoted: m });

            fs.unlinkSync(imgPath); // Delete cache
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
                return m.reply(`⏰ Wait ${timeLeft} minutes for next collection!`);
            }

            const amount = Math.floor(Math.random() * 150) + 50; // 50-200 coins
            player.coins += amount;
            player.lastCollect = now;

            return m.reply(`💰 *COINS COLLECTED!*\n\n+${amount} coins added\n💵 Balance: ${player.coins}\n\nNext collect in 1 hour`);
        }

        // =========================
        // 3. SHOP
        // =========================
        if (action === 'shop') {
            let shopText = `🏪 *WEAPON SHOP*\n\n💰 Your Coins: ${player.coins}\n\n`;
            for (const [key, weapon] of Object.entries(WEAPONS)) {
                const stat = weapon.damage? `DMG: ${weapon.damage}` : `DEF: ${weapon.defense}`;
                shopText += `${weapon.emoji} *${weapon.name}* - ${weapon.price} coins\n ${stat}\n Buy:.battle buy ${key}\n\n`;
            }
            return m.reply(shopText);
        }

        // =========================
        // 4. BUY WEAPON
        // =========================
        if (action === 'buy') {
            const weaponKey = args[1]?.toLowerCase();
            const weapon = WEAPONS[weaponKey];

            if (!weapon) return m.reply(`❌ Weapon not found! Use.battle shop`);

            if (player.coins < weapon.price) {
                return m.reply(`❌ Not enough coins! Need ${weapon.price}, you have ${player.coins}`);
            }

            player.coins -= weapon.price;
            player.weapons.push(weaponKey);

            return m.reply(`✅ *PURCHASED!*\n\n${weapon.emoji} ${weapon.name}\n💰 Cost: ${weapon.price}\n💵 Balance: ${player.coins}\n\nCheck:.battle inv`);
        }

        // =========================
        // 5. SELL WEAPON
        // =========================
        if (action === 'sell') {
            const weaponKey = args[1]?.toLowerCase();
            const weapon = WEAPONS[weaponKey];

            if (!weapon) return m.reply(`❌ Weapon not found!`);
            if (!player.weapons.includes(weaponKey)) return m.reply(`❌ You don't own ${weapon.name}`);

            const sellPrice = Math.floor(weapon.price * 0.6); // 60% sell price
            player.coins += sellPrice;
            const index = player.weapons.indexOf(weaponKey);
            player.weapons.splice(index, 1);

            return m.reply(`💰 *SOLD!*\n\n${weapon.emoji} ${weapon.name}\n💵 Earned: ${sellPrice} coins\n💰 Balance: ${player.coins}`);
        }

        // =========================
        // 6. INVENTORY
        // =========================
        if (action === 'inv' || action === 'inventory') {
            if (player.weapons.length === 0) {
                return m.reply(`🎒 *INVENTORY*\n\n❤️ Health: ${player.health}/100\n💰 Coins: ${player.coins}\n\n❌ No weapons owned\nBuy:.battle shop`);
            }

            let invText = `🎒 *INVENTORY*\n\n❤️ Health: ${player.health}/100\n💰 Coins: ${player.coins}\n🏆 W/L: ${player.wins}/${player.losses}\n\n*WEAPONS:*\n`;
            player.weapons.forEach(w => {
                const weapon = WEAPONS[w];
                invText += `${weapon.emoji} ${weapon.name}\n`;
            });

            return m.reply(invText);
        }

        // =========================
        // 7. BALANCE
        // =========================
        if (action === 'balance' || action === 'bal') {
            return m.reply(`💰 *BALANCE*\n\nPlayer: ${userName}\nCoins: ${player.coins}\nHealth: ${player.health}/100\nArrest Level: ${player.arrestLevel}/5\n\nCollect:.battle collect`);
        }

        // =========================
        // 8. FIGHT PLAYER
        // =========================
        if (action === 'fight' || action === 'attack') {
            const target = args[1]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            if (!target || target === userId) return m.reply(`❌ Tag valid enemy:.battle fight @user`);

            if (!players.has(target)) {
                players.set(target, { coins: 500, weapons: [], lastCollect: 0, arrestLevel: 0, wins: 0, losses: 0, health: 100 });
            }

            const enemy = players.get(target);
            const targetName = args[1].replace('@', '');

            if (player.health <= 0) return m.reply(`💀 You're dead! Wait for auto-revive or use coins to heal`);
            if (enemy.health <= 0) return m.reply(`💀 Enemy already dead!`);

            // Calculate damage
            let playerDamage = 5; // Base damage
            let playerDefense = 0;
            player.weapons.forEach(w => {
                if (WEAPONS[w].damage) playerDamage += WEAPONS[w].damage;
                if (WEAPONS[w].defense) playerDefense += WEAPONS[w].defense;
            });

            let enemyDamage = 5;
            let enemyDefense = 0;
            enemy.weapons.forEach(w => {
                if (WEAPONS[w].damage) enemyDamage += WEAPONS[w].damage;
                if (WEAPONS[w].defense) enemyDefense += WEAPONS[w].defense;
            });

            const finalPlayerDmg = Math.max(1, playerDamage - enemyDefense);
            const finalEnemyDmg = Math.max(1, enemyDamage - playerDefense);

            enemy.health -= finalPlayerDmg;
            player.health -= finalEnemyDmg;

            let resultText = `⚔️ *BATTLE RESULT* ⚔️\n\n👤 ${userName} vs ${targetName}\n\n`;
            resultText += `💥 You dealt: ${finalPlayerDmg} damage\n💥 Enemy dealt: ${finalEnemyDmg} damage\n\n`;
            resultText += `❤️ Your HP: ${Math.max(0, player.health)}/100\n❤️ Enemy HP: ${Math.max(0, enemy.health)}/100\n\n`;

            if (enemy.health <= 0) {
                const reward = Math.floor(Math.random() * 300) + 200;
                player.coins += reward;
                player.wins++;
                enemy.losses++;
                enemy.health = 100; // Revive
                resultText += `🎉 *YOU WON!*\n💰 Reward: +${reward} coins\n💵 Balance: ${player.coins}`;
            } else if (player.health <= 0) {
                const loss = Math.floor(player.coins * 0.1);
                player.coins -= loss;
                player.losses++;
                enemy.wins++;
                player.health = 100; // Revive
                resultText += `💀 *YOU LOST!*\n💸 Lost: ${loss} coins\n💵 Balance: ${player.coins}`;
            } else {
                resultText += `⚡ *BATTLE CONTINUES!*\nAttack again:.battle fight @${targetName}`;
            }

            return sock.sendMessage(chatId, { text: resultText, mentions: [userId, target] }, { quoted: m });
        }

        // =========================
        // 9. ROB PLAYER
        // =========================
        if (action === 'rob') {
            const target = args[1]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
            if (!target || target === userId) return m.reply(`❌ Tag valid player:.battle rob @user`);

            if (!players.has(target)) {
                players.set(target, { coins: 500, weapons: [], lastCollect: 0, arrestLevel: 0, wins: 0, losses: 0, health: 100 });
            }

            const enemy = players.get(target);
            const targetName = args[1].replace('@', '');

            if (enemy.coins < 50) return m.reply(`❌ ${targetName} is too poor to rob!`);

            const success = Math.random() > 0.4; // 60% success rate

            if (success) {
                const stolen = Math.floor(enemy.coins * (Math.random() * 0.3 + 0.1)); // 10-40%
                player.coins += stolen;
                enemy.coins -= stolen;
                player.arrestLevel++;

                return sock.sendMessage(chatId, {
                    text: `🦹 *ROBBERY SUCCESS!*\n\n💰 Stole: ${stolen} coins from @${target.split('@')[0]}\n💵 Your Balance: ${player.coins}\n⚠️ Arrest Level: ${player.arrestLevel}/5\n\n${player.arrestLevel >= 3? '🚨 Police are watching you!' : ''}`,
                    mentions: [userId, target]
                }, { quoted: m });
            } else {
                // AI Arresting system
                player.arrestLevel += 2;
                const fine = Math.floor(player.coins * 0.2);
                player.coins -= fine;

                if (player.arrestLevel >= 5) {
                    player.arrestLevel = 0;
                    player.coins = Math.max(100, player.coins - 500);
                    return sock.sendMessage(chatId, {
                        text: `🚨 *ARRESTED BY VEX AI POLICE!* 🚨\n\n❌ Robbery failed!\n💸 Fine: ${fine} coins\n🔒 Jail penalty: 500 coins\n⚠️ Arrest level reset\n💵 Balance: ${player.coins}`,
                        mentions: [userId]
                    }, { quoted: m });
                }

                return sock.sendMessage(chatId, {
                    text: `🚨 *ROBBERY FAILED!* 🚨\n\n❌ You got caught!\n💸 Fine: ${fine} coins\n⚠️ Arrest Level: ${player.arrestLevel}/5\n💵 Balance: ${player.coins}`,
                    mentions: [userId]
                }, { quoted: m });
            }
        }

        // =========================
        // 10. CHEAT CODE
        // =========================
        if (action === 'cheat') {
            const code = args[1];
            if (code === CHEAT_CODE) {
                player.coins += 10000;
                return m.reply(`🎁 *CHEAT ACTIVATED!*\n\n💰 +10,000 coins added\n💵 Balance: ${player.coins}\n\n🤫 Keep this secret!`);
            } else {
                return m.reply(`❌ Invalid cheat code!`);
            }
        }

        return m.reply(`❌ Unknown command. Use.battle help`);
    }
};

// =========================
// DOWNLOAD IMAGE HELPER
// =========================
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
