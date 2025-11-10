import { getProgress, saveProgress } from './progressService.js';
import { MAX_LEVEL } from '../constants.js';

export const ALL_ACHIEVEMENTS = [
    { id: 'first_quiz', name: 'First Step', description: 'Complete your first quiz.', icon: '🎓' },
    { id: 'perfect_score', name: 'Perfectionist', description: 'Get a perfect score on a quiz.', icon: '🎯' },
    { id: 'streak_3', name: 'On a Roll', description: 'Maintain a 3-day streak.', icon: '🔥' },
    { id: 'level_5', name: 'Adept Learner', description: 'Reach level 5 in any topic.', icon: '🌟' },
    { id: 'topic_master_1', name: 'Topic Master', description: `Master a topic by reaching Level ${MAX_LEVEL}.`, icon: '👑' },
    { id: 'study_guide_user', name: 'Scholar', description: 'Generate your first study guide.', icon: '📚' },
    { id: 'challenge_high_score_10', name: 'Challenger', description: 'Score 10 or more in Challenge Mode.', icon: '⚡' },
    { id: 'learning_path_complete', name: 'Voyager', description: 'Complete your first Learning Path.', icon: '🗺️' },
];

export async function checkAndUnlockAchievements(event, data = {}) {
    const progress = await getProgress();
    const newlyUnlocked = [];

    const unlock = (achievementId) => {
        if (!progress.achievements.includes(achievementId)) {
            progress.achievements.push(achievementId);
            const achievementData = ALL_ACHIEVEMENTS.find(a => a.id === achievementId);
            if (achievementData) {
                newlyUnlocked.push(achievementData);
            }
        }
    };

    switch(event) {
        case 'quiz_completed':
            unlock('first_quiz');
            if (data.score === data.totalQuestions) {
                unlock('perfect_score');
            }
            break;
        
        case 'level_up':
             if (data.newLevel >= 5) {
                unlock('level_5');
            }
            if (data.newLevel >= MAX_LEVEL) {
                unlock('topic_master_1');
            }
            break;

        case 'challenge_score_recorded':
            if (data.score >= 10) {
                unlock('challenge_high_score_10');
            }
            break;
            
        case 'study_guide_generated':
            unlock('study_guide_user');
            break;
            
        case 'learning_path_completed':
            unlock('learning_path_complete');
            break;
    }
    
    if (progress.streak >= 3) {
        unlock('streak_3');
    }

    if (newlyUnlocked.length > 0) {
        await saveProgress(progress);
    }

    return newlyUnlocked;
}