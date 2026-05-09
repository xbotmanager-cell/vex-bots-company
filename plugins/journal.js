// =========================
// VEX JOURNAL PRO - LIFESTYLE
// =========================

const userJournals = new Map(); // userId -> { entries, mood, gratitude, goals, streak }

const MOOD_EMOJIS = {
    happy: "😊",
    sad: "😢",
    angry: "😠",
    excited: "🤩",
    tired: "😴",
    stressed: "😰",
    calm: "😌",
    grateful: "🙏",
    anxious: "😟",
    motivated: "💪",
    neutral: "😐"
};

module.exports = {
    command: "journal",
    alias: ["diary", "log", "mind", "mood"],
    category: "lifestyles",
    description: "VEX Journal Pro - Mood tracker, gratitude log, daily reflections & goals",

    async execute(m, sock, { args, userSettings, prefix }) {
        const chatId = m.chat;
        const userId = m.sender;
        const userName = m.pushName || userId.split('@')[0];
        const style = userSettings?.style || 'harsh';

        // Initialize user
        if (!userJournals.has(userId)) {
            userJournals.set(userId, {
                entries: [],
                mood: 'neutral',
                gratitude: [],
                goals: [],
                streak: 0,
                lastEntry: 0,
                totalEntries: 0,
                moodHistory: []
            });
        }

        const journal = userJournals.get(userId);
        const action = args[0]?.toLowerCase();

        // =========================
        // STYLE CONFIG
        // =========================
        const themes = {
            harsh: {
                react: "📖",
                title: "☣️ 𝖁𝕰𝖃 𝕵𝕺𝖀𝕽𝕹𝕬𝕷 ☣️",
                line: "━",
                write: "☣️ 𝖂𝕽𝕴𝕿𝕰 𝖄𝕺𝖀𝕽 𝕿𝕽𝖀𝕿𝕳",
                mood: "☣️ 𝕮𝕺𝕹𝕿𝕽𝕺𝕷 𝖄𝕺𝖀𝕽 𝕸𝕴𝕹𝕯",
                gratitude: "☣️ 𝕬𝕮𝕶𝕹𝕺𝖂𝕷𝕰𝕯𝕲𝕰",
                goal: "☣️ 𝕯𝕺𝕸𝕴𝕹𝕬𝕿𝕰",
                error: "☣️ 𝖂𝕳𝕬𝕿 𝕴𝕾 𝕿𝕳𝕴𝕾?"
            },
            normal: {
                react: "📔",
                title: "📔 VEX JOURNAL 📔",
                line: "─",
                write: "✍️ Entry Logged",
                mood: "😊 Mood Tracked",
                gratitude: "🙏 Gratitude Added",
                goal: "🎯 Goal Set",
                error: "❌ Invalid Command"
            },
            girl: {
                react: "💖",
                title: "🫧 𝒱𝑒𝓍 𝒥𝑜𝓊𝓇𝓃𝒶𝓁 🫧",
                line: "┄",
                write: "💖 𝐸𝓃𝓉𝓇𝓎 𝒮𝒶𝓋𝑒𝒹~",
                mood: "💖 𝑀𝑜𝑜𝒹 𝑀𝒶𝑔𝒾𝒸~",
                gratitude: "💖 𝒢𝓇𝒶𝓉𝒾𝓉𝓊𝒹𝑒 𝐵𝓁𝑜𝓈𝑜𝓂~",
                goal: "💖 𝒢𝑜𝒶𝓁 𝒮𝑒𝓉~",
                error: "💔 𝒪𝑜𝓅𝓈𝒾𝑒~"
            }
        };

        const ui = themes[style] || themes.normal;
        await sock.sendMessage(chatId, { react: { text: ui.react, key: m.key } });

        // =========================
        // 1. HELP / DASHBOARD
        // =========================
        if (!action || action === 'help' || action === 'dashboard') {
            const today = new Date().toDateString();
            const todayEntries = journal.entries.filter(e => new Date(e.date).toDateString() === today);
            const todayMood = journal.moodHistory.find(m => new Date(m.date).toDateString() === today);
            const recentGratitude = journal.gratitude.slice(-3);
            const activeGoals = journal.goals.filter(g =>!g.completed);

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `┌─ *JOURNAL DASHBOARD* ${ui.line.repeat(7)}\n`;
            response += `│\n`;
            response += `│ 👤 *User:* ${userName}\n`;
            response += `│ 📅 *Date:* ${today}\n`;
            response += `│ 🔥 *Streak:* ${journal.streak} days\n`;
            response += `│ 📝 *Total Entries:* ${journal.totalEntries}\n`;
            response += `│\n`;
            response += `│ 😊 *Today Mood:* ${MOOD_EMOJIS[journal.mood]} ${journal.mood}\n`;
            response += `│ ✍️ *Today Entries:* ${todayEntries.length}\n`;
            response += `│ 🙏 *Gratitude:* ${journal.gratitude.length} items\n`;
            response += `│ 🎯 *Active Goals:* ${activeGoals.length}\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `*COMMANDS:*\n`;
            response += `${prefix}journal write <text> - New entry\n`;
            response += `${prefix}journal mood <mood> - Log mood\n`;
            response += `${prefix}journal gratitude <text> - Add gratitude\n`;
            response += `${prefix}journal goal <text> - Set goal\n`;
            response += `${prefix}journal complete <num> - Complete goal\n`;
            response += `${prefix}journal read - Read entries\n`;
            response += `${prefix}journal stats - View stats\n`;
            response += `${prefix}journal moods - Mood history\n`;
            response += `${prefix}journal list - All commands\n\n`;
            response += `_VEX Journal - Created by Lupin Starnley_`;

            return m.reply(response);
        }

        // =========================
        // 2. WRITE ENTRY
        // =========================
        if (action === 'write' || action === 'entry' || action === 'add') {
            const text = args.slice(1).join(' ');
            if (!text) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Write something!\n\n*Usage:* ${prefix}journal write Today was amazing because...\n\n_VEX Journal v2.0_`);
            }

            const now = Date.now();
            const entry = {
                id: now,
                text: text,
                date: now,
                mood: journal.mood,
                wordCount: text.split(' ').length
            };

            journal.entries.push(entry);
            journal.totalEntries++;

            // Update streak
            const lastEntry = new Date(journal.lastEntry).toDateString();
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();

            if (lastEntry === today) {
                // Same day
            } else if (lastEntry === yesterday) {
                journal.streak++;
            } else if (journal.lastEntry === 0) {
                journal.streak = 1;
            } else {
                journal.streak = 1;
            }
            journal.lastEntry = now;

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `${ui.write}\n\n`;
            response += `┌─ *ENTRY SAVED* ${ui.line.repeat(12)}\n`;
            response += `│\n`;
            response += `│ 📝 *Entry #${journal.totalEntries}*\n`;
            response += `│ 📅 *Date:* ${new Date(now).toLocaleString()}\n`;
            response += `│ 📊 *Words:* ${entry.wordCount}\n`;
            response += `│ 😊 *Mood:* ${MOOD_EMOJIS[journal.mood]} ${journal.mood}\n`;
            response += `│ 🔥 *Streak:* ${journal.streak} days\n`;
            response += `│\n`;
            response += `│ 💭 *Preview:* ${text.slice(0, 50)}${text.length > 50? '...' : ''}\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `_Keep writing daily for insights_`;

            return m.reply(response);
        }

        // =========================
        // 3. MOOD TRACKER
        // =========================
        if (action === 'mood') {
            const mood = args[1]?.toLowerCase();
            const validMoods = Object.keys(MOOD_EMOJIS);

            if (!mood ||!validMoods.includes(mood)) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Invalid mood!\n\n*Valid:* ${validMoods.join(', ')}\n\n*Usage:* ${prefix}journal mood happy\n\n_VEX Journal v2.0_`);
            }

            journal.mood = mood;
            journal.moodHistory.push({
                mood: mood,
                date: Date.now(),
                emoji: MOOD_EMOJIS[mood]
            });

            const moodAdvice = {
                happy: 'Happiness is contagious! Share your joy 😊',
                sad: 'It\'s okay to feel sad. This too shall pass 💙',
                angry: 'Take 10 deep breaths. You control your anger 🧘',
                excited: 'Channel that energy into something productive! ⚡',
                tired: 'Rest is productive. Listen to your body 😴',
                stressed: 'Break tasks into smaller steps. You got this 💪',
                calm: 'Inner peace is your superpower 🧘‍♀️',
                grateful: 'Gratitude turns what we have into enough 🙏',
                anxious: 'Focus on what you can control. Breathe 🌬️',
                motivated: 'Ride this wave! Take action now 🚀',
                neutral: 'Balance is beautiful. Stay centered 😐'
            };

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `${ui.mood}\n\n`;
            response += `┌─ *MOOD LOGGED* ${ui.line.repeat(12)}\n`;
            response += `│\n`;
            response += `│ ${MOOD_EMOJIS[mood]} *Mood:* ${mood}\n`;
            response += `│ 📅 *Date:* ${new Date().toLocaleString()}\n`;
            response += `│ 🔥 *Streak:* ${journal.streak} days\n`;
            response += `│\n`;
            response += `│ 💡 *Advice:* ${moodAdvice[mood]}\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `_Track mood daily to see patterns_`;

            return m.reply(response);
        }

        // =========================
        // 4. GRATITUDE LOG
        // =========================
        if (action === 'gratitude' || action === 'grateful' || action === 'thanks') {
            const text = args.slice(1).join(' ');
            if (!text) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ What are you grateful for?\n\n*Usage:* ${prefix}journal gratitude My family\n\n_VEX Journal v2.0_`);
            }

            journal.gratitude.push({
                text: text,
                date: Date.now()
            });

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `${ui.gratitude}\n\n`;
            response += `┌─ *GRATITUDE ADDED* ${ui.line.repeat(9)}\n`;
            response += `│\n`;
            response += `│ 🙏 *Grateful for:* ${text}\n`;
            response += `│ 📊 *Total:* ${journal.gratitude.length} items\n`;
            response += `│ 🔥 *Streak:* ${journal.streak} days\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `_Gratitude rewires your brain for happiness_`;

            return m.reply(response);
        }

        // =========================
        // 5. SET GOAL
        // =========================
        if (action === 'goal' || action === 'goals') {
            const goalText = args.slice(1).join(' ');
            if (!goalText) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Set a goal!\n\n*Usage:* ${prefix}journal goal Exercise 5x per week\n\n_VEX Journal v2.0_`);
            }

            const goal = {
                id: Date.now(),
                text: goalText,
                date: Date.now(),
                completed: false
            };

            journal.goals.push(goal);

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `${ui.goal}\n\n`;
            response += `┌─ *GOAL SET* ${ui.line.repeat(14)}\n`;
            response += `│\n`;
            response += `│ 🎯 *Goal:* ${goalText}\n`;
            response += `│ 📅 *Date:* ${new Date().toLocaleDateString()}\n`;
            response += `│ 📊 *Active Goals:* ${journal.goals.filter(g =>!g.completed).length}\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `_Use ${prefix}journal complete ${journal.goals.length} when done_`;

            return m.reply(response);
        }

        // =========================
        // 6. COMPLETE GOAL
        // =========================
        if (action === 'complete' || action === 'done') {
            const goalNum = parseInt(args[1]);
            if (isNaN(goalNum) || goalNum < 1 || goalNum > journal.goals.length) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Invalid goal number!\n\n*Usage:* ${prefix}journal complete 1\n\n_VEX Journal v2.0_`);
            }

            const goal = journal.goals[goalNum - 1];
            if (goal.completed) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n✅ Goal already completed!\n\n_VEX Journal v2.0_`);
            }

            goal.completed = true;
            goal.completedDate = Date.now();

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `🎉 *GOAL COMPLETED*\n\n`;
            response += `┌─ *ACHIEVEMENT* ${ui.line.repeat(11)}\n`;
            response += `│\n`;
            response += `│ ✅ *Goal:* ${goal.text}\n`;
            response += `│ 📅 *Set:* ${new Date(goal.date).toLocaleDateString()}\n`;
            response += `│ 🎊 *Completed:* ${new Date().toLocaleDateString()}\n`;
            response += `│ 📊 *Total Completed:* ${journal.goals.filter(g => g.completed).length}\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `_Celebrate your wins!_`;

            return m.reply(response);
        }

        // =========================
        // 7. READ ENTRIES
        // =========================
        if (action === 'read' || action === 'entries' || action === 'list') {
            const count = parseInt(args[1]) || 5;
            const recentEntries = journal.entries.slice(-count).reverse();

            if (recentEntries.length === 0) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n📝 No entries yet!\n\nStart with: ${prefix}journal write Today was...\n\n_VEX Journal v2.0_`);
            }

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `📖 *RECENT ENTRIES*\n\n`;

            recentEntries.forEach((entry, i) => {
                const date = new Date(entry.date).toLocaleDateString();
                response += `┌─ *Entry #${journal.totalEntries - i}* ${ui.line.repeat(10)}\n`;
                response += `│ 📅 ${date} | ${MOOD_EMOJIS[entry.mood]} ${entry.mood}\n`;
                response += `│ 📊 ${entry.wordCount} words\n`;
                response += `│\n`;
                response += `│ ${entry.text.slice(0, 100)}${entry.text.length > 100? '...' : ''}\n`;
                response += `│\n`;
                response += `└${ui.line.repeat(25)}\n\n`;
            });

            response += `_Showing ${recentEntries.length} of ${journal.totalEntries} entries_`;

            return m.reply(response);
        }

        // =========================
        // 8. STATS
        // =========================
        if (action === 'stats' || action === 'stat') {
            const totalWords = journal.entries.reduce((sum, e) => sum + e.wordCount, 0);
            const avgWords = journal.entries.length > 0? Math.round(totalWords / journal.entries.length) : 0;

            // Mood frequency
            const moodCounts = {};
            journal.moodHistory.forEach(m => {
                moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
            });
            const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

            // Last 7 days
            const weekAgo = Date.now() - 604800000;
            const weekEntries = journal.entries.filter(e => e.date > weekAgo);

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `📊 *JOURNAL STATS*\n\n`;
            response += `┌─ *ALL TIME* ${ui.line.repeat(13)}\n`;
            response += `│\n`;
            response += `│ 📝 *Total Entries:* ${journal.totalEntries}\n`;
            response += `│ 📊 *Total Words:* ${totalWords.toLocaleString()}\n`;
            response += `│ 📈 *Avg/Entry:* ${avgWords} words\n`;
            response += `│ 🔥 *Current Streak:* ${journal.streak} days\n`;
            response += `│ 🙏 *Gratitude Items:* ${journal.gratitude.length}\n`;
            response += `│ 🎯 *Goals Set:* ${journal.goals.length}\n`;
            response += `│ ✅ *Goals Completed:* ${journal.goals.filter(g => g.completed).length}\n`;
            response += `│\n`;
            response += `│ 📅 *Last 7 Days:* ${weekEntries.length} entries\n`;
            response += `│ 😊 *Top Mood:* ${topMood? MOOD_EMOJIS[topMood[0]] + ' ' + topMood[0] : 'None'}\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `_Writing daily improves mental health_`;

            return m.reply(response);
        }

        // =========================
        // 9. MOOD HISTORY
        // =========================
        if (action === 'moods' || action === 'moodhistory') {
            const recentMoods = journal.moodHistory.slice(-10).reverse();

            if (recentMoods.length === 0) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n😊 No mood data yet!\n\nStart with: ${prefix}journal mood happy\n\n_VEX Journal v2.0_`);
            }

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `😊 *MOOD HISTORY*\n\n`;

            recentMoods.forEach((m, i) => {
                const date = new Date(m.date).toLocaleDateString();
                response += `${m.emoji} ${m.mood} - ${date}\n`;
            });

            response += `\n${ui.line.repeat(25)}\n`;
            response += `_Showing last ${recentMoods.length} moods_`;

            return m.reply(response);
        }

        return m.reply(`${ui.error}\n\nUse ${prefix}journal help`);
    }
};
