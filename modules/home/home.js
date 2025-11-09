import { getProgress, calculateLevelInfo } from '../../services/progressService.js';
import { getActiveMissions } from '../../services/missionService.js';
import { StellarMap } from '../../services/stellarMap.js';
import { getCurrentUser } from '../../services/authService.js';

let stellarMap;

async function displayDailyMissions() {
    const container = document.getElementById('daily-missions-container');
    if (!container) return;
    const missions = await getActiveMissions(); // Now async
    
    if (!missions || missions.length === 0) {
        container.innerHTML = '<p>No active missions. Check back tomorrow!</p>';
        return;
    }

    let html = missions.map(mission => `
        <div class="mission-card ${mission.isComplete ? 'completed' : ''}">
            <p class="mission-title">${mission.description}</p>
            <p class="mission-reward">+${mission.reward} XP</p>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

async function updatePlayerStats() {
    const user = getCurrentUser();
    if (!user) return;

    const progress = await getProgress(); // Now async
    if (!progress) {
        // Handle case where user doc might not be fully created yet
        document.getElementById('player-name').textContent = `Welcome, Agent!`;
        return;
    }

    const { level, currentXP, nextLevelXP, percentage } = calculateLevelInfo(progress.xp);
    
    document.getElementById('player-name').textContent = `Agent, ${progress.username || 'Welcome Back'}`;
    document.getElementById('player-level').textContent = `LVL ${level}`;
    document.getElementById('xp-progress-text').textContent = `${currentXP.toLocaleString()} / ${nextLevelXP.toLocaleString()} XP`;
    document.getElementById('xp-progress-bar').style.width = `${percentage}%`;
}


function cleanup() {
    if (stellarMap) {
        stellarMap.destroy();
        stellarMap = null;
    }
}

async function init() {
    await updatePlayerStats();
    await displayDailyMissions();
    
    // Defer scene initialization to improve perceived performance
    setTimeout(() => {
        const canvas = document.getElementById('stellar-map-canvas');
        if (canvas && window.THREE) {
            stellarMap = new StellarMap(canvas);
            stellarMap.init();
        }
    }, 100);
}

const observer = new MutationObserver((mutationsList, obs) => {
    for(const mutation of mutationsList) {
        if (mutation.type === 'childList' && !document.querySelector('.mission-control-container')) {
            cleanup();
            obs.disconnect();
            return;
        }
    }
});
observer.observe(document.getElementById('root-container'), { childList: true });

init();