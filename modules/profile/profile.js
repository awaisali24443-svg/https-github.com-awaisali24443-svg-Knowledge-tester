import * as gamificationService from '../../services/gamificationService.js';
import * as historyService from '../../services/historyService.js';
import * as learningPathService from '../../services/learningPathService.js';
import * as configService from '../../services/configService.js';
import { showToast } from '../../services/toastService.js';

let elements = {};

/**
 * Calculates the time elapsed since a given date and returns a human-readable string.
 * @param {string} dateString - An ISO 8601 date string.
 * @returns {string} A relative time string (e.g., "2 days ago").
 */
function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    const weeks = Math.round(days / 7);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
}

function renderProfileStats() {
    const history = historyService.getHistory();
    const profileStats = gamificationService.getProfileStats(history);
    const journeys = learningPathService.getAllJourneys();

    const levelsCleared = journeys.reduce((total, journey) => {
        return total + (journey.currentLevel > 1 ? journey.currentLevel - 1 : 0);
    }, 0);

    elements.quizzesTaken.textContent = profileStats.totalQuizzes;
    elements.accuracy.textContent = `${profileStats.averageScore}%`;
    elements.levelsCleared.textContent = levelsCleared;
}

function renderPreferences() {
    const config = configService.getConfig();
    elements.soundToggle.checked = config.enableSound;
    // Theme is 'dark-cyber' (on) or 'light-cyber' (off)
    elements.themeToggle.checked = config.theme === 'dark-cyber';
}

function renderHistoryAndProgress() {
    // Overall Progress
    const journeys = learningPathService.getAllJourneys();
    const totalCompleted = journeys.reduce((sum, j) => sum + (j.currentLevel > 1 ? j.currentLevel - 1 : 0), 0);
    const totalPossible = journeys.reduce((sum, j) => sum + j.totalLevels, 0);
    
    if (totalPossible > 0) {
        const progressPercent = Math.round((totalCompleted / totalPossible) * 100);
        elements.levelsProgressText.textContent = `${totalCompleted} / ${totalPossible} (${progressPercent}%)`;
        elements.levelsProgressBar.style.width = `${progressPercent}%`;
    } else {
        elements.levelsProgressText.textContent = `0 / 0 (0%)`;
        elements.levelsProgressBar.style.width = `0%`;
    }

    // Recent Quizzes
    const recentHistory = historyService.getRecentHistory(3);
    elements.recentQuizzesList.innerHTML = '';

    if (recentHistory.length === 0) {
        elements.noHistoryMessage.style.display = 'block';
    } else {
        elements.noHistoryMessage.style.display = 'none';
        recentHistory.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="recent-quiz-item">
                    <div class="quiz-item-icon">
                        <svg class="icon"><use href="assets/icons/feather-sprite.svg#zap"/></svg>
                    </div>
                    <div class="quiz-item-details">
                        <p class="quiz-item-topic">${item.topic}</p>
                        <p class="quiz-item-meta">
                            <span>${item.score}/${item.totalQuestions}</span>
                            <span>${timeAgo(item.date)}</span>
                        </p>
                    </div>
                    <a href="#/game/${encodeURIComponent(item.topic.replace(/ - Level \d+$/, '').trim())}" class="btn">View Details</a>
                </div>
            `;
            elements.recentQuizzesList.appendChild(li);
        });
    }
}

function handleSoundToggle() {
    configService.setConfig({ enableSound: elements.soundToggle.checked });
    showToast(`Sound effects ${elements.soundToggle.checked ? 'enabled' : 'disabled'}.`, 'info');
}

function handleThemeToggle() {
    const newTheme = elements.themeToggle.checked ? 'dark-cyber' : 'light-cyber';
    configService.setConfig({ theme: newTheme });
    showToast(`Theme switched to ${elements.themeToggle.checked ? 'Dark' : 'Light'} Mode.`, 'info');
}

function addEventListeners() {
    elements.soundToggle.addEventListener('change', handleSoundToggle);
    elements.themeToggle.addEventListener('change', handleThemeToggle);
}

function removeEventListeners() {
    elements.soundToggle.removeEventListener('change', handleSoundToggle);
    elements.themeToggle.removeEventListener('change', handleThemeToggle);
}

export function init(appState) {
    elements = {
        // Profile Stats
        quizzesTaken: document.getElementById('quizzes-taken-stat'),
        accuracy: document.getElementById('accuracy-stat'),
        levelsCleared: document.getElementById('levels-cleared-stat'),
        // Preferences
        soundToggle: document.getElementById('sound-toggle'),
        themeToggle: document.getElementById('theme-toggle'),
        // History & Progress
        levelsProgressText: document.getElementById('levels-progress-text'),
        levelsProgressBar: document.getElementById('levels-progress-bar'),
        recentQuizzesList: document.getElementById('recent-quizzes-list'),
        noHistoryMessage: document.getElementById('no-history-message'),
    };

    renderProfileStats();
    renderPreferences();
    renderHistoryAndProgress();
    addEventListeners();
}

export function destroy() {
    removeEventListeners();
    elements = {};
}
