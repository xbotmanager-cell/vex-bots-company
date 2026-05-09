const axios = require('axios');

// =========================
// LIFESTYLE DATA - RAM ONLY
// =========================
const userHabits = new Map(); // userId -> { water, sleep, mood, streak }
const quotesCache = new Map(); // cache daily quotes

module.exports = {
    command: "lifestyle",
    alias: ["life", "habit", "health", "mood"],
    category: "lifestyles",
    description: "VEX Lifestyle Tracker - Water, Sleep, Mood, Quotes & Tips",

    async execute(m, sock, { args, userSettings, prefix }) {
        const chatId = m.chat;
        const userId = m.sender;
        const userName = m.pushName || userId.split('@')[0];
        const style = userSettings?.style || 'harsh';

        // Initialize user
        if (!userHabits.has(userId)) {
            userHabits.set(userId, {
                water: 0,
                sleep: 0,
                mood: 'neutral',
                streak: 0,
                lastUpdate: Date.now(),
                goals: { water: 8, sleep: 8 }
            });
        }

        const habit = userHabits.get(userId);
        const action = args[0]?.toLowerCase();

        // =========================
        // STYLE CONFIG
        // =========================
        const themes = {
            harsh: {
                react: "💪",
                title: "☣️ 𝖁𝕰𝖃 𝕷𝕴𝕱𝕰𝕾𝕿𝖄𝕷𝕰 ☣️",
                line: "━",
                water: "☣️ 𝕳𝖄𝕯𝕽𝕬𝕿𝕰 𝕺𝕽 𝕯𝕴𝕰",
                sleep: "☣️ 𝕾𝕷𝕰𝕻 𝕷𝕴𝕶𝕰 𝕬 𝕭𝕰𝕬𝕾𝕿",
                mood: "☣️ 𝕮𝕺𝕹𝕿𝕽𝕺𝕷 𝖄𝕺𝖀𝕽 𝕸𝕴𝕹𝕯",
                error: "☣️ 𝖂𝕳𝕬𝕿 𝕴𝕾 𝕿𝕳𝕴𝕾?"
            },
            normal: {
                react: "🌱",
                title: "🌿 VEX LIFESTYLE 🌿",
                line: "─",
                water: "💧 Hydration Tracker",
                sleep: "😴 Sleep Tracker",
                mood: "😊 Mood Tracker",
                error: "❌ Invalid Command"
            },
            girl: {
                react: "💖",
                title: "🫧 𝒱𝑒𝓍 𝐿𝒾𝒻𝑒𝓈𝓉𝓎𝓁𝑒 🫧",
                line: "┄",
                water: "💧 𝒮𝓉𝒶𝓎 𝐻𝓎𝒹𝓇𝒶𝓉𝑒𝒹 𝒫𝓇𝒾𝓃𝒸𝑒𝓈~",
                sleep: "😴 𝒮𝓁𝑒𝓅 𝐵𝑒𝒶𝓊𝓉𝒾𝒻𝓊𝓁~",
                mood: "😊 𝐻𝑜𝓌 𝒶𝓇𝑒 𝓎𝑜𝓊 𝒻𝑒𝓁𝒾𝓃𝑔~",
                error: "💔 𝒪𝑜𝓅𝓈𝒾𝑒~"
            }
        };

        const ui = themes[style] || themes.normal;
        await sock.sendMessage(chatId, { react: { text: ui.react, key: m.key } });

        // =========================
        // 1. HELP / DASHBOARD
        // =========================
        if (!action || action === 'help' || action === 'dashboard') {
            const today = new Date().toLocaleDateString();
            const waterProgress = `${habit.water}/${habit.goals.water}`;
            const sleepProgress = `${habit.sleep}/${habit.goals.sleep}h`;
            const streak = habit.streak;

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `┌─ *DAILY DASHBOARD* ${ui.line.repeat(10)}\n`;
            response += `│\n`;
            response += `│ 👤 *User:* ${userName}\n`;
            response += `│ 📅 *Date:* ${today}\n`;
            response += `│ 🔥 *Streak:* ${streak} days\n`;
            response += `│\n`;
            response += `│ 💧 *Water:* ${waterProgress} glasses ${habit.water >= habit.goals.water? '✅' : '⏳'}\n`;
            response += `│ 😴 *Sleep:* ${sleepProgress} ${habit.sleep >= habit.goals.sleep? '✅' : '⏳'}\n`;
            response += `│ 😊 *Mood:* ${getMoodEmoji(habit.mood)} ${habit.mood}\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `*COMMANDS:*\n`;
            response += `${prefix}lifestyle water <glasses> - Log water\n`;
            response += `${prefix}lifestyle sleep <hours> - Log sleep\n`;
            response += `${prefix}lifestyle mood <happy/sad/angry> - Log mood\n`;
            response += `${prefix}lifestyle quote - Daily quote\n`;
            response += `${prefix}lifestyle tip - Health tip\n`;
            response += `${prefix}lifestyle reset - Reset day\n`;
            response += `${prefix}lifestyle goal water <num> - Set goal\n\n`;
            response += `_VEX Lifestyle - Created by Lupin Starnley_`;

            return m.reply(response);
        }

        // =========================
        // 2. WATER TRACKER
        // =========================
        if (action === 'water') {
            const amount = parseInt(args[1]);
            if (isNaN(amount) || amount < 0) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Invalid amount!\n\n*Usage:* ${prefix}lifestyle water 3\n\n_VEX Lifestyle v2.0_`);
            }

            habit.water = amount;
            habit.lastUpdate = Date.now();
            updateStreak(userId, habit);

            const remaining = Math.max(0, habit.goals.water - habit.water);
            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `${ui.water}\n\n`;
            response += `┌─ *HYDRATION* ${ui.line.repeat(12)}\n`;
            response += `│\n`;
            response += `│ 💧 *Logged:* ${habit.water} glasses\n`;
            response += `│ 🎯 *Goal:* ${habit.goals.water} glasses\n`;
            response += `│ ⏳ *Remaining:* ${remaining} glasses\n`;
            response += `│ 🔥 *Streak:* ${habit.streak} days\n`;
            response += `│ ${habit.water >= habit.goals.water? '✅ *GOAL ACHIEVED!*' : '💪 *KEEP GOING!*'}\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `_Drink water every 2 hours_`;

            return m.reply(response);
        }

        // =========================
        // 3. SLEEP TRACKER
        // =========================
        if (action === 'sleep') {
            const hours = parseFloat(args[1]);
            if (isNaN(hours) || hours < 0 || hours > 24) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Invalid hours! Use 0-24\n\n*Usage:* ${prefix}lifestyle sleep 7.5\n\n_VEX Lifestyle v2.0_`);
            }

            habit.sleep = hours;
            habit.lastUpdate = Date.now();
            updateStreak(userId, habit);

            const quality = hours >= 8? 'Excellent' : hours >= 6? 'Good' : hours >= 4? 'Poor' : 'Critical';
            const emoji = hours >= 8? '😴' : hours >= 6? '😊' : hours >= 4? '😟' : '😵';

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `${ui.sleep}\n\n`;
            response += `┌─ *SLEEP LOG* ${ui.line.repeat(13)}\n`;
            response += `│\n`;
            response += `│ 😴 *Hours:* ${habit.sleep}h\n`;
            response += `│ 🎯 *Goal:* ${habit.goals.sleep}h\n`;
            response += `│ ${emoji} *Quality:* ${quality}\n`;
            response += `│ 🔥 *Streak:* ${habit.streak} days\n`;
            response += `│ ${habit.sleep >= habit.goals.sleep? '✅ *WELL RESTED!*' : '⚠️ *NEED MORE SLEEP*'}\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `_Sleep 7-9 hours for optimal health_`;

            return m.reply(response);
        }

        // =========================
        // 4. MOOD TRACKER
        // =========================
        if (action === 'mood') {
            const mood = args[1]?.toLowerCase();
            const validMoods = ['happy', 'sad', 'angry', 'neutral', 'excited', 'tired', 'stressed'];

            if (!mood ||!validMoods.includes(mood)) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Invalid mood!\n\n*Valid:* ${validMoods.join(', ')}\n\n*Usage:* ${prefix}lifestyle mood happy\n\n_VEX Lifestyle v2.0_`);
            }

            habit.mood = mood;
            habit.lastUpdate = Date.now();
            updateStreak(userId, habit);

            const moodAdvice = {
                happy: 'Keep spreading positivity! 😊',
                sad: 'It\'s okay to feel down. Talk to someone 💙',
                angry: 'Take deep breaths. Count to 10 🧘',
                neutral: 'Balance is good. Stay centered 😐',
                excited: 'Channel that energy! ⚡',
                tired: 'Rest up. You deserve it 😴',
                stressed: 'Breathe. You got this 💪'
            };

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `${ui.mood}\n\n`;
            response += `┌─ *MOOD LOG* ${ui.line.repeat(14)}\n`;
            response += `│\n`;
            response += `│ ${getMoodEmoji(habit.mood)} *Mood:* ${habit.mood}\n`;
            response += `│ 🔥 *Streak:* ${habit.streak} days\n`;
            response += `│\n`;
            response += `│ 💡 *Advice:* ${moodAdvice[mood]}\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `_Track your mood daily for insights_`;

            return m.reply(response);
        }

        // =========================
        // 5. DAILY QUOTE
        // =========================
        if (action === 'quote') {
            const quotes = [
                "The only way to do great work is to love what you do. - Steve Jobs",
                "Success is not final, failure is not fatal. - Winston Churchill",
                "Believe you can and you're halfway there. - Theodore Roosevelt",
                "Your time is limited, don't waste it living someone else's life. - Steve Jobs",
                "The future depends on what you do today. - Mahatma Gandhi",
                "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
                "Everything you've ever wanted is on the other side of fear. - George Addair",
                "Hardships often prepare ordinary people for extraordinary destiny. - C.S. Lewis"
            ];

            const today = new Date().toDateString();
            if (!quotesCache.has(today)) {
                const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
                quotesCache.set(today, randomQuote);
            }

            const quote = quotesCache.get(today);

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `💭 *DAILY QUOTE*\n\n`;
            response += `"${quote}"\n\n`;
            response += `${ui.line.repeat(25)}\n`;
            response += `_Come back tomorrow for a new quote_`;

            return m.reply(response);
        }

        // =========================
        // 6. HEALTH TIP
        // =========================
        if (action === 'tip' || action === 'tips') {
            const tips = [
                "Drink a glass of water first thing in the morning to kickstart metabolism",
                "Take a 5-minute walk every hour to improve circulation",
                "Practice deep breathing: 4 seconds in, 4 seconds hold, 4 seconds out",
                "Eat protein with every meal to maintain muscle mass",
                "Get sunlight for 10-15 minutes daily for Vitamin D",
                "Stretch for 5 minutes before bed to improve sleep quality",
                "Limit screen time 1 hour before bed for better sleep",
                "Eat slowly and chew 20-30 times per bite for digestion",
                "Stand up and move every 30 minutes when working",
                "Keep a gratitude journal - write 3 things daily"
            ];

            const randomTip = tips[Math.floor(Math.random() * tips.length)];

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `💡 *HEALTH TIP*\n\n`;
            response += `${randomTip}\n\n`;
            response += `${ui.line.repeat(25)}\n`;
            response += `_Small changes = Big results_`;

            return m.reply(response);
        }

        // =========================
        // 7. RESET DAY
        // =========================
        if (action === 'reset') {
            habit.water = 0;
            habit.sleep = 0;
            habit.mood = 'neutral';
            habit.lastUpdate = Date.now();

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `🔄 *DAY RESET*\n\n`;
            response += `All trackers reset to 0\n`;
            response += `Streak maintained: ${habit.streak} days\n\n`;
            response += `${ui.line.repeat(25)}\n`;
            response += `_Fresh start. You got this!_`;

            return m.reply(response);
        }

        // =========================
        // 8. SET GOALS
        // =========================
        if (action === 'goal') {
            const type = args[1]?.toLowerCase();
            const value = parseInt(args[2]);

            if (!type || isNaN(value) || value < 1) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Invalid goal!\n\n*Usage:*\n${prefix}lifestyle goal water 10\n${prefix}lifestyle goal sleep 8\n\n_VEX Lifestyle v2.0_`);
            }

            if (type === 'water') {
                habit.goals.water = value;
                return m.reply(`${ui.title}\n${ui.line.repeat(30)}\n\n✅ *GOAL UPDATED*\n\n💧 Water Goal: ${value} glasses\n\n_Stay hydrated!_`);
            } else if (type === 'sleep') {
                habit.goals.sleep = value;
                return m.reply(`${ui.title}\n${ui.line.repeat(30)}\n\n✅ *GOAL UPDATED*\n\n😴 Sleep Goal: ${value} hours\n\n_Rest well!_`);
            } else {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Invalid goal type!\n\n*Valid:* water, sleep\n\n_VEX Lifestyle v2.0_`);
            }
        }

        return m.reply(`${ui.error}\n\nUse ${prefix}lifestyle help`);
    }
};

// =========================
// HELPERS
// =========================
function getMoodEmoji(mood) {
    const emojis = {
        happy: '😊',
        sad: '😢',
        angry: '😠',
        neutral: '😐',
        excited: '🤩',
        tired: '😴',
        stressed: '😰'
    };
    return emojis[mood] || '😐';
}

function updateStreak(userId, habit) {
    const now = Date.now();
    const lastUpdate = habit.lastUpdate;
    const oneDayMs = 86400000;

    // If last update was yesterday, increment streak
    if (now - lastUpdate > oneDayMs && now - lastUpdate < oneDayMs * 2) {
        habit.streak++;
    } else if (now - lastUpdate >= oneDayMs * 2) {
        habit.streak = 1; // Reset streak
    }
    // If same day, keep streak
}
