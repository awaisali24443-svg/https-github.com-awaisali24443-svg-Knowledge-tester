import { getProgress, calculateLevelInfo } from '../../services/progressService.js';
import { getActiveMissions } from '../../services/missionService.js';

async function renderWelcome() {
    const progress = await getProgress(true); // Force refresh on home page load
    if (!progress) return;

    document.getElementById('welcome-message').textContent = `Welcome, ${progress.username || 'Agent'}!`;
    
    // Render player stats
    const { level, progressPercentage, currentLevelXP, xpForNextLevel } = calculateLevelInfo(progress.xp);
    document.getElementById('player-level-badge').textContent = `LVL ${level}`;
    document.getElementById('player-xp-bar').style.width = `${progressPercentage}%`;
    document.getElementById('player-xp-text').textContent = `${currentLevelXP.toLocaleString()} / ${xpForNextLevel.toLocaleString()} XP`;
    document.getElementById('player-streak-text').textContent = `🔥 ${progress.streak} Day Streak`;
}

async function renderMissions() {
    const missions = await getActiveMissions();
    const listEl = document.getElementById('missions-list');
    
    if (!listEl) return;
    
    if (missions.length === 0) {
        listEl.innerHTML = '<div class="mission-placeholder">No new missions today. Check back tomorrow!</div>';
        return;
    }

    listEl.innerHTML = missions.map(mission => `
        <div class="mission-card ${mission.isComplete ? 'completed' : ''}">
            <div class="mission-info">
                <p>${mission.description}</p>
            </div>
            <div class="mission-reward">
                +${mission.reward} XP
            </div>
        </div>
    `).join('');
}

function init() {
    renderWelcome();
    renderMissions();
}

init();
