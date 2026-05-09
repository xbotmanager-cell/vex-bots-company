const axios = require('axios');

// =========================
// FITNESS DATA - RAM ONLY
// =========================
const userFitness = new Map(); // userId -> { workouts, calories, weight, steps, streak }
const exerciseDB = {
    pushup: { name: "Push-ups", calories: 0.5, emoji: "💪", type: "strength" },
    squat: { name: "Squats", calories: 0.6, emoji: "🦵", type: "strength" },
    plank: { name: "Plank", calories: 0.3, emoji: "🧘", type: "core", unit: "seconds" },
    running: { name: "Running", calories: 10, emoji: "🏃", type: "cardio", unit: "km" },
    walking: { name: "Walking", calories: 5, emoji: "🚶", type: "cardio", unit: "km" },
    cycling: { name: "Cycling", calories: 8, emoji: "🚴", type: "cardio", unit: "km" },
    jumping: { name: "Jumping Jacks", calories: 0.8, emoji: "🤸", type: "cardio" },
    situp: { name: "Sit-ups", calories: 0.4, emoji: "🤸‍♂️", type: "core" }
};

module.exports = {
    command: "fitness",
    alias: ["workout", "exercise", "gym", "health"],
    category: "lifestyles",
    description: "VEX Fitness Tracker - Log workouts, track calories, BMI calculator & routines",

    async execute(m, sock, { args, userSettings, prefix }) {
        const chatId = m.chat;
        const userId = m.sender;
        const userName = m.pushName || userId.split('@')[0];
        const style = userSettings?.style || 'harsh';

        // Initialize user
        if (!userFitness.has(userId)) {
            userFitness.set(userId, {
                workouts: [],
                totalCalories: 0,
                totalWorkouts: 0,
                weight: 0,
                height: 0,
                steps: 0,
                streak: 0,
                lastWorkout: 0,
                goals: { calories: 500, workouts: 5, steps: 10000 }
            });
        }

        const fitness = userFitness.get(userId);
        const action = args[0]?.toLowerCase();

        // =========================
        // STYLE CONFIG
        // =========================
        const themes = {
            harsh: {
                react: "💪",
                title: "☣️ 𝖁𝕰𝖃 𝕱𝕴𝕿𝕹𝕰𝕾 ☣️",
                line: "━",
                log: "☣️ 𝕻𝕬𝕴𝕹 𝕴𝕾 𝖂𝕰𝕬𝕶𝕹𝕰𝕾",
                bmi: "☣️ 𝕭𝕺𝕯𝖄 𝕾𝕮𝕬𝕹 𝕮𝕺𝕸𝕻𝕷𝕰𝕿𝕰",
                routine: "☣️ 𝕭𝕰𝕬𝕾𝕿 𝕸𝕺𝕯𝕰 𝕬𝕮𝕿𝕴𝖁𝕬𝕿𝕰𝕯",
                error: "☣️ 𝖂𝕳𝕬𝕿 𝕴𝕾 𝕿𝕳𝕴𝕾?"
            },
            normal: {
                react: "🏋️",
                title: "🏋️ VEX FITNESS 🏋️",
                line: "─",
                log: "💪 Workout Logged",
                bmi: "📊 BMI Calculated",
                routine: "📋 Routine Generated",
                error: "❌ Invalid Command"
            },
            girl: {
                react: "💖",
                title: "🫧 𝒱𝑒𝓍 𝐹𝒾𝓉𝓃𝑒𝓈 🫧",
                line: "┄",
                log: "💖 𝒲𝑜𝓇𝓀𝑜𝓊𝓉 𝐿𝑜𝑔𝑔𝑒𝒹~",
                bmi: "💖 𝐵𝑜𝒹𝓎 𝒮𝒸𝒶𝓃 𝒞𝑜𝓂𝓅𝓁𝑒𝓉𝑒~",
                routine: "💖 𝑅𝑜𝓊𝓉𝒾𝓃𝑒 𝑅𝑒𝒶𝒹𝓎~",
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
            const todayWorkouts = fitness.workouts.filter(w => new Date(w.date).toDateString() === today);
            const todayCalories = todayWorkouts.reduce((sum, w) => sum + w.calories, 0);

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `┌─ *FITNESS DASHBOARD* ${ui.line.repeat(8)}\n`;
            response += `│\n`;
            response += `│ 👤 *User:* ${userName}\n`;
            response += `│ 📅 *Date:* ${today}\n`;
            response += `│ 🔥 *Streak:* ${fitness.streak} days\n`;
            response += `│\n`;
            response += `│ 💪 *Today Workouts:* ${todayWorkouts.length}\n`;
            response += `│ 🔥 *Calories Burned:* ${todayCalories}/${fitness.goals.calories}\n`;
            response += `│ 👟 *Steps:* ${fitness.steps}/${fitness.goals.steps}\n`;
            response += `│ ⚖️ *Weight:* ${fitness.weight || 'Not set'} kg\n`;
            response += `│ 📏 *Height:* ${fitness.height || 'Not set'} cm\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `*COMMANDS:*\n`;
            response += `${prefix}fitness log <exercise> <count> - Log workout\n`;
            response += `${prefix}fitness steps <number> - Log steps\n`;
            response += `${prefix}fitness weight <kg> - Set weight\n`;
            response += `${prefix}fitness height <cm> - Set height\n`;
            response += `${prefix}fitness bmi - Calculate BMI\n`;
            response += `${prefix}fitness routine - Get workout plan\n`;
            response += `${prefix}fitness stats - View stats\n`;
            response += `${prefix}fitness list - Exercise list\n`;
            response += `${prefix}fitness reset - Reset today\n\n`;
            response += `_VEX Fitness - Created by Lupin Starnley_`;

            return m.reply(response);
        }

        // =========================
        // 2. LOG WORKOUT
        // =========================
        if (action === 'log') {
            const exerciseKey = args[1]?.toLowerCase();
            const count = parseInt(args[2]);

            if (!exerciseKey ||!exerciseDB[exerciseKey]) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Invalid exercise!\n\n*Valid:* ${Object.keys(exerciseDB).join(', ')}\n\n*Usage:* ${prefix}fitness log pushup 20\n\n_VEX Fitness v2.0_`);
            }

            if (isNaN(count) || count < 1) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Invalid count!\n\n*Usage:* ${prefix}fitness log pushup 20\n\n_VEX Fitness v2.0_`);
            }

            const exercise = exerciseDB[exerciseKey];
            const calories = Math.round(exercise.calories * count);
            const now = Date.now();

            const workout = {
                exercise: exerciseKey,
                name: exercise.name,
                count: count,
                calories: calories,
                date: now,
                emoji: exercise.emoji
            };

            fitness.workouts.push(workout);
            fitness.totalCalories += calories;
            fitness.totalWorkouts++;

            // Update streak
            const lastWorkout = new Date(fitness.lastWorkout).toDateString();
            const today = new Date().toDateString();
            const yesterday = new Date(Date.now() - 86400000).toDateString();

            if (lastWorkout === today) {
                // Same day, don't change streak
            } else if (lastWorkout === yesterday) {
                fitness.streak++;
            } else {
                fitness.streak = 1;
            }
            fitness.lastWorkout = now;

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `${ui.log}\n\n`;
            response += `┌─ *WORKOUT LOGGED* ${ui.line.repeat(10)}\n`;
            response += `│\n`;
            response += `│ ${exercise.emoji} *Exercise:* ${exercise.name}\n`;
            response += `│ 🔢 *Count:* ${count} ${exercise.unit || 'reps'}\n`;
            response += `│ 🔥 *Calories:* ${calories} kcal\n`;
            response += `│ 📊 *Total Today:* ${fitness.workouts.filter(w => new Date(w.date).toDateString() === today).reduce((s, w) => s + w.calories, 0)} kcal\n`;
            response += `│ 🔥 *Streak:* ${fitness.streak} days\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `${fitness.streak >= 3? '💪 *BEAST MODE!*' : '_Keep pushing!_'}`;

            return m.reply(response);
        }

        // =========================
        // 3. LOG STEPS
        // =========================
        if (action === 'steps') {
            const steps = parseInt(args[1]);
            if (isNaN(steps) || steps < 0) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Invalid steps!\n\n*Usage:* ${prefix}fitness steps 5000\n\n_VEX Fitness v2.0_`);
            }

            fitness.steps = steps;
            const progress = Math.round((steps / fitness.goals.steps) * 100);

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `👟 *STEPS LOGGED*\n\n`;
            response += `┌─ *DAILY STEPS* ${ui.line.repeat(11)}\n`;
            response += `│\n`;
            response += `│ 👟 *Steps:* ${steps.toLocaleString()}\n`;
            response += `│ 🎯 *Goal:* ${fitness.goals.steps.toLocaleString()}\n`;
            response += `│ 📊 *Progress:* ${progress}%\n`;
            response += `│ ${steps >= fitness.goals.steps? '✅ *GOAL ACHIEVED!*' : '⏳ *KEEP MOVING!*'}\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `_10,000 steps = ~5km walk_`;

            return m.reply(response);
        }

        // =========================
        // 4. SET WEIGHT
        // =========================
        if (action === 'weight') {
            const weight = parseFloat(args[1]);
            if (isNaN(weight) || weight < 20 || weight > 300) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Invalid weight! Use 20-300 kg\n\n*Usage:* ${prefix}fitness weight 70\n\n_VEX Fitness v2.0_`);
            }

            fitness.weight = weight;

            return m.reply(`${ui.title}\n${ui.line.repeat(30)}\n\n✅ *WEIGHT UPDATED*\n\n⚖️ Weight: ${weight} kg\n\n_Use ${prefix}fitness bmi to calculate BMI_`);
        }

        // =========================
        // 5. SET HEIGHT
        // =========================
        if (action === 'height') {
            const height = parseInt(args[1]);
            if (isNaN(height) || height < 100 || height > 250) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Invalid height! Use 100-250 cm\n\n*Usage:* ${prefix}fitness height 175\n\n_VEX Fitness v2.0_`);
            }

            fitness.height = height;

            return m.reply(`${ui.title}\n${ui.line.repeat(30)}\n\n✅ *HEIGHT UPDATED*\n\n📏 Height: ${height} cm\n\n_Use ${prefix}fitness bmi to calculate BMI_`);
        }

        // =========================
        // 6. BMI CALCULATOR
        // =========================
        if (action === 'bmi') {
            if (!fitness.weight ||!fitness.height) {
                return m.reply(`${ui.title}\n${ui.line.repeat(25)}\n\n❌ Set weight and height first!\n\n*Usage:*\n${prefix}fitness weight 70\n${prefix}fitness height 175\n\n_VEX Fitness v2.0_`);
            }

            const heightM = fitness.height / 100;
            const bmi = (fitness.weight / (heightM * heightM)).toFixed(1);

            let category, emoji, advice;
            if (bmi < 18.5) {
                category = 'Underweight';
                emoji = '⚠️';
                advice = 'Consider gaining weight with healthy diet';
            } else if (bmi < 25) {
                category = 'Normal';
                emoji = '✅';
                advice = 'Great! Maintain your healthy lifestyle';
            } else if (bmi < 30) {
                category = 'Overweight';
                emoji = '⚠️';
                advice = 'Consider cardio and diet adjustment';
            } else {
                category = 'Obese';
                emoji = '🚨';
                advice = 'Consult a doctor for health plan';
            }

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `${ui.bmi}\n\n`;
            response += `┌─ *BMI REPORT* ${ui.line.repeat(13)}\n`;
            response += `│\n`;
            response += `│ ⚖️ *Weight:* ${fitness.weight} kg\n`;
            response += `│ 📏 *Height:* ${fitness.height} cm\n`;
            response += `│ 📊 *BMI:* ${bmi}\n`;
            response += `│ ${emoji} *Category:* ${category}\n`;
            response += `│\n`;
            response += `│ 💡 *Advice:* ${advice}\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `_BMI Range: 18.5-24.9 is normal_`;

            return m.reply(response);
        }

        // =========================
        // 7. WORKOUT ROUTINE
        // =========================
        if (action === 'routine' || action === 'plan') {
            const routines = {
                beginner: [
                    "10 Push-ups",
                    "15 Squats",
                    "30s Plank",
                    "10 Jumping Jacks",
                    "10 Sit-ups"
                ],
                intermediate: [
                    "20 Push-ups",
                    "25 Squats",
                    "60s Plank",
                    "20 Jumping Jacks",
                    "20 Sit-ups",
                    "1km Running"
                ],
                advanced: [
                    "50 Push-ups",
                    "50 Squats",
                    "120s Plank",
                    "50 Jumping Jacks",
                    "50 Sit-ups",
                    "3km Running"
                ]
            };

            const level = args[1]?.toLowerCase() || 'beginner';
            const routine = routines[level] || routines.beginner;

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `${ui.routine}\n\n`;
            response += `┌─ *${level.toUpperCase()} ROUTINE* ${ui.line.repeat(8)}\n`;
            response += `│\n`;
            routine.forEach((ex, i) => {
                response += `│ ${i + 1}. ${ex}\n`;
            });
            response += `│\n`;
            response += `│ 🔥 *Estimated:* ${level === 'beginner'? '200' : level === 'intermediate'? '400' : '800'} kcal\n`;
            response += `│ ⏱️ *Duration:* ${level === 'beginner'? '15' : level === 'intermediate'? '30' : '45'} min\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `_Rest 30s between exercises_`;

            return m.reply(response);
        }

        // =========================
        // 8. STATS
        // =========================
        if (action === 'stats' || action === 'stat') {
            const totalWorkouts = fitness.workouts.length;
            const totalCalories = fitness.totalCalories;
            const avgCalories = totalWorkouts > 0? Math.round(totalCalories / totalWorkouts) : 0;

            // Last 7 days
            const weekAgo = Date.now() - 604800000;
            const weekWorkouts = fitness.workouts.filter(w => w.date > weekAgo);
            const weekCalories = weekWorkouts.reduce((sum, w) => sum + w.calories, 0);

            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `📊 *FITNESS STATS*\n\n`;
            response += `┌─ *ALL TIME* ${ui.line.repeat(13)}\n`;
            response += `│\n`;
            response += `│ 💪 *Total Workouts:* ${fitness.totalWorkouts}\n`;
            response += `│ 🔥 *Total Calories:* ${fitness.totalCalories.toLocaleString()} kcal\n`;
            response += `│ 📈 *Avg/Workout:* ${avgCalories} kcal\n`;
            response += `│ 🔥 *Best Streak:* ${fitness.streak} days\n`;
            response += `│\n`;
            response += `│ 📅 *Last 7 Days:* ${weekWorkouts.length} workouts\n`;
            response += `│ 🔥 *Week Calories:* ${weekCalories} kcal\n`;
            response += `│\n`;
            response += `└${ui.line.repeat(25)}\n\n`;
            response += `_Consistency is key!_`;

            return m.reply(response);
        }

        // =========================
        // 9. EXERCISE LIST
        // =========================
        if (action === 'list') {
            let response = `${ui.title}\n${ui.line.repeat(30)}\n\n`;
            response += `📋 *EXERCISE LIST*\n\n`;

            Object.entries(exerciseDB).forEach(([key, ex]) => {
                const unit = ex.unit || 'reps';
                response += `${ex.emoji} *${ex.name}* (${key})\n`;
                response += ` └ ${ex.calories} kcal per ${unit}\n`;
                response += ` └ ${prefix}fitness log ${key} 20\n\n`;
            });

            response += `${ui.line.repeat(25)}\n`;
            response += `_Use ${prefix}fitness log <exercise> <count>_`;

            return m.reply(response);
        }

        // =========================
        // 10. RESET
        // =========================
        if (action === 'reset') {
            const today = new Date().toDateString();
            fitness.workouts = fitness.workouts.filter(w => new Date(w.date).toDateString()!== today);
            fitness.steps = 0;

            return m.reply(`${ui.title}\n${ui.line.repeat(30)}\n\n🔄 *DAY RESET*\n\nAll today's data cleared\nStreak maintained: ${fitness.streak} days\n\n_Fresh start!_`);
        }

        return m.reply(`${ui.error}\n\nUse ${prefix}lifestyle help`);
    }
};
