import { initModuleScene, cleanupModuleScene } from '../../services/moduleHelper.js';

let sceneManager;

export function init() {
    sceneManager = initModuleScene('.background-canvas', 'particleGalaxy');
    // All form logic has been removed as this page is now a placeholder.
}

export function cleanup() {
    sceneManager = cleanupModuleScene(sceneManager);
}