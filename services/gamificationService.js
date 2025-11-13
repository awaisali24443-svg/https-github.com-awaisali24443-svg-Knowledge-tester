import { LOCAL_STORAGE_KEYS } from '../constants.js';
import { showToast } from './toastService.js';

const defaultStats = {
    currentStreak: 0,
    lastQuizDate: null,
    unlockedAchievements: [],
};

let stats = { ...defaultStats };

const ACHIEVEMENTS = {
    // Quiz Completion Achievements
    novice: { name: "Novice", description: "Complete your first quiz.", icon: "award", condition: (s, h) => h.length >= 1 },
    scholar: { name: "Scholar", description: "Complete 10 quizzes.", icon: "award", condition: (s, h) => h.length >= 10 },
    master: { name: "Master", description: "Complete 50 quizzes.", icon: "award", condition: (s, h) => h.length >= 50 },
    
    // Performance Achievements
    perfectionist: { name: "Perfectionist", description: "Get a 100% score on a quiz.", icon: "star", condition: (s, h, q) => q.score / q.totalQuestions === 1 },
    
    // Streak Achievements
    hot_streak: { name: "Hot Streak", description: "Maintain a 3-day streak.", icon: "zap", condition: (s) => s.currentStreak >= 3 },
    unstoppable: { name: "Unstoppable", description: "Maintain a 7-day streak.", icon: "zap", condition: (s) => s.currentStreak >= 7 },
    
    // Category Mastery (Example - can be expanded)
    tech_guru: { name: "Tech Guru", description: "Complete 5 quizzes on Technology topics.", icon: "cpu", condition: (s, h) => h.filter(item => item.topic && item.topic.toLowerCase().includes('machine learning') || item.topic.toLowerCase().includes('cybersecurity')).length >= 5 },
};


function loadStats() {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.GAMIFICATION);
        stats = stored ? { ...defaultStats, ...JSON.parse(stored) } : { ...defaultStats };
    } catch (e) {
        console.error("Failed to load gamification stats:", e);
        stats = { ...defaultStats };
    }
}

function saveStats() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.GAMIFICATION, JSON.stringify(stats));
    } catch (e) {
        console.error("Failed to save gamification stats:", e);
    }
}

export function init() {
    loadStats();
}

export function getStats() {
    return { ...stats };
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

function updateStreak(today) {
    if (!stats.lastQuizDate) {
        stats.currentStreak = 1;
        showToast(`Quiz streak started! Keep it up! 🔥`);
        return;
    }

    const lastDate = new Date(stats.lastQuizDate);
    if (isSameDay(today, lastDate)) {
        // Already played today, no change
        return;
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(lastDate, yesterday)) {
        stats.currentStreak++;
        showToast(`Streak Extended: ${stats.currentStreak} Days! 🔥`);
    } else {
        stats.currentStreak = 1;
        showToast(`Quiz streak started! Keep it up! 🔥`);
    }
}

function checkAchievements(quizState, history) {
    Object.keys(ACHIEVEMENTS).forEach(key => {
        if (!stats.unlockedAchievements.includes(key)) {
            const achievement = ACHIEVEMENTS[key];
            if (achievement.condition(stats, history, quizState)) {
                stats.unlockedAchievements.push(key);
                showToast(`Achievement Unlocked: ${achievement.name}!`, 'success');
            }
        }
    });
}

/**
 * Called by historyService when a quiz is completed.
 * Updates streak and checks for new achievements.
 * @param {object} quizState - The final quiz state.
 * @param {Array<object>} history - The full quiz history.
 */
export function updateStatsOnQuizCompletion(quizState, history) {
    const today = new Date();
    updateStreak(today);
    stats.lastQuizDate = today.toISOString();
    
    checkAchievements(quizState, history);
    
    saveStats();
}

/**
 * Gets all achievements with their unlocked status.
 * @returns {Array<object>}
 */
export function getAchievements() {
    return Object.entries(ACHIEVEMENTS).map(([id, data]) => ({
        id,
        ...data,
        unlocked: stats.unlockedAchievements.includes(id),
    }));
}
