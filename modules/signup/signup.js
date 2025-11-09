import { signUp } from '../../services/authService.js';
import { initModuleScene, cleanupModuleScene } from '../../services/moduleHelper.js';

let sceneManager;

const signupForm = document.getElementById('signup-form');
const signupBtn = document.getElementById('signup-btn');
const errorMessageDiv = document.getElementById('error-message');

function setLoading(isLoading) {
    const btnText = signupBtn.querySelector('.btn-text');
    const spinner = signupBtn.querySelector('.spinner');
    
    signupBtn.disabled = isLoading;
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

if (signupForm) {
    // Hide error message when user starts typing again
    signupForm.addEventListener('input', () => {
        if (!errorMessageDiv.classList.contains('hidden')) {
            errorMessageDiv.classList.add('hidden');
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setLoading(true);
        errorMessageDiv.classList.add('hidden');

        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (password.length < 8) {
            displayError("Password must be at least 8 characters long.");
            setLoading(false);
            return;
        }

        try {
            await signUp(email, password, username);
            window.showToast('✅ Account created successfully!', 'success');
            // The onAuthStateChanged listener in global.js will handle the redirect
        } catch (error) {
            console.error('Sign up failed:', error);
            let userMessage = 'An unknown error occurred.';
            switch(error.code) {
                case 'auth/email-already-in-use':
                    userMessage = 'This email address is already taken.';
                    break;
                case 'auth/invalid-email':
                    userMessage = 'Please enter a valid email address.';
                    break;
                case 'auth/weak-password':
                    userMessage = 'Password is too weak. Please choose a stronger one.';
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
    if (!document.getElementById('signup-form')) {
        cleanup();
        obs.disconnect();
    }
});
observer.observe(document.getElementById('root-container'), { childList: true, subtree: true });

init();