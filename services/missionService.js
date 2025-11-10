import { GUEST_MISSIONS_KEY } from '../constants.js';
import { getProgress, saveProgress } from './progressService.js';
import { isGuest } from './authService.js';

const MISSION_TYPES = [
    { id: 'complete_quiz', text: "Complete any quiz", target: 1 },
    { id: 'score_3', text: "Score at least 3 on a quiz", target: 1 },
    { id: 'complete_2_quizzes', text: "Complete 2 different quizzes", target: 2 },
];
const XP_REWARD = 50;

const getTodayDateString = () => new Date().toISOString().split('T')[0];

export async function getMissions() {
    if (!isGuest()) {
        console.warn("Firebase missions are disabled.");
        return { date: getTodayDateString(), missions: [], rewardsClaimed: [] };
    }

    const missionsDataStr = localStorage.getItem(GUEST_MISSIONS_KEY);
    const today = getTodayDateString();

    if (missionsDataStr) {
        const missionsData = JSON.parse(missionsDataStr);
        if (missionsData.date === today) {
            return missionsData;
        }
    }
    
    // If no data or data is old, generate new missions
    return generateNewMissions();
}

function generateNewMissions() {
    // Simple random selection for now
    const newMissions = [...MISSION_TYPES].sort(() => 0.5 - Math.random()).slice(0, 2).map(m => ({ ...m, progress: 0 }));
    const missionsData = {
        date: getTodayDateString(),
        missions: newMissions,
        rewardsClaimed: []
    };
    if (isGuest()) {
        localStorage.setItem(GUEST_MISSIONS_KEY, JSON.stringify(missionsData));
    }
    return missionsData;
}

export async function updateMissionProgress(eventType, data) {
    const missionsData = await getMissions();
    let updated = false;

    missionsData.missions.forEach(mission => {
        if (mission.progress >= mission.target) return;

        if (eventType === 'quiz_completed') {
            if (mission.id === 'complete_quiz' || mission.id === 'complete_2_quizzes') {
                mission.progress++;
                updated = true;
            }
            if (mission.id === 'score_3' && data.score >= 3) {
                mission.progress++;
                updated = true;
            }
        }
    });

    if (updated && isGuest()) {
        localStorage.setItem(GUEST_MISSIONS_KEY, JSON.stringify(missionsData));
    }
}

export async function claimMissionReward(missionId) {
    const missionsData = await getMissions();
    if (missionsData.rewardsClaimed.includes(missionId)) return false;

    const mission = missionsData.missions.find(m => m.id === missionId);
    if (mission && mission.progress >= mission.target) {
        missionsData.rewardsClaimed.push(missionId);
        
        if (isGuest()) {
            localStorage.setItem(GUEST_MISSIONS_KEY, JSON.stringify(missionsData));
            const progress = await getProgress();
            progress.totalXp += XP_REWARD;
            await saveProgress(progress);
        }
        // Firebase logic would go here
        
        return true;
    }
    return false;
}