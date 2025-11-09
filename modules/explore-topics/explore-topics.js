import { SceneManager } from '../../services/threeManager.js';
let sceneManager;

console.log("Explore Topics module loaded.");

function init() {
    const canvas = document.querySelector('.background-canvas');
    if (canvas && window.THREE) {
        sceneManager = new SceneManager(canvas);
        sceneManager.init('atomicStructure');
    }
}

window.addEventListener('hashchange', () => {
    if (sceneManager) {
        sceneManager.destroy();
        sceneManager = null;
    }
}, { once: true });


init();