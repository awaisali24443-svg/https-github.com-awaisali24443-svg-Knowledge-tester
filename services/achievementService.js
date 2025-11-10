import { getProgress, saveProgress } from './progressService.js';

export const ALL_ACHIEVEMENTS = [
    { id: 'first_quiz', name: 'First Step', description: 'Complete your first quiz.', icon: '🎓' },
    { id: 'perfect_score', name: 'Perfectionist', description: 'Get a perfect score on a quiz.', icon: '🎯' },
    { id: 'streak_3', name: 'On a Roll', description: 'Maintain a 3-day streak.', icon: '🔥' },
    { id: 'level_5', name: 'Adept Learner', description: 'Reach level 5 in any topic.', icon: '🌟' },
];

export async function checkAndUnlockAchievements(event, data) {
    const progress = await getProgress();
    const newlyUnlocked = [];

    const unlock = (achievementId) => {
        if (!progress.achievements.includes(achievementId)) {
            progress.achievements.push(achievementId);
            newlyUnlocked.push(ALL_ACHIEVEMENTS.find(a => a.id === achievementId));
        }
    };

    if (event === 'quiz_completed') {
        unlock('first_quiz');
        if (data.score === data.totalQuestions) {
            unlock('perfect_score');
        }
    }
    
    if (progress.streak >= 3) {
        unlock('streak_3');
    }

    if (Object.values(progress.levels).some(level => level >= 5)) {
        unlock('level_5');
    }

    if (newlyUnlocked.length > 0) {
        await saveProgress(progress);
    }

    return newlyUnlocked;
}