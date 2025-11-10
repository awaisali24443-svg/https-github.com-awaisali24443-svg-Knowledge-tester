import { GUEST_PATHS_KEY } from "../constants.js";

// This would typically come from a CMS or API
const learningPaths = [
    {
        id: 'js-fundamentals',
        title: "JavaScript Fundamentals",
        description: "Master the core concepts of JavaScript, from variables to asynchronous programming.",
        steps: [
            { type: 'quiz', title: 'Variables & Data Types', topic: 'JavaScript variables and data types' },
            { type: 'quiz', title: 'Functions & Scope', topic: 'JavaScript functions and scope' },
            { type: 'quiz', title: 'Arrays & Objects', topic: 'JavaScript arrays and objects' },
            { type: 'quiz', title: 'Asynchronous JavaScript', topic: 'JavaScript Promises and async/await' },
            { type: 'milestone', title: 'Congratulations! You are a JS Fundamentals master!' }
        ]
    }
    // Add more paths here
];

function getProgress() {
    // FIX #7: Wrap localStorage access
    try {
        const saved = localStorage.getItem(GUEST_PATHS_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (error) {
        console.warn("Could not access learning path progress from localStorage.", error);
        return {};
    }
}

function saveProgress(progress) {
    // FIX #7: Wrap localStorage access
    try {
        localStorage.setItem(GUEST_PATHS_KEY, JSON.stringify(progress));
    } catch (error) {
        console.warn("Could not save learning path progress to localStorage.", error);
    }
}

export const learningPathService = {
    getPaths() {
        return learningPaths;
    },

    getPathById(id) {
        return learningPaths.find(p => p.id === id);
    },

    getPathProgress(pathId) {
        const allProgress = getProgress();
        return allProgress[pathId] || { currentStep: 0 };
    },

    completeStep(pathId) {
        const allProgress = getProgress();
        if (!allProgress[pathId]) {
            allProgress[pathId] = { currentStep: 0 };
        }
        allProgress[pathId].currentStep++;
        saveProgress(allProgress);
    }
};