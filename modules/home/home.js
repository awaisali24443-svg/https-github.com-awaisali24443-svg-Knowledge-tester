import { getSetting } from '../../services/configService.js';
import { threeManager } from '../../services/threeManager.js';

let is3DInitialized = false;

export function init(appState) {
    console.log("Home module initialized.");

    const use3DBackground = getSetting('enable3DBackground');
    const container = document.querySelector('.home-container');
    const canvas = document.getElementById('bg-canvas');

    if (use3DBackground && container && canvas) {
        try {
            console.log("Initializing 3D background...");
            threeManager.init(container);
            canvas.classList.add('visible');
            // FIX #16: Only set flag on full success
            is3DInitialized = true; 
        } catch (error) {
            console.error("Failed to initialize 3D background. Falling back to static.", error);
            if(canvas) canvas.style.display = 'none';
            is3DInitialized = false; // Ensure flag is false on failure
        }
    } else {
        console.log("3D background is disabled or elements not found.");
    }
}

export function destroy() {
    if (is3DInitialized) {
        console.log("Destroying 3D background from Home module.");
        const canvas = document.getElementById('bg-canvas');
        if(canvas) canvas.classList.remove('visible');
        
        threeManager.destroy();
        is3DInitialized = false;
    }
    console.log("Home module destroyed.");
}