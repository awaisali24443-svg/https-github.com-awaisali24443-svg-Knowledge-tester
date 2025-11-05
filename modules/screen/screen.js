import * as progressService from '../../services/progressService.js';
import { MAX_LEVEL } from '../../constants.js';
import { categoryData } from '../../services/topicService.js';

console.log("Screen module loaded.");

// Dynamically generate the category-to-topic mapping from the single source of truth.
const topicCategories = Object.values(categoryData).reduce((acc, category) => {
    acc[category.categoryTitle] = category.topics.map(topic => topic.name);
    return acc;
}, {});


function renderProgress() {
    const progress = progressService.getProgress();
    const { stats, levels } = progress;

    // Render Overall Stats
    const totalQuizzesEl = document.getElementById('total-quizzes');
    const averageScoreEl = document.getElementById('average-score');
    const levelsUnlockedEl = document.getElementById('levels-unlocked');

    if (totalQuizzesEl) totalQuizzesEl.textContent = stats.totalQuizzes;
    
    if (averageScoreEl) {
        const totalPossibleScore = stats.totalQuizzes * 5; // Assuming 5 questions per quiz
        const avg = totalPossibleScore > 0 ? Math.round((stats.totalCorrect / totalPossibleScore) * 100) : 0;
        averageScoreEl.textContent = `${avg}%`;
    }

    if (levelsUnlockedEl) {
        // Sum of all levels unlocked (level 1 counts as 0 unlocked levels)
        const totalLevelsUnlocked = Object.values(levels).reduce((sum, level) => sum + (level - 1), 0);
        levelsUnlockedEl.textContent = totalLevelsUnlocked;
    }

    // Render Topic-specific Progress Dynamically
    const progressListContainer = document.getElementById('progress-list-container');
    if (!progressListContainer) return;

    let allProgressHtml = '';
    const topicsWithProgress = Object.keys(levels);

    for (const category in topicCategories) {
        const topicsInCategory = topicCategories[category];
        
        // Filter out topics from the progress data that belong to the current category and have progress
        const categoryProgressHtml = topicsInCategory
            .filter(topic => levels[topic] > 1) // Only show topics where progress has been made
            .map(topic => {
                const level = levels[topic] || 1;
                return createProgressItemHtml(topic, level);
            })
            .join('');

        // Only render the category section if it contains progress items
        if (categoryProgressHtml.trim() !== '') {
            allProgressHtml += `
                <div class="progress-category">
                    <h2>${category}</h2>
                    <div class="progress-list">
                        ${categoryProgressHtml}
                    </div>
                </div>
            `;
        }
    }

    if (topicsWithProgress.length === 0) {
         progressListContainer.innerHTML = '<p class="no-progress-message">You haven\'t started any leveled quizzes yet. Go to "Explore Topics" to begin!</p>';
    } else {
        progressListContainer.innerHTML = allProgressHtml;
    }
}

function createProgressItemHtml(topic, level) {
    const percentage = ((level - 1) / (MAX_LEVEL - 1)) * 100;
    return `
        <div class="progress-item">
            <div class="progress-item-info">
                <strong>${topic}</strong>
                <div class="topic-progress-bar-container">
                    <div class="topic-progress-bar" style="width: ${percentage}%"></div>
                </div>
            </div>
            <div class="progress-item-level">
                Level ${level}
            </div>
        </div>
    `;
}

// Initial render
renderProgress();