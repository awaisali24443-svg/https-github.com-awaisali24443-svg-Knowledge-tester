import { isFeatureEnabled } from '../../services/featureService.js';
import { threeManager } from '../../services/threeManager.js';
import { getSetting } from '../../services/configService.js';

let appStateRef;
let mouseMoveHandler;

const handleHubFormSubmit = (e) => {
    e.preventDefault();
    const input = document.getElementById('hub-topic-input');
    const topic = input.value.trim();
    if (topic && appStateRef) {
        appStateRef.context = { topic };
        window.location.hash = '#loading';
    } else {
        input.focus();
    }
};

function setupWidgets() {
    const pathsWidget = document.getElementById('hub-paths-widget');
    if (pathsWidget && isFeatureEnabled('learningPaths')) {
        pathsWidget.style.display = 'flex';
    }
}

// --- Module Lifecycle ---

export async function init(appState) {
    console.log("Home module initialized.");
    appStateRef = appState;
    
    const hubForm = document.getElementById('hub-quiz-form');
    if (hubForm) {
        hubForm.addEventListener('submit', handleHubFormSubmit);
    }
    
    setupWidgets();

    // Initialize 3D background if enabled
    if (getSetting('enable3DBackground')) {
        const container = document.querySelector('.home-container');
        if (container) {
            threeManager.init(container);
            mouseMoveHandler = (event) => {
                const x = (event.clientX / window.innerWidth) * 2 - 1;
                const y = -(event.clientY / window.innerHeight) * 2 + 1;
                threeManager.updateMousePosition(x, y);
            };
            window.addEventListener('mousemove', mouseMoveHandler);
        }
    }
}

export function destroy() {
    const hubForm = document.getElementById('hub-quiz-form');
    if (hubForm) {
        hubForm.removeEventListener('submit', handleHubFormSubmit);
    }

    // Clean up 3D background
    if (getSetting('enable3DBackground')) {
        threeManager.destroy();
        if (mouseMoveHandler) {
            window.removeEventListener('mousemove', mouseMoveHandler);
        }
    }

    appStateRef = null;
    console.log("Home module destroyed.");
}