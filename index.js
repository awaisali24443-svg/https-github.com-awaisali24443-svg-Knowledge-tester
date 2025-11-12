import { ROUTES, APP_STATE_KEY } from './constants.js';
import { setSetting, getSetting, getAllSettings } from './services/configService.js';
import { endQuiz } from './services/quizStateService.js';
import { updateMetaTags } from './services/seoService.js';
import { createIndex as createSearchIndex } from './services/searchService.js';
import { soundService } from './services/soundService.js';
import { threeManager } from './services/threeManager.js';

const app = document.getElementById('app');
const sidebarContainer = document.getElementById('sidebar-container');
const splashScreen = document.getElementById('splash-screen');

const moduleCache = new Map();

const appState = {
    _context: {},
    get context() {
        return this._context;
    },
    set context(data) {
        const newContext = { ...data, params: data.params || this._context.params };
        this._context = newContext;
        try {
            sessionStorage.setItem(APP_STATE_KEY, JSON.stringify(this._context));
        } catch (error) {
            console.warn("Could not write to sessionStorage.", error);
        }
    },
    setRouteParams(params) {
        this._context.params = params;
        try {
            sessionStorage.setItem(APP_STATE_KEY, JSON.stringify(this._context));
        } catch (error) {
            console.warn("Could not write to sessionStorage.", error);
        }
    }
};

let currentModule = null;

async function loadModule(moduleConfig, params = {}) {
    if (currentModule && currentModule.module === moduleConfig.module) {
        // Avoid reloading the same module, but update params if they change
        if (JSON.stringify(appState.context.params) !== JSON.stringify(params)) {
             appState.setRouteParams(params);
             if (currentModule.instance && typeof currentModule.instance.init === 'function') {
                 await currentModule.instance.init(appState); // Re-initialize with new params
             }
        }
        return;
    }

    // --- Cleanup previous module ---
    if (currentModule) {
        if (currentModule.instance && typeof currentModule.instance.destroy === 'function') {
            if (currentModule.module === 'quiz') {
                endQuiz();
            }
            currentModule.instance.destroy();
        }
        document.querySelector(`link[data-module-id="${currentModule.module}"]`)?.remove();
    }

    app.classList.add('fade-out');
    await new Promise(resolve => setTimeout(resolve, 200));

    currentModule = { ...moduleConfig, instance: null };
    app.innerHTML = '';
    app.parentElement.classList.toggle('galaxy-view', moduleConfig.module === 'home');


    // --- Load new module ---
    try {
        const path = moduleConfig.module;
        if (!moduleCache.has(path)) {
            const [html, css, js] = await Promise.all([
                fetch(`/modules/${path}/${path}.html`).then(res => res.ok ? res.text() : ''),
                fetch(`/modules/${path}/${path}.css`).then(res => res.ok ? res.text() : ''),
                import(`./modules/${path}/${path}.js`)
            ]);
            moduleCache.set(path, { html, css, js });
        }

        const { html, css, js } = moduleCache.get(path);

        const style = document.createElement('style');
        style.textContent = css;
        style.setAttribute('data-module-id', path);
        document.head.appendChild(style);

        app.innerHTML = html;
        currentModule.instance = js;
        
        appState.setRouteParams(params);
        if (typeof js.init === 'function') {
            // Special case for home module initialization to handle splash screen
            if (path === 'home') {
                 const hideSplash = () => {
                    if(splashScreen) splashScreen.classList.add('fade-out');
                 };
                 await js.init(app, appState, hideSplash);
            } else {
                 await js.init(appState);
            }
        }
        
        app.classList.remove('fade-out');

    } catch (error) {
        console.error(`Failed to load module: ${moduleConfig.module}`, error);
        app.innerHTML = `<div class="error-container card"><h2>Error</h2><p>Could not load page. Please try again.</p><a href="#home" class="btn">Go Home</a></div>`;
        app.classList.remove('fade-out');
    }
}

// --- NEW: Robust, RegExp-based Router ---
function findRoute(hash) {
    for (const route of ROUTES) {
        // Convert route hash to a regular expression
        // e.g., 'topics/:categoryId' becomes /^topics\/([^\/]+)$/
        const pattern = new RegExp('^' + route.hash.replace(/:[^\s/]+/g, '([^/]+)') + '$');
        const match = hash.match(pattern);

        if (match) {
            const params = {};
            // Extract param keys from the route hash, e.g., ['categoryId']
            const keys = (route.hash.match(/:[^\s/]+/g) || []).map(key => key.substring(1));
            // Assign matched values to the keys
            keys.forEach((key, index) => {
                params[key] = match[index + 1];
            });
            return { route, params };
        }
    }
    return null;
}

async function handleRouteChange() {
    const hash = window.location.hash.slice(1) || 'home';
    
    // If navigating away from the galaxy, clean it up.
    if (currentModule?.module === 'home' && hash !== 'home') {
        threeManager.destroy();
    }

    const result = findRoute(hash);

    if (result) {
        await loadModule(result.route, result.params);
        updateActiveNavLink(result.route.hash);
        await updateMetaTags(result.route.name, result.params);
    } else {
        console.warn(`No route found for hash: ${hash}`);
        window.location.hash = '#home';
    }
}


function applyBodyClasses() {
    const settings = getAllSettings();
    document.body.classList.toggle('large-text', settings.largeText);
    document.body.classList.toggle('high-contrast', settings.highContrast);
    document.body.classList.toggle('dyslexia-font', settings.dyslexiaFont);
    document.body.setAttribute('data-theme', settings.theme || 'cyber');
}

async function loadSidebar() {
    try {
        const response = await fetch('/global/sidebar.html');
        const sidebarHtml = await response.text();
        sidebarContainer.innerHTML = sidebarHtml;
        populateNavLinks();
    } catch (error) {
        console.error("Failed to load sidebar:", error);
    }
}

function populateNavLinks() {
    const navLinksContainer = sidebarContainer.querySelector('.nav-links');
    if (!navLinksContainer) return;
    navLinksContainer.innerHTML = ROUTES
        .filter(route => route.inNav)
        .map(route => `
            <li>
                <a href="#${route.hash.split('/')[0]}" class="nav-link" data-hash="${route.hash.split('/')[0]}">
                    <span class="nav-icon">${route.icon}</span>
                    <span class="nav-text">${route.name}</span>
                </a>
            </li>
        `)
        .join('');
}

function updateActiveNavLink(currentHash) {
    const hashBase = currentHash.split('/')[0];
    const navLinks = sidebarContainer.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.hash === hashBase);
    });
}

function init() {
    try {
        const storedState = sessionStorage.getItem(APP_STATE_KEY);
        if (storedState) {
            appState._context = JSON.parse(storedState);
        }
    } catch (error) {
        console.warn("Could not parse stored app state.", error);
        sessionStorage.removeItem(APP_STATE_KEY);
    }

    applyBodyClasses();
    window.addEventListener('settings-changed', applyBodyClasses);

    createSearchIndex();
    
    soundService.init();
    
    loadSidebar().then(() => {
        window.addEventListener('hashchange', handleRouteChange);
        handleRouteChange(); // Initial route
    });
    
    // REMOVED: Fixed-timer for splash screen. It's now handled by the threeManager's onReady callback.
}

init();