import * as gamificationService from '../../services/gamificationService.js';
import * as historyService from '../../services/historyService.js';

function renderStats() {
    const stats = gamificationService.getStats();
    const history = historyService.getHistory();
    
    document.getElementById('total-quizzes-stat').textContent = history.length;
    document.getElementById('current-streak-stat').textContent = stats.currentStreak;
}

function renderAchievements() {
    const achievements = gamificationService.getAchievements();
    const grid = document.getElementById('achievements-grid');
    const template = document.getElementById('achievement-template');
    grid.innerHTML = '';

    achievements.forEach(ach => {
        const card = template.content.cloneNode(true);
        const cardEl = card.querySelector('.achievement-card');
        
        cardEl.classList.add(ach.unlocked ? 'unlocked' : 'locked');
        cardEl.setAttribute('aria-label', `${ach.name}: ${ach.description}. ${ach.unlocked ? 'Status: Unlocked.' : 'Status: Locked.'}`);

        const use = card.querySelector('use');
        use.setAttribute('href', `/assets/icons/feather-sprite.svg#${ach.icon}`);
        
        card.querySelector('.achievement-name').textContent = ach.name;
        card.querySelector('.achievement-description').textContent = ach.description;
        
        grid.appendChild(card);
    });
}

export function init(appState) {
    renderStats();
    renderAchievements();
}

export function destroy() {
    // No dynamic event listeners to remove
}