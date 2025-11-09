import { logIn } from '../../services/authService.js';
import { initModuleScene, cleanupModuleScene } from '../../services/moduleHelper.js';

let sceneManager;

const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const errorMessageDiv = document.getElementById('error-message');

function setLoading(isLoading) {
    const btnText = loginBtn.querySelector('.btn-text');
    const spinner = loginBtn.querySelector('.spinner');
    
    loginBtn.disabled = isLoading;
    if (isLoading) {
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
    } else {
        btnText.classList.remove('hidden');
        spinner.classList.add('hidden');
    }
}

function displayError(message) {
    errorMessageDiv.textContent = message;
    errorMessageDiv.classList.remove('hidden');
}

if (loginForm) {
    // Hide error message when user starts typing again
    loginForm.addEventListener('input', () => {
        if (!errorMessageDiv.classList.contains('hidden')) {
            errorMessageDiv.classList.add('hidden');
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading(true);
        errorMessageDiv.classList.add('hidden');

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            await logIn(email, password);
            // The onAuthStateChanged listener in global.js will handle the redirect
            window.showToast('✅ Login successful!', 'success');
            // No need to redirect here, global listener handles it.
        } catch (error) {
            console.error('Login failed:', error);
            let userMessage = 'An unknown error occurred.';
            switch(error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    userMessage = 'Invalid email or password.';
                    break;
                case 'auth/invalid-email':
                    userMessage = 'Please enter a valid email address.';
                    break;
            }
            displayError(userMessage);
        } finally {
            setLoading(false);
        }
    });
}

function init() {
    sceneManager = initModuleScene('.background-canvas', 'particleGalaxy');
}

function cleanup() {
    sceneManager = cleanupModuleScene(sceneManager);
}

// Use MutationObserver for robust cleanup
const observer = new MutationObserver((mutationsList, obs) => {
    if (!document.getElementById('login-form')) {
        cleanup();
        obs.disconnect();
    }
});
observer.observe(document.getElementById('root-container'), { childList: true, subtree: true });

init();