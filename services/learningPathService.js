import { GUEST_PATHS_KEY } from '../constants.js';
import { isGuest } from './authService.js';

async function getPaths() {
    if (!isGuest()) {
        console.warn("Firebase learning paths are disabled.");
        return [];
    }
    const pathsStr = localStorage.getItem(GUEST_PATHS_KEY);
    return pathsStr ? JSON.parse(pathsStr) : [];
}

async function savePaths(paths) {
    if (isGuest()) {
        localStorage.setItem(GUEST_PATHS_KEY, JSON.stringify(paths));
    }
}

export async function saveLearningPath(pathData) {
    const paths = await getPaths();
    const newPath = {
        id: `path_${Date.now()}`,
        createdAt: new Date().toISOString(),
        currentStep: 0,
        ...pathData
    };
    paths.push(newPath);
    await savePaths(paths);
    return newPath;
}

export async function getActiveLearningPaths() {
    return await getPaths();
}

export async function getLearningPathById(pathId) {
    const paths = await getPaths();
    return paths.find(p => p.id === pathId);
}

export async function updateLearningPathProgress(pathId, stepIndex) {
    const paths = await getPaths();
    const path = paths.find(p => p.id === pathId);
    if (path && stepIndex >= path.currentStep) {
        path.currentStep = stepIndex + 1;
        await savePaths(paths);
    }
}