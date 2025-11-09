// services/missionService.js
import { categoryData } from './topicService.js';
import { getCurrentUser } from './authService.js';

const db = firebase.firestore();

const MISSION_TEMPLATES = [
    { type: 'complete_category', description: 'Complete a quiz in the {category} category.', reward: 100 },
    { type: 'score_above', description: 'Get a score of 80% or higher in any quiz.', reward: 75 },
    { type: 'perfect_score', description: 'Get a perfect score in any quiz.', reward: 150 },
];

async function generateNewMissions() {
    const user = getCurrentUser();
    if (!user) return [];

    const allCategories = Object.values(categoryData).map(c => c.categoryTitle);
    const missions = [];

    const shuffledTemplates = [...MISSION_TEMPLATES].sort(() => 0.5 - Math.random());
    
    for (const template of shuffledTemplates) {
        if (missions.length >= 3) break;
        
        let mission = { ...template, id: missions.length, isComplete: false };
        
        if (template.type === 'complete_category') {
            const randomCategory = allCategories[Math.floor(Math.random() * allCategories.length)];
            mission.description = template.description.replace('{category}', randomCategory);
            mission.target = randomCategory;
        }
        missions.push(mission);
    }
    
    const today = new Date().toISOString().split('T')[0];
    const missionState = { date: today, missions: missions };
    
    try {
        const missionsRef = db.collection('users').doc(user.uid).collection('missions').doc('daily');
        await missionsRef.set(missionState);
    } catch(e) { console.error("Could not save missions:", e); }
    
    return missions;
}

export async function getActiveMissions() {
    const user = getCurrentUser();
    if (!user) return [];
    
    try {
        const missionsRef = db.collection('users').doc(user.uid).collection('missions').doc('daily');
        const doc = await missionsRef.get();

        if (doc.exists) {
            const missionState = doc.data();
            const today = new Date().toISOString().split('T')[0];
            if (missionState.date === today) {
                return missionState.missions;
            }
        }
    } catch(e) {
        console.error("Could not load missions:", e);
    }
    return await generateNewMissions();
}

export async function checkAndCompleteMissions(quizContext, score, scorePercentage) {
    const user = getCurrentUser();
    if (!user) return [];

    const missionsRef = db.collection('users').doc(user.uid).collection('missions').doc('daily');
    const doc = await missionsRef.get();
    if (!doc.exists) return [];

    const missionState = doc.data();
    const completedMissions = [];
    let missionsUpdated = false;

    missionState.missions.forEach(mission => {
        if (mission.isComplete) return;

        let wasCompleted = false;
        switch (mission.type) {
            case 'complete_category':
                const topicCategory = Object.values(categoryData).find(cat => 
                    cat.topics.some(t => t.name === quizContext.topicName)
                )?.categoryTitle;

                if (topicCategory === mission.target) wasCompleted = true;
                break;
            case 'score_above':
                if (scorePercentage >= 80) wasCompleted = true;
                break;
            case 'perfect_score':
                if (scorePercentage === 100) wasCompleted = true;
                break;
        }

        if (wasCompleted) {
            mission.isComplete = true;
            completedMissions.push(mission);
            missionsUpdated = true;
            window.showToast(`🚀 Mission Complete: ${mission.description}`, 'success');
        }
    });

    if (missionsUpdated) {
        try {
            await missionsRef.set(missionState);
        } catch(e) { console.error("Could not update missions:", e); }
    }
    
    return completedMissions;
}