import * as progressService from './progressService.js';
import { MAX_LEVEL } from '../constants.js';
import { categoryData } from './topicService.js';

export const ALL_ACHIEVEMENTS = [
    {
        id: 'first_quiz',
        name: 'First Steps',
        description: 'Complete your first quiz.',
        icon: '🎓',
        check: (progress) => (Object.values(progress.history).reduce((sum, item) => sum + item.correct + item.incorrect, 0) / 5) >= 1
    },
    {
        id: 'perfect_score',
        name: 'Perfectionist',
        description: 'Get a perfect score on any quiz.',
        icon: '🎯',
        check: (progress, context, score) => score === 5 // Assuming 5 questions
    },
    {
        id: 'level_10',
        name: 'Adept Learner',
        description: 'Reach player level 10.',
        icon: '🧠',
        check: (progress) => progressService.calculateLevelInfo(progress.xp).level >= 10
    },
    {
        id: 'topic_master',
        name: 'Topic Master',
        description: 'Master your first topic by reaching the max level.',
        icon: '🌟',
        check: (progress, context) => progress.levels[context.topicName] >= MAX_LEVEL
    },
    {
        id: 'category_master_science',
        name: 'Scientist',
        description: 'Master all topics in the Science category.',
        icon: '🔬',
        check: (progress) => {
            const scienceTopics = categoryData.science.topics.map(t => t.name);
            return scienceTopics.every(topic => (progress.levels[topic] || 0) >= MAX_LEVEL);
        }
    },
     {
        id: 'category_master_programming',
        name: 'Code Master',
        description: 'Master all topics in the Programming category.',
        icon: '💻',
        check: (progress) => {
            const programmingTopics = categoryData.programming.topics.map(t => t.name);
            return programmingTopics.every(topic => (progress.levels[topic] || 0) >= MAX_LEVEL);
        }
    },
    {
        id: 'quiz_streak_3',
        name: 'On a Roll',
        description: 'Maintain a 3-day quiz streak.',
        icon: '🔥',
        check: (progress) => progress.streak >= 3
    },
    {
        id: 'explorer',
        name: 'Explorer',
        description: 'Complete a quiz in every category.',
        icon: '🗺️',
        check: (progress) => {
            const completedCategories = new Set(Object.keys(progress.levels).map(topic => {
                for (const catKey in categoryData) {
                    if (categoryData[catKey].topics.some(t => t.name === topic)) {
                        return catKey;
                    }
                }
                return null;
            }));
            return completedCategories.size >= Object.keys(categoryData).length;
        }
    }
];

/**
 * Checks the user's progress against all achievements and unlocks any new ones.
 * @param {object} progress - The updated user progress object from Firestore.
 * @param {object} quizContext - The context of the quiz that was just completed.
 * @param {number} score - The score from the completed quiz.
 * @returns {Promise<Array<object>>} - A promise that resolves to an array of newly unlocked achievement objects.
 */
export async function checkAchievements(progress, quizContext, score) {
    const newAchievements = [];
    const unlockedAchievements = progress.achievements || [];

    for (const achievement of ALL_ACHIEVEMENTS) {
        if (!unlockedAchievements.includes(achievement.id)) {
            if (achievement.check(progress, quizContext, score)) {
                unlockedAchievements.push(achievement.id);
                newAchievements.push(achievement);
            }
        }
    }
    
    // If new achievements were found, update them in the database.
    if (newAchievements.length > 0) {
        await progressService.updateProgressData({
             achievements: unlockedAchievements 
        });
    }
    
    return newAchievements;
}