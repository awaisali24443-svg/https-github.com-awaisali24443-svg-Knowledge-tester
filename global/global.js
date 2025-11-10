// global/global.js

// --- CORE IMPORTS ---
import { ROUTES, MODULE_CONTEXT_KEY } from '../constants.js';
import * as authService from '../services/authService.js';
import * as progressService from '../services/progressService.js';
import { initUIEffects, showToast, showWelcomeModal } from '../services/uiService.js';

// --- STATE ---
let currentModule = null;
let currentUser = null;
let userProgress = null;

// --- HEADER MANAGEMENT ---
async function updateHeaderUI(user, progress) {
    const headerContainer = document.getElementById('header-container');
    const navLinks = document.querySelector('.nav-links');
    const headerUserStats = document.querySelector('.header-user-stats');

    if (!headerContainer || !navLinks || !headerUserStats) return;

    // Default to hidden
    headerContainer.classList.add('hidden');
    headerUserStats.classList.add('hidden');

    let navHtml = '';

    if (user && !user.isGuest) {
        headerContainer.classList.remove('hidden');
        navHtml = `
            <li><a href="#home" class="nav-link" data-route="home"><span class="nav-link-text">Dashboard</span></a></li>
            <li><a href="#progress" class="nav-link" data-route="progress"><span class="nav-link-text">My Progress</span></a></li>
            <li><a href="#library" class="nav-link" data-route="library"><span class="nav-link-text">My Library</span></a></li>
            <li><a href="#leaderboard" class="nav-link" data-route="leaderboard"><span class="nav-link-text">Leaderboard</span></a></li>
            <li><a href="#settings" class="nav-link" data-route="settings"><span class="nav-link-text">Settings</span></a></li>
            <li><button id="logout-btn" class="nav-link"><span class="btn-content">Logout</span></button></li>
        `;
    } else if (user && user.isGuest) {
        headerContainer.classList.remove('hidden');
        navHtml = `
            <li><a href="#home" class="nav-link" data-route="home">Dashboard</a></li>
            <li><a href="#progress" class="nav-link" data-route="progress">My Progress</a></li>
            <li><a href="#library" class="nav-link" data-route="library">My Library</a></li>
            <li><a href="#settings" class="nav-link" data-route="settings">Settings</a></li>
            <li><button id="logout-btn" class="nav-link"><span class="btn-content">Exit Guest Mode</span></button></li>
        `;
    }
    
    navLinks.innerHTML = navHtml;

    if (user) {
        document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
        if (progress) {
            headerUserStats.classList.remove('hidden');
            const totalXp = progress.totalXp || 0;
            const level = progressService.calculateLevel(totalXp).level;
            document.getElementById('header-level').textContent = level;
            document.getElementById('header-streak').textContent = progress.streak || 0;
        }
    }
    
    // Hamburger menu for mobile
    const hamburger = document.querySelector('.nav-hamburger');
    if(hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }
}


async function handleLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;
    const btnContent = logoutBtn.querySelector('.btn-content');
    
    btnContent.innerHTML = `<div class="spinner"></div>`;
    logoutBtn.disabled = true;

    try {
        await authService.logOut();
        // The session state change listener will handle routing.
        showToast('You have successfully signed out.', 'success');
    } catch (error) {
        showToast('Logout failed. Please try again.', 'error');
        btnContent.textContent = authService.isGuest() ? 'Exit Guest Mode' : 'Logout';
    } finally {
        logoutBtn.disabled = false;
    }
}

// --- ROUTING ---
const loadModule = async (moduleName, context = {}) => {
    if (currentModule && currentModule.cleanup) {
        currentModule.cleanup();
    }
    
    sessionStorage.setItem(MODULE_CONTEXT_KEY, JSON.stringify(context));

    const rootContainer = document.getElementById('root-container');
    rootContainer.classList.add('module-exit');

    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
        const response = await fetch(`/modules/${moduleName}/${moduleName}.html`);
        if (!response.ok) throw new Error(`Module HTML not found: ${moduleName}`);
        rootContainer.innerHTML = await response.text();
        
        currentModule = await import(`../modules/${moduleName}/${moduleName}.js`);
        if (currentModule.init) {
            currentModule.init();
        }
    } catch (error) {
        console.error(`Failed to load module ${moduleName}:`, error);
        rootContainer.innerHTML = `<h2>Error loading page</h2><p>Could not load the requested content. Please try again.</p><a href="#home" class="btn">Go Home</a>`;
    } finally {
        rootContainer.classList.remove('module-exit');
        rootContainer.classList.add('module-enter');
        setTimeout(() => rootContainer.classList.remove('module-enter'), 300);
        updateActiveNavLink();
    }
};

const router = async () => {
    const hash = window.location.hash || '#';
    const [path] = hash.slice(1).split('/');
    const cleanPath = path || (currentUser ? 'home' : 'welcome');
    
    const user = currentUser;
    const publicRoutes = ['welcome', 'login', 'signup'];

    if (!user && !publicRoutes.includes(cleanPath)) {
        window.location.hash = '#welcome';
        return;
    }
    
    if (user && publicRoutes.includes(cleanPath)) {
        window.location.hash = '#home';
        return;
    }

    const routeConfig = ROUTES[cleanPath] || ROUTES['home'];
    const [, param] = hash.slice(1).split('/');
    
    await loadModule(routeConfig.module, { ...routeConfig.context, param });
};

function updateActiveNavLink() {
    const hash = window.location.hash || '#home';
    document.querySelectorAll('.nav-link').forEach(link => {
        const route = link.getAttribute('data-route');
        if (route && hash.includes(route)) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// --- INITIALIZATION ---
function applyInitialTheme() {
    const settings = JSON.parse(localStorage.getItem('generalSettings') || '{}');
    const theme = settings.theme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('ServiceWorker registration successful with scope: ', registration.scope))
                .catch(err => console.error('ServiceWorker registration failed: ', err));
        });
    }
}

async function initializeApp() {
    applyInitialTheme();
    registerServiceWorker();
    initUIEffects();

    // Attach the Firebase listener for login/logout events.
    authService.attachFirebaseListener();
    
    authService.onSessionStateChange(async (user) => {
        currentUser = user;
        
        if (user) {
            userProgress = await progressService.getProgress();
            if (!user.isGuest && userProgress && userProgress.isNewUser) {
                showWelcomeModal();
                await progressService.updateUserProfile({ isNewUser: false });
            }
        } else {
            userProgress = null;
        }

        await updateHeaderUI(currentUser, userProgress);
        router();
    });

    window.addEventListener('hashchange', router);
    
    const splash = document.getElementById('splash-screen');
    if (splash) {
        setTimeout(() => {
            splash.classList.add('fade-out');
            document.body.classList.remove('loading-splash');
        }, 4000);
    }
}

// Start the application
initializeApp();