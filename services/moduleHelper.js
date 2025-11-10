import { SceneManager } from './threeManager.js';
import { loadThreeJS } from './libraryLoader.js';

/**
 * Initializes a Three.js scene for a module's background canvas.
 * @param {string} canvasSelector - The CSS selector for the canvas element.
 * @param {string} sceneType - The type of scene to create (e.g., 'particleGalaxy').
 * @returns {SceneManager|null} The created scene manager instance or null on failure.
 */
export async function initModuleScene(canvasSelector, sceneType) {
    const canvas = document.querySelector(canvasSelector);
    if (!canvas) {
        console.warn(`Canvas with selector '${canvasSelector}' not found.`);
        return null;
    }
    
    try {
        // Await the loader to guarantee THREE.js is ready.
        await loadThreeJS();
        
        const sceneManager = new SceneManager(canvas);
        sceneManager.init(sceneType);
        return sceneManager;
    } catch (error) {
        console.error(`Failed to initialize scene on canvas '${canvasSelector}':`, error);
        // Hide the canvas if its scene fails to load.
        canvas.style.display = 'none'; 
        return null;
    }
}

/**
 * Cleans up and destroys a Three.js scene manager instance.
 * @param {SceneManager|null} sceneManager - The scene manager to destroy.
 * @returns {null} Always returns null to clear the reference.
 */
export function cleanupModuleScene(sceneManager) {
    if (sceneManager) {
        sceneManager.destroy();
    }
    return null;
}
