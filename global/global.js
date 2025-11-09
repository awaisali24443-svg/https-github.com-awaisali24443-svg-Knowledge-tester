

import { playSound } from '/services/soundService.js';
import { getProgress, calculateLevelInfo } from '/services/progressService.js';
import { onAuthStateChanged, getCurrentUser, logOut } from '/services/authService.js';
import * as quizState from '/services/quizStateService.js';

const rootContainer = document.getElementById('root-container');
const headerContainer = document.getElementById('header-container');
const yearSpan = document.getElementById('year');
let currentUser = null;

// --- Auth State Management ---
onAuthStateChanged(async (user, isNewUser) => {
    currentUser = user;
    await loadHeader(); // Reload header to show correct links
    handleRouteChange(); // Re-evaluate route based on new auth state
    
    // Show welcome modal for brand new users on their first login
    if (isNewUser) {
        showWelcomeModal();
    }
});


// --- UI Effects ---
function initCursorAura() {
    const aura = document.getElementById('cursor-aura');
    if (!aura) return;
    document.addEventListener('mousemove', e => {
        aura.style.transform = `translate(${e.clientX - 15}px, ${e.clientY - 15}px)`;
    });
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}
window.showToast = showToast;

function initGlobalSounds() {
    document.addEventListener('click', (e) => {
        if (e.target.closest('button, a.btn, .feature-card, .topic-card, .theme-option, .nav-link, .quick-action-card, .toggle-switch, .category-sector-card')) {
            playSound('click');
        }
    });
}

function showWelcomeModal() {
    const overlay = document.getElementById('welcome-modal-overlay');
    const closeBtn = document.getElementById('welcome-modal-close-btn');
    if (!overlay || !closeBtn) return;
    
    overlay.classList.remove('hidden');
    
    closeBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
    }, { once: true });
}


function initAccessibility() {
    // This now only applies visual settings, not data
    const settings = JSON.parse(localStorage.getItem('accessibilitySettings') || '{}');
    if (settings.largeText) document.body.classList.add('large-text');
    if (settings.highContrast) document.body.classList.add('high-contrast');
    if (settings.dyslexiaFont) document.body.classList.add('dyslexia-font');
    if (settings.reduceMotion) document.body.classList.add('reduce-motion');
}

// --- Header Stats UI ---
async function updateHeaderStats() {
    if (!currentUser) return; // Don't update if logged out
    const progress = await getProgress(); // Now async
    if (!progress) return; // User might not have progress doc yet
    const { level } = calculateLevelInfo(progress.xp);
    const levelEl = document.getElementById('header-level');
    const streakEl = document.getElementById('header-streak');
    
    if (levelEl) levelEl.textContent = `LVL ${level}`;
    if (streakEl) streakEl.textContent = `🔥 ${progress.streak}`;
}
window.updateHeaderStats = updateHeaderStats;


// --- Confirmation Modal ---
const modalContainer = document.getElementById('modal-container');
const modalTitle = document.getElementById('modal-title');
const modalText = document.getElementById('modal-text');
const modalConfirmBtn = document.getElementById('modal-confirm-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalInputContainer = document.getElementById('modal-input-container');
const modalInput = document.getElementById('modal-input');

function showConfirmationModal({
    title,
    text,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isAlert = false,
    isPrompt = false,
    promptValue = ''
}) {
    return new Promise((resolve) => {
        if (!modalContainer || !modalTitle || !modalText || !modalConfirmBtn || !modalCancelBtn || !modalInputContainer || !modalInput) {
            console.error("Modal elements not found!");
            resolve(isPrompt ? null : false);
            return;
        }

        modalTitle.textContent = title;
        modalText.textContent = text;
        modalConfirmBtn.textContent = confirmText;
        modalCancelBtn.textContent = cancelText;

        if (isAlert) {
            modalCancelBtn.classList.add('hidden');
            modalConfirmBtn.className = 'btn btn-primary';
        } else {
            modalCancelBtn.classList.remove('hidden');
            modalConfirmBtn.className = isPrompt ? 'btn btn-primary' : 'btn btn-danger';
        }

        if (isPrompt) {
            modalInputContainer.classList.remove('hidden');
            modalInput.value = promptValue;
        } else {
            modalInputContainer.classList.add('hidden');
        }

        modalContainer.classList.remove('hidden');

        let confirmHandler, cancelHandler, keydownHandler;

        const cleanup = (value) => {
            modalContainer.classList.add('hidden');
            modalConfirmBtn.removeEventListener('click', confirmHandler);
            modalCancelBtn.removeEventListener('click', cancelHandler);
            document.removeEventListener('keydown', keydownHandler);

            if (isPrompt) {
                resolve(value ? modalInput.value : null);
            } else {
                resolve(value);
            }
        };

        confirmHandler = () => cleanup(true);
        cancelHandler = () => cleanup(false);
        keydownHandler = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmHandler();
            } else if (e.key === 'Escape') {
                cancelHandler();
            }
        };

        modalConfirmBtn.addEventListener('click', confirmHandler);
        modalCancelBtn.addEventListener('click', cancelHandler);
        document.addEventListener('keydown', keydownHandler);

        if (isPrompt) {
            setTimeout(() => modalInput.focus(), 50);
        }
    });
}
window.showConfirmationModal = showConfirmationModal;

// --- Level Up Modal ---
function showLevelUpModal(newLevel) {
    const container = document.getElementById('level-up-container');
    const levelNumber = document.getElementById('level-up-number');
    const continueBtn = document.getElementById('level-up-continue-btn');
    if (!container || !levelNumber || !continueBtn) return;
    
    playSound('complete'); // Play a celebratory sound
    levelNumber.textContent = newLevel;
    container.classList.remove('hidden');

    const closeHandler = () => {
        container.classList.add('hidden');
        continueBtn.removeEventListener('click', closeHandler);
    };

    continueBtn.addEventListener('click', closeHandler);
}
window.showLevelUpModal = showLevelUpModal;

// --- Routing ---
const routes = {
    // Public routes
    '#welcome': { module: 'welcome', auth: false },
    '#login': { module: 'login', auth: false },
    '#signup': { module: 'signup', auth: false },
    // Authenticated routes
    '#home': { module: 'home', auth: true },
    '#challenge-setup': { module: 'challenge-setup', auth: true },
    '#loading': { module: 'loading', auth: true },
    '#quiz': { module: 'quiz', auth: true },
    '#results': { module: 'results', auth: true },
    '#screen': { module: 'screen', auth: true },
    '#settings': { module: 'settings', auth: true },
    '#study': { module: 'study', auth: true },
    '#leaderboard': { module: 'leaderboard', auth: true },
};

let isNavigating = false;

async function loadModule(moduleName, context = {}) {
    if (!rootContainer || isNavigating) return;
    isNavigating = true;

    rootContainer.classList.add('module-exit');
    
    sessionStorage.setItem('moduleContext', JSON.stringify(context));
    
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
        const response = await fetch(`/modules/${moduleName}/${moduleName}.html`);
        if (!response.ok) throw new Error(`Module ${moduleName}.html not found.`);
        
        const html = await response.text();
        rootContainer.innerHTML = html;
        rootContainer.classList.remove('module-exit');
        rootContainer.classList.add('module-enter');

        document.getElementById('module-style')?.remove();
        document.getElementById('module-script')?.remove();

        const style = document.createElement('link');
        style.id = 'module-style';
        style.rel = 'stylesheet';
        style.href = `/modules/${moduleName}/${moduleName}.css`;
        
        style.onload = () => {
             setTimeout(() => {
                rootContainer.classList.remove('module-enter');
                isNavigating = false;
            }, 300);
        };
        style.onerror = () => {
            console.error(`Failed to load stylesheet for ${moduleName}.`);
            rootContainer.classList.remove('module-enter');
            isNavigating = false;
        };
        
        document.head.appendChild(style);

        const script = document.createElement('script');
        script.id = 'module-script';
        script.type = 'module';
        script.src = `/modules/${moduleName}/${moduleName}.js`;
        document.body.appendChild(script);

    } catch (error) {
        console.error('Error loading module:', error);
        rootContainer.innerHTML = `<div class="card" style="text-align:center;"><h2 style="color:var(--color-danger);">Error: Could not load page.</h2><p>${error.message}</p></div>`;
        rootContainer.classList.remove('module-exit', 'module-enter');
        isNavigating = false;
    }
}

function handleRouteChange() {
    let hash = window.location.hash;

    // Handle special #challenge route
    if (hash.startsWith('#challenge=')) {
        if (!currentUser) {
            showToast("You must be logged in to accept a challenge.", "error");
            window.location.hash = '#login';
            return;
        }
        try {
            const encodedData = hash.substring('#challenge='.length);
            const decodedString = atob(encodedData);
            const { context, quiz } = JSON.parse(decodedString);
            quizState.startNewQuizState(quiz, context);
            window.location.hash = '#quiz'; // Redirect to the quiz module
        } catch (error) {
            console.error("Failed to decode challenge link:", error);
            showToast("Invalid challenge link.", "error");
            window.location.hash = '#home';
        }
        return;
    }
    
    // Default route logic
    if (!hash) {
        hash = currentUser ? '#home' : '#welcome';
    }

    const route = routes[hash] || routes[currentUser ? '#home' : '#welcome'];

    // Auth guard
    if (route.auth && !currentUser) {
        window.location.hash = '#welcome';
        return;
    }
    if (!route.auth && currentUser) {
        window.location.hash = '#home';
        return;
    }

    loadModule(route.module);

    // Update active nav link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === hash);
    });
}

async function handleLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;

    logoutBtn.disabled = true;
    const spinner = logoutBtn.querySelector('.spinner');
    const btnContent = logoutBtn.querySelector('.btn-content');
    spinner?.classList.remove('hidden');
    btnContent?.classList.add('hidden');

    try {
        await logOut();
        window.location.hash = '#login';
        showToast('You have been logged out.', 'success');
    } catch (error) {
        showToast(`Logout failed: ${error.message}`, 'error');
        // Re-enable button on failure
        logoutBtn.disabled = false;
        spinner?.classList.add('hidden');
        btnContent?.classList.remove('hidden');
    }
}

async function loadHeader() {
    try {
        const response = await fetch('/global/header.html');
        if (!response.ok) throw new Error('Header template not found.');
        headerContainer.innerHTML = await response.text();
        
        const userNav = document.getElementById('user-nav');
        const guestNav = document.getElementById('guest-nav');
        const userStats = document.querySelector('.header-user-stats');

        if (currentUser) {
            userNav.classList.remove('hidden');
            guestNav.classList.add('hidden');
            userStats.classList.remove('hidden');
            updateHeaderStats();
            document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
        } else {
            userNav.classList.add('hidden');
            guestNav.classList.remove('hidden');
            userStats.classList.add('hidden');
        }
        
        // Init mobile navbar logic
        const hamburger = document.querySelector('.nav-hamburger');
        const navLinksContainer = document.querySelector('.nav-links');
        if (hamburger && navLinksContainer) {
            hamburger.addEventListener('click', () => {
                navLinksContainer.classList.toggle('active');
                hamburger.classList.toggle('active');
            });
            document.querySelectorAll('.nav-link, .nav-action-btn').forEach(link => {
                link.addEventListener('click', () => {
                    navLinksContainer.classList.remove('active');
                    hamburger.classList.remove('active');
                });
            });
        }
    } catch (error) {
        console.error('Error loading header:', error);
        headerContainer.innerHTML = '<p style="color:red; text-align:center;">Error loading header</p>';
    }
}

function startPingSystem() {
    setInterval(() => {
        fetch('/manifest.json').catch(err => console.error('Ping failed:', err));
    }, 4 * 60 * 1000); // Every 4 minutes
}


function init() {
    initCursorAura();
    initGlobalSounds();
    initAccessibility();
    startPingSystem();
    
    window.addEventListener('hashchange', handleRouteChange);
    
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then(
                reg => console.log('SW registered.', reg),
                err => console.log('SW registration failed: ', err)
            );
        });
    }
}

// Wait for firebase auth to be ready before initializing the app
const unsubscribe = onAuthStateChanged(() => {
    init();
    unsubscribe(); // Run init only once
});