import { LEARNING_PATH_PROGRESS_GUEST } from '../constants.js';

// This would typically come from a CMS or a separate JSON file
const learningPaths = {
    "javascript-basics": {
        id: "javascript-basics",
        name: "JavaScript Fundamentals",
        description: "A guided path to learn the core concepts of JavaScript, from variables to functions.",
        steps: [
            { id: "js-step-1", name: "Variables and Data Types", topic: "JavaScript variables and data types" },
            { id: "js-step-2", name: "Operators and Conditionals", topic: "JavaScript operators and conditional statements" },
            { id: "js-step-3", name: "Loops and Arrays", topic: "JavaScript loops and array methods" },
            { id: "js-step-4", name: "Functions and Scope", topic: "JavaScript functions and scope" }
        ]
    }
};

let progress = {};

function loadProgress() {
    // FIX #6: Prepare for authenticated users by separating guest logic.
    // FIX #7: Wrap localStorage access in try...catch.
    try {
        const storedProgress = localStorage.getItem(LEARNING_PATH_PROGRESS_GUEST);
        if (storedProgress) {
            progress = JSON.parse(storedProgress);
        } else {
            progress = {};
        }
    } catch (error) {
        console.warn("Could not access localStorage for learning paths.", error);
        progress = {};
    }
}

function saveProgress() {
    try {
        localStorage.setItem(LEARNING_PATH_PROGRESS_GUEST, JSON.stringify(progress));
    } catch (error) {
        console.warn("Could not save learning path progress to localStorage.", error);
    }
}

export function getLearningPath(pathId) {
    return learningPaths[pathId] || null;
}

export function getProgressForPath(pathId) {
    return progress[pathId] || { completedSteps: [] };
}

export function markStepComplete(pathId, stepId) {
    if (!progress[pathId]) {
        progress[pathId] = { completedSteps: [] };
    }
    if (!progress[pathId].completedSteps.includes(stepId)) {
        progress[pathId].completedSteps.push(stepId);
        saveProgress();
    }
}

// Initialize progress on load
loadProgress();
