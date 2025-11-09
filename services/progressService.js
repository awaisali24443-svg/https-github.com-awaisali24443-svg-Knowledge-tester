const PROGRESS_KEY = 'knowledgeTesterUserProgress';
const MAX_MISSED_CONCEPTS_PER_TOPIC = 20; // Cap to prevent excessive localStorage usage

// --- GAMIFICATION: Leveling Curve ---
const getXPForLevel = (level) => {
    if (level <= 1) return 0;
    return Math.floor(100 * Math.pow(level - 1, 1.5));
};

export const calculateLevelInfo = (totalXP) => {
    let level = 1;
    while (totalXP >= getXPForLevel(level + 1)) {
        level++;
    }
    const xpForCurrentLevel = getXPForLevel(level);
    const xpForNextLevel = getXPForLevel(level + 1);
    
    const currentXPInLevel = totalXP - xpForCurrentLevel;
    const nextLevelXPInLevel = xpForNextLevel - xpForCurrentLevel;
    const percentage = nextLevelXPInLevel > 0 ? (currentXPInLevel / nextLevelXPInLevel) * 100 : 100;

    return { level, currentXP: currentXPInLevel, nextLevelXP: nextLevelXPInLevel, percentage };
};
// --- END GAMIFICATION ---


const getDefaultProgress = () => ({
    stats: {
        totalQuizzes: 0,
        totalCorrect: 0,
        xp: 0,
        weeklyXP: 0, // For leaderboard
        lastWeekReset: getWeekId(new Date()), // For leaderboard
        streak: 0,
        lastQuizDate: null,
        challengeHighScore: 0,
    },
    levels: {}, // Per-topic levels
    history: {}, // Detailed per-topic history for AI Tutor and Nemesis Quizzes
    achievements: [], // Array of unlocked achievement IDs
});

const isSameDay = (date1, date2) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

// Function to get a unique ID for the current week (e.g., "2023-34")
const getWeekId = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-${weekNo}`;
};


export const getProgress = () => {
    try {
        const progressString = localStorage.getItem(PROGRESS_KEY);
        if (progressString) {
            const savedProgress = JSON.parse(progressString);
            const defaultStructure = getDefaultProgress();
            // Deep merge to ensure new properties are added to existing save files
            const progress = {
                stats: { ...defaultStructure.stats, ...savedProgress.stats },
                levels: { ...defaultStructure.levels, ...savedProgress.levels },
                history: { ...defaultStructure.history, ...savedProgress.history },
                achievements: savedProgress.achievements || [],
            };
            
            // Check for weekly leaderboard reset
            const currentWeekId = getWeekId(new Date());
            if (progress.stats.lastWeekReset !== currentWeekId) {
                progress.stats.weeklyXP = 0;
                progress.stats.lastWeekReset = currentWeekId;
            }

            if (progress.stats.lastQuizDate) {
                const today = new Date();
                const lastDate = new Date(progress.stats.lastQuizDate);
                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);

                if (!isSameDay(today, lastDate) && !isSameDay(yesterday, lastDate)) {
                    progress.stats.streak = 0;
                }
            }
            return progress;
        }
        return getDefaultProgress();
    } catch (e) {
        console.error("Could not load user progress:", e);
        return getDefaultProgress();
    }
};

export const saveProgress = (progress) => {
    try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {
        console.error("Could not save user progress:", e);
    }
};

export const getCurrentLevel = (topic) => {
    const progress = getProgress();
    return progress.levels[topic] || 1;
};

export const unlockNextLevel = (topic, maxLevel = 50) => {
    const progress = getProgress();
    const currentLevel = progress.levels[topic] || 1;
    if (currentLevel < maxLevel) {
        progress.levels[topic] = currentLevel + 1;
        progress.stats.xp += 100; // Bonus XP for topic leveling up
        progress.stats.weeklyXP += 100;
        saveProgress(progress);
    }
};

export const recordQuizResult = (topic, score, quizData, userAnswers, xpGained) => {
    const progress = getProgress();
    const today = new Date();
    const lastDate = progress.stats.lastQuizDate ? new Date(progress.stats.lastQuizDate) : null;
    
    // --- Update Streak ---
    if (lastDate) {
        if (!isSameDay(today, lastDate)) {
             const yesterday = new Date();
             yesterday.setDate(today.getDate() - 1);
             if (isSameDay(yesterday, lastDate)) {
                 progress.stats.streak += 1;
             } else {
                 progress.stats.streak = 1;
             }
        }
    } else {
        progress.stats.streak = 1;
    }

    // --- Update Core Stats ---
    progress.stats.lastQuizDate = today.toISOString();
    progress.stats.totalQuizzes += 1;
    progress.stats.totalCorrect += score;
    progress.stats.xp += xpGained;
    progress.stats.weeklyXP += xpGained;

    // --- Update Topic History for AI Tutor & Nemesis Quizzes ---
    if (topic && quizData) {
        if (!progress.history[topic]) {
            progress.history[topic] = { correct: 0, incorrect: 0, missedConcepts: [] };
        }
        progress.history[topic].correct += score;
        progress.history[topic].incorrect += (quizData.length - score);

        // Store concepts from incorrect answers
        for(let i=0; i < quizData.length; i++) {
            if (userAnswers[i] !== quizData[i].correctAnswerIndex) {
                // Add the explanation, which usually contains the core concept
                progress.history[topic].missedConcepts.push(quizData[i].explanation);
            }
        }
        // Trim the array to prevent it from getting too large
        if (progress.history[topic].missedConcepts.length > MAX_MISSED_CONCEPTS_PER_TOPIC) {
            progress.history[topic].missedConcepts.splice(0, progress.history[topic].missedConcepts.length - MAX_MISSED_CONCEPTS_PER_TOPIC);
        }
    }
    
    saveProgress(progress);
    return progress; // Return the updated progress for achievement checks
};

export const getTopicHistory = (topic) => {
    const progress = getProgress();
    return progress.history[topic] || { correct: 0, incorrect: 0, missedConcepts: [] };
};

export const updateChallengeHighScore = (newScore) => {
    const progress = getProgress();
    if (newScore > progress.stats.challengeHighScore) {
        progress.stats.challengeHighScore = newScore;
        saveProgress(progress);
        return true;
    }
    return false;
};

export const unlockAchievement = (achievementId) => {
    const progress = getProgress();
    if (!progress.achievements.includes(achievementId)) {
        progress.achievements.push(achievementId);
        saveProgress(progress);
        return true; 
    }
    return false;
};

export const resetProgress = () => {
    try {
        localStorage.removeItem(PROGRESS_KEY);
    } catch (e) {
        console.error("Could not reset user progress:", e);
    }
};