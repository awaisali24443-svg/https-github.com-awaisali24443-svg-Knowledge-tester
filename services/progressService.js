import { GUEST_PROGRESS_KEY, MAX_LEVEL } from '../constants.js';
import { getCurrentUser, isGuest } from './authService.js';

const XP_PER_QUESTION = 10;
const XP_PER_LEVEL = 100;

const createNewProgress = () => ({
    totalXp: 0,
    levels: {}, // { topicName: levelNumber }
    history: {}, // { topicName: { correct: 0, incorrect: 0, sessions: [], missedConcepts: [] } }
    achievements: [],
    streak: 0,
    lastQuizDate: null,
    challengeHighScore: 0,
    streakDates: []
});

export const getProgress = async () => {
    if (isGuest()) {
        const localProgress = localStorage.getItem(GUEST_PROGRESS_KEY);
        return localProgress ? JSON.parse(localProgress) : createNewProgress();
    }
    // Firebase logic would go here when re-enabled
    console.warn("Firebase progress fetch is disabled.");
    return createNewProgress(); // Placeholder for logged-in users
};

export const saveProgress = async (progressData) => {
    if (isGuest()) {
        localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(progressData));
        return;
    }
    // Firebase logic
};

export const calculateLevel = (xp) => {
    const level = Math.floor(xp / XP_PER_LEVEL) + 1;
    const xpInLevel = xp % XP_PER_LEVEL;
    return { level, xpInLevel, xpForNextLevel: XP_PER_LEVEL };
};

export const updateUserProfile = async (profileData) => {
    if (isGuest()) {
        const progress = await getProgress();
        const updatedProgress = { ...progress, ...profileData };
        await saveProgress(updatedProgress);
        return;
    }
    // Firebase logic
};

export const recordQuizResult = async (topicName, score, totalQuestions, isLeveled, missedConcepts) => {
    const progress = await getProgress();
    const xpGained = score * XP_PER_QUESTION;
    progress.totalXp += xpGained;

    if (isLeveled) {
        progress.levels[topicName] = progress.levels[topicName] || 1;
        if (score >= 3 && progress.levels[topicName] < MAX_LEVEL) {
            progress.levels[topicName]++;
        }
    }

    progress.history[topicName] = progress.history[topicName] || { correct: 0, incorrect: 0, sessions: [], missedConcepts: [] };
    progress.history[topicName].correct += score;
    progress.history[topicName].incorrect += (totalQuestions - score);
    progress.history[topicName].sessions = progress.history[topicName].sessions || [];
    progress.history[topicName].sessions.push({ score, timestamp: new Date().toISOString() });
    
    // Add new missed concepts, keeping a unique list
    const existingConcepts = new Set(progress.history[topicName].missedConcepts);
    missedConcepts.forEach(concept => existingConcepts.add(concept));
    progress.history[topicName].missedConcepts = Array.from(existingConcepts);


    // Streak logic
    const today = new Date().toISOString().split('T')[0];
    if (progress.lastQuizDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (progress.lastQuizDate === yesterdayStr) {
            progress.streak++;
        } else {
            progress.streak = 1;
        }
        progress.lastQuizDate = today;
        progress.streakDates = progress.streakDates || [];
        if (!progress.streakDates.includes(today)) {
             progress.streakDates.push(today);
        }
    }

    await saveProgress(progress);
    return { xpGained, newLevel: progress.levels[topicName] };
};