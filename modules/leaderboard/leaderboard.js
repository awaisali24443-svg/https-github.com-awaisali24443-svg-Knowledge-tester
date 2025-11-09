import { getLeaderboardData } from '../../services/leaderboardService.js';
import { SceneManager } from '../../services/threeManager.js';

let sceneManager;
let countdownInterval;

function startCountdown() {
    const timerEl = document.getElementById('countdown-timer');
    if (!timerEl) return;

    countdownInterval = setInterval(() => {
        const now = new Date();
        const endOfWeek = new Date(now);
        
        // End of Sunday
        endOfWeek.setDate(now.getDate() - now.getDay() + 7);
        endOfWeek.setHours(23, 59, 59, 999);

        const diff = endOfWeek - now;

        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        timerEl.textContent = `${d}d ${h}h ${m}m ${s}s`;
    }, 1000);
}

async function renderLeaderboard() {
    const leaderboardData = await getLeaderboardData();
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    if (leaderboardData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Leaderboard is empty. Be the first!</td></tr>';
        return;
    }

    let html = '';
    leaderboardData.forEach((player, index) => {
        const rank = player.rank || index + 1;
        let rankHtml;
        if (typeof rank === 'number') {
            switch(rank) {
                case 1: rankHtml = `<span class="rank-badge gold">🥇</span>`; break;
                case 2: rankHtml = `<span class="rank-badge silver">🥈</span>`; break;
                case 3: rankHtml = `<span class="rank-badge bronze">🥉</span>`; break;
                default: rankHtml = rank;
            }
        } else {
            rankHtml = rank; // '...'
        }


        html += `
            <tr class="${player.isUser ? 'user-row' : ''}">
                <td class="rank-cell">${rankHtml}</td>
                <td class="player-cell">${player.name}</td>
                <td class="xp-cell">${player.weeklyXP.toLocaleString()} XP</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}


async function init() {
    await renderLeaderboard();
    startCountdown();
    
    const canvas = document.querySelector('.background-canvas');
    if (canvas && window.THREE) {
        sceneManager = new SceneManager(canvas);
        sceneManager.init('calmGeometric');
    }
}

function cleanup() {
    if (countdownInterval) clearInterval(countdownInterval);
    if (sceneManager) {
        sceneManager.destroy();
        sceneManager = null;
    }
}

// Use MutationObserver for robust cleanup
const observer = new MutationObserver((mutationsList, obs) => {
    if (!document.getElementById('leaderboard-body')) {
        cleanup();
        obs.disconnect();
    }
});
observer.observe(document.getElementById('root-container'), { childList: true, subtree: true });

init();