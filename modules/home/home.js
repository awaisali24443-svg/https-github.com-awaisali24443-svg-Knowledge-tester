// modules/home/home.js

import { getProgress, calculateLevelInfo } from '../../services/progressService.js';
import { getActiveMissions } from '../../services/missionService.js';
import { generateLearningPath } from '../../services/geminiService.js';
import { saveLearningPath, getActiveLearningPaths } from '../../services/learningPathService.js';
import { getRecentActivities } from '../../services/activityFeedService.js';
import { MODULE_CONTEXT_KEY } from '../../constants.js';

let welcomeMessage, playerLevelBadge, playerXpBar, playerXpText, playerStreakText, missionsList, learningPathForm, generatePathBtn, learningGoalInput, learningPathsList, activityFeedList;

function queryElements() {
    welcomeMessage = document.getElementById('welcome-message');
    playerLevelBadge = document.getElementById('player-level-badge');
    playerXpBar = document.getElementById('player-xp-bar');
    playerXpText = document.getElementById('player-xp-text');
    playerStreakText = document.getElementById('player-streak-text');
    missionsList = document.getElementById('missions-list');
    learningPathForm = document.getElementById('learning-path-form');
    generatePathBtn = document.getElementById('generate-path-btn');
    learningGoalInput = document.getElementById('learning-goal-input');
    learningPathsList = document.getElementById('learning-paths-list');
    activityFeedList = document.getElementById('activity-feed-list');
}

async function renderWelcome() {
    try {
        const progress = await getProgress(true);
        if (!progress || !welcomeMessage) return;

        welcomeMessage.textContent = `Welcome, ${progress.username || 'Agent'}!`;
        
        const { level, progressPercentage, currentLevelXP, xpForNextLevel } = calculateLevelInfo(progress.xp);
        playerLevelBadge.textContent = `LVL ${level}`;
        playerXpBar.style.width = `${progressPercentage}%`;
        playerXpText.textContent = `${currentLevelXP.toLocaleString()} / ${xpForNextLevel.toLocaleString()} XP`;
        playerStreakText.textContent = `🔥 ${progress.streak} Day Streak`;
    } catch (error) {
        console.error("Failed to render welcome stats:", error);
        // Don't show an error for this, just fail gracefully
    }
}

async function renderMissions() {
    if (!missionsList) return;
    try {
        const missions = await getActiveMissions();
        if (missions.length === 0) {
            missionsList.innerHTML = '<div class="mission-placeholder">No new missions today. Check back tomorrow!</div>';
            return;
        }

        missionsList.innerHTML = missions.map(mission => `
            <div class="mission-card ${mission.isComplete ? 'completed' : ''}">
                <div class="mission-info"><p>${mission.description}</p></div>
                <div class="mission-reward">+${mission.reward} XP</div>
            </div>
        `).join('');
    } catch (error) {
        missionsList.innerHTML = '<div class="mission-placeholder" style="color:var(--color-danger);">Could not load missions.</div>';
    }
}

async function renderActivityFeed() {
    if (!activityFeedList) return;
    try {
        const activities = await getRecentActivities();
        if (activities.length === 0) {
            activityFeedList.innerHTML = '<div class="activity-placeholder">No recent activity yet.</div>';
            return;
        }
        activityFeedList.innerHTML = activities.map(act => `
            <div class="activity-item">
                <span class="activity-icon">${act.icon || '🔹'}</span>
                <p class="activity-text"><strong>${act.username}</strong> ${act.text}</p>
            </div>
        `).join('');
    } catch (error) {
        activityFeedList.innerHTML = '<div class="activity-placeholder" style="color:var(--color-danger);">Could not load activity feed.</div>';
    }
}

async function renderLearningPaths() {
    if (!learningPathsList) return;
    try {
        const paths = await getActiveLearningPaths();
        if (paths.length === 0) {
            learningPathsList.innerHTML = '<div class="mission-placeholder">You have no active learning paths.</div>';
            return;
        }

        learningPathsList.innerHTML = paths.map(path => {
            const progress = path.currentStep >= path.steps.length ? 'Complete' : `${path.currentStep}/${path.steps.length} Steps`;
            return `
            <a href="#learning-path" class="learning-path-item" data-path-id="${path.id}">
                <div class="path-item-info">
                    <strong>${path.title}</strong>
                </div>
                <div class="path-item-progress">
                    ${progress}
                </div>
            </a>
        `}).join('');
        
        document.querySelectorAll('.learning-path-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                sessionStorage.setItem(MODULE_CONTEXT_KEY, JSON.stringify({ pathId: item.dataset.pathId }));
                window.location.hash = '#learning-path';
            });
        });
    } catch (error) {
        learningPathsList.innerHTML = '<div class="mission-placeholder" style="color:var(--color-danger);">Could not load learning paths.</div>';
    }
}

function setPlannerLoading(isLoading) {
    if (!generatePathBtn) return;
    const btnText = generatePathBtn.querySelector('.btn-text');
    const spinner = generatePathBtn.querySelector('.spinner');
    generatePathBtn.disabled = isLoading;
    learningGoalInput.disabled = isLoading;
    btnText.classList.toggle('hidden', isLoading);
    spinner.classList.toggle('hidden', !isLoading);
}

async function handleGeneratePath(e) {
    e.preventDefault();
    const goal = learningGoalInput.value.trim();
    if (!goal) return;

    setPlannerLoading(true);
    try {
        const pathData = await generateLearningPath(goal);
        await saveLearningPath(pathData);
        window.showToast("✅ Learning path created successfully!", "success");
        learningGoalInput.value = '';
        await renderLearningPaths(); // Refresh the list
    } catch (error) {
        window.showToast(`❌ ${error.message}`, 'error');
    } finally {
        setPlannerLoading(false);
    }
}

export function init() {
    queryElements();
    renderWelcome();
    renderMissions();
    renderLearningPaths();
    renderActivityFeed();
    learningPathForm?.addEventListener('submit', handleGeneratePath);
}

export function cleanup() {
    learningPathForm?.removeEventListener('submit', handleGeneratePath);
}