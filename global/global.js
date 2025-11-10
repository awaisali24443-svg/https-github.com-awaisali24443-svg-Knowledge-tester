import { ROUTES, QUIZ_STATE_KEY } from '../constants.js';
import { quizStateService } from '../services/quizStateService.js';

const app = document.getElementById('app');
const headerContainer = document.getElementById('header-container');
const splashScreen = document.getElementById('splash-screen');
let currentModule = null;

// --- STATE MANAGEMENT ---
// FIX #2: Use sessionStorage to persist state across refreshes.
const appState = {
    get context() {
        try {
            const stored = sessionStorage.getItem(QUIZ_STATE_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch (e) {
            return null;
        }
    },
    set context(data) {
        try {
            if (data) {
                sessionStorage.setItem(QUIZ_STATE_KEY, JSON.stringify(data));
            } else {
                sessionStorage.removeItem(QUIZ_STATE_KEY);
            }
        } catch(e) {
            console.error("Failed to set sessionStorage:", e);
        }
    }
};

// --- MODULE LOADER ---
async function loadModule(moduleName, context = {}) {
    console.log(`Loading module: ${moduleName} with context:`, context);
    
    // FIX #3, #9: Cleanup previous module's styles and scripts
    if (currentModule && currentModule.cleanup) {
        currentModule.cleanup();
    }
    
    // FIX #11: Add a loading class to prevent blank screen flash
    app.classList.add('module-loading');

    const modulePath = `../modules/${moduleName}/${moduleName}`;
    const htmlPath = `${modulePath}.html`;
    const cssPath = `${modulePath}.css`;
    const jsPath = `${modulePath}.js`;

    try {
        // 1. Fetch HTML first
        const htmlRes = await fetch(htmlPath);
        if (!htmlRes.ok) throw new Error(`Failed to load HTML for ${moduleName}`);
        const htmlContent = await htmlRes.text();
        
        // Only now, clear the old content and inject the new
        app.innerHTML = htmlContent;

        // 2. Load CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = cssPath;
        cssLink.id = `style-${moduleName}`;
        document.head.appendChild(cssLink);
        
        // 3. Load and execute JS
        const module = await import(jsPath);
        if (module.init) {
            // Use passed context first, then fall back to session/appState
            const initialContext = Object.keys(context).length > 0 ? context : appState.context;
            module.init({ ...appState, context: initialContext });
        }

        // Store cleanup function
        currentModule = {
            name: moduleName,
            cleanup: () => {
                // If leaving the quiz module, explicitly end the quiz state.
                if(currentModule.name === 'quiz') {
                    quizStateService.endQuiz();
                }
                document.getElementById(`style-${moduleName}`)?.remove();
                if (module.destroy) {
                    module.destroy();
                }
            }
        };

    } catch (error) {
        console.error(`Error loading module ${moduleName}:`, error);
        app.innerHTML = `<div class="error-container"><h2>Error</h2><p>Could not load the requested page. Please try again.</p><a href="#home" class="btn">Go Home</a></div>`;
    } finally {
        app.classList.remove('module-loading');
    }
}


// --- ROUTER ---
function handleRouteChange() {
    const hash = window.location.hash || '#home';
    const path = hash.substring(1);
    
    const route = ROUTES[path] || ROUTES['home']; // Fallback to home
    
    loadModule(route.module, route.context || {});
}

// FIX #25: Mobile Navigation Logic
function setupHeaderEvents() {
    const navHamburger = document.querySelector('.nav-hamburger');
    const siteNav = document.querySelector('.site-nav');
    if (navHamburger && siteNav) {
        navHamburger.addEventListener('click', () => {
            siteNav.classList.toggle('nav-open');
        });
    }
}


// --- INITIALIZATION ---
async function init() {
    console.log("Initializing application...");
    
    // FIX #15: Await header load before continuing to prevent race condition.
    try {
        const headerRes = await fetch('/global/header.html');
        headerContainer.innerHTML = await headerRes.text();
        setupHeaderEvents(); // Setup events after header is in the DOM
    } catch (error) {
        console.error("Failed to load header:", error);
    }

    // Set up routing
    window.addEventListener('hashchange', handleRouteChange);
    
    // Initial load
    handleRouteChange();
    
    // Hide splash screen after a delay
    setTimeout(() => {
        splashScreen.classList.add('fade-out');
    }, 2500); // Let logo animation play
}

document.addEventListener('DOMContentLoaded', init);