
import * as gamificationService from '../../services/gamificationService.js';
import * as historyService from '../../services/historyService.js';
import * as learningPathService from '../../services/learningPathService.js';
import * as firebaseService from '../../services/firebaseService.js';

function renderIdentity() {
    const stats = gamificationService.getStats();
    const history = historyService.getHistory();
    const profileStats = gamificationService.getProfileStats(history);
    const userEmail = firebaseService.getUserEmail();

    // User Info
    const nameEl = document.querySelector('.user-name');
    if (nameEl) nameEl.textContent = userEmail ? userEmail.split('@')[0] : 'Operator';
    
    // Level Badge
    const levelBadge = document.getElementById('level-badge');
    if (levelBadge) levelBadge.textContent = stats.level;

    // XP Bar
    const xpForNext = gamificationService.getXpForNextLevel(stats.level);
    const xpPercent = (stats.xp / xpForNext) * 100;
    
    const xpFill = document.getElementById('xp-fill');
    if (xpFill) xpFill.style.width = `${Math.min(100, xpPercent)}%`;
    
    const xpText = document.getElementById('xp-text');
    if (xpText) xpText.textContent = `${stats.xp} / ${xpForNext}`;

    // Core Stats
    const streakEl = document.getElementById('streak-stat');
    if (streakEl) streakEl.textContent = stats.currentStreak;
    
    const quizEl = document.getElementById('quizzes-stat');
    if (quizEl) quizEl.textContent = profileStats.totalQuizzes;
    
    const avgEl = document.getElementById('avg-score-stat');
    if (avgEl) avgEl.textContent = `${profileStats.averageScore}%`;
}

function renderQuests() {
    const quests = gamificationService.getDailyQuests();
    const list = document.getElementById('daily-quests-list');
    
    if (!list) return;
    
    if (!quests || quests.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--color-text-secondary); font-size:0.9rem;">No active protocol.</p>';
        return;
    }

    list.innerHTML = quests.map(quest => `
        <div class="quest-item ${quest.completed ? 'completed' : ''}">
            <div class="quest-status-icon">
                <svg class="icon" style="width:16px;height:16px;"><use href="assets/icons/feather-sprite.svg#${quest.completed ? 'check-circle' : 'circle'}"/></svg>
            </div>
            <span class="quest-text">${quest.text}</span>
            <span class="quest-xp">+${quest.xp}</span>
        </div>
    `).join('');
}

function renderAchievements() {
    const achievementsData = gamificationService.getAchievementsProgress();
    const grid = document.getElementById('achievements-grid');
    const countEl = document.getElementById('achievement-count');
    
    if (!grid) return;
    
    grid.innerHTML = '';
    
    const unlockedCount = achievementsData.filter(a => a.isUnlocked).length;
    if (countEl) countEl.textContent = `${unlockedCount} / ${achievementsData.length} Unlocked`;

    achievementsData.forEach(ach => {
        const card = document.createElement('div');
        const tierClass = ach.isUnlocked ? `tier-${ach.currentTierName.toLowerCase()}` : 'tier-locked';
        card.className = `achievement-card ${tierClass}`;
        
        // Tier specific styling is handled in CSS based on class
        
        card.innerHTML = `
            <div class="achievement-icon">
                <svg><use href="assets/icons/feather-sprite.svg#${ach.icon}"/></svg>
            </div>
            <h3 class="achievement-name">${ach.name}</h3>
            <p class="achievement-desc">${ach.description}</p>
            
            <div class="ach-progress-container">
                <div class="ach-progress-labels">
                    <span style="color:${ach.currentTierColor}">${ach.currentTierName}</span>
                    <span>${ach.currentValue} / ${ach.target}</span>
                </div>
                <div class="ach-progress-track">
                    <div class="ach-progress-fill" style="width: ${ach.progressPercent}%"></div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function handleUpdate() {
    renderIdentity();
    renderQuests();
    renderAchievements();
}

export function init() {
    handleUpdate();
    window.addEventListener('gamification-updated', handleUpdate);
}

export function destroy() {
    window.removeEventListener('gamification-updated', handleUpdate);
}
