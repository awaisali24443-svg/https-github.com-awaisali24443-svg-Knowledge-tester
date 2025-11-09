import { SceneManager } from '../../services/threeManager.js';

let sceneManager;
console.log("Welcome module loaded.");

function init() {
    const canvas = document.querySelector('.background-canvas');
    if (canvas && window.THREE) {
        sceneManager = new SceneManager(canvas);
        sceneManager.init('particleGalaxy');
    }
}

// Cleanup the animation when the user navigates away from the welcome screen
window.addEventListener('hashchange', () => {
    if (window.location.hash !== '#welcome' && window.location.hash !== '') {
        if (sceneManager) {
            sceneManager.destroy();
            sceneManager = null;
        }
    }
}, { once: true });

init();