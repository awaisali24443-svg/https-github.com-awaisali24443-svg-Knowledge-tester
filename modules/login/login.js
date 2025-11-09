import { SceneManager } from '../../services/threeManager.js';
let sceneManager;

console.log("Login module loaded.");

const loginBtn = document.getElementById('login-btn');

if (loginBtn) {
    loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            window.showToast('Please fill in both email and password.', 'error');
            return;
        }

        await window.showConfirmationModal({
            title: 'Feature In Development',
            text: 'Login functionality is not yet implemented. You will be logged in as a guest.',
            confirmText: 'Continue',
            isAlert: true
        });

        // Redirect to home after modal confirmation
        window.location.hash = '#home';
    });
}

function init() {
    const canvas = document.querySelector('.background-canvas');
    if (canvas && window.THREE) {
        sceneManager = new SceneManager(canvas);
        sceneManager.init('calmGeometric');
    }
}

window.addEventListener('hashchange', () => {
    if (sceneManager) {
        sceneManager.destroy();
        sceneManager = null;
    }
}, { once: true });

init();