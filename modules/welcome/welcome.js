import { initModuleScene, cleanupModuleScene } from '../../services/moduleHelper.js';

let sceneManager;

function init() {
    sceneManager = initModuleScene('.background-canvas', 'particleGalaxy');
}

function cleanup() {
    sceneManager = cleanupModuleScene(sceneManager);
}

// Cleanup the animation when the user navigates away
const observer = new MutationObserver((mutationsList, obs) => {
    if (!document.querySelector('.welcome-container')) {
        cleanup();
        obs.disconnect();
    }
});
observer.observe(document.getElementById('root-container'), { childList: true, subtree: true });

init();