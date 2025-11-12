// index.js - Main Application Entry Point
// Rewritten from scratch for stability and performance.

import { ROUTES, APP_STATE_KEY } from './constants.js';
import { updateMetaTags } from './services/seoService.js';
import { getAllSettings } from './services/configService.js';
import { createIndex } from './services/searchService.js';
import { soundService } from './services/soundService.js';
import { isFeatureEnabled } from './services/featureService.js';

// --- Global State Manager ---
const appState = {
    _context: {},
    init() {
        try {
            const stored = sessionStorage.getItem(APP_STATE_KEY);
            this._context = stored ? JSON.parse(stored) : {};
        } catch {
            this._context = {};
        }
    },
    get context() {
        return this._context;
    },
    set context(data) {
        this._context = { ...this._context, ...data };
        try {
            sessionStorage.setItem(APP_STATE_KEY, JSON.stringify(this._context));
        } catch (e) {
            console.error("Failed to save app state to session storage", e);
        }
    }
};

// --- Module Cache & State ---
const moduleCache = new Map();
let currentModule = null;

// --- Core Functions ---

/**
 * Hides the splash screen with a guaranteed, CSS-independent animation.
 * This is a critical function to prevent the "stuck on splash screen" bug.
 */
function hideSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (splash && !splash.dataset.hiding) {
        splash.dataset.hiding = 'true';
        splash.style.transition = 'opacity 0.5s ease-out';
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.remove();
        }, 500);
    }
}

/**
 * Renders the sidebar navigation from the ROUTES constant.
 */
async function renderSidebar() {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;

    try {
        const response = await fetch('/global/sidebar.html');
        if (!response.ok) throw new Error('Sidebar template not found');
        const html = await response.text();
        sidebarContainer.innerHTML = html;
        const navLinksContainer = sidebarContainer.querySelector('.nav-links');
        
        const navLinks = ROUTES
            .filter(route => route.inNav && (!route.featureFlag || isFeatureEnabled(route.featureFlag)))
            .map(route => `
                <li>
                    <a href="#${route.hash}" class="nav-link" data-nav-id="${route.hash}">
                        <span class="nav-icon">${route.icon}</span>
                        <span class="nav-text">${route.name}</span>
                    </a>
                </li>
            `).join('');
        
        if (navLinksContainer) {
            navLinksContainer.innerHTML = navLinks;
        }
    } catch (error) {
        console.error("Failed to render sidebar:", error);
        sidebarContainer.innerHTML = '<p style="color:red;padding:1rem;">Error rendering sidebar</p>';
    }
}

/**
 * Matches a URL hash to a route, supporting dynamic parameters like :id.
 * @param {string} hash - The URL hash (e.g., '#topics/science').
 * @returns {object} The matched route configuration and any extracted params.
 */
function matchRoute(hash) {
    const path = hash.substring(1) || 'home';
    const pathParts = path.split('/');

    for (const route of ROUTES) {
        const routeParts = route.hash.split('/');
        if (routeParts.length !== pathParts.length) continue;

        const params = {};
        const isMatch = routeParts.every((part, i) => {
            if (part.startsWith(':')) {
                params[part.substring(1)] = decodeURIComponent(pathParts[i]);
                return true;
            }
            return part === pathParts[i];
        });

        if (isMatch) {
            return { ...route, params };
        }
    }
    return ROUTES.find(r => r.hash === 'home'); // Fallback to home
}

/**
 * The core module loader. Handles cleanup, fetching, rendering, and initialization.
 * @param {object} route - The route configuration object.
 */
async function loadModule(route) {
    const appContainer = document.getElementById('app');
    if (!appContainer) return;

    // 1. Cleanup previous module
    appContainer.classList.add('fade-out');
    if (currentModule?.instance?.destroy) {
        try {
            currentModule.instance.destroy();
        } catch (e) {
            console.error(`Error destroying module ${currentModule.module}:`, e);
        }
    }
    await new Promise(resolve => setTimeout(resolve, 200)); // Wait for fade-out

    // 2. Update navigation and metadata
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.navId === route.hash.split('/')[0]);
    });
    updateMetaTags(route.name, route.params);

    try {
        // 3. Fetch module assets (HTML, CSS, JS) if not cached
        if (!moduleCache.has(route.module)) {
            const [htmlRes, cssRes, js] = await Promise.all([
                fetch(`/modules/${route.module}/${route.module}.html`),
                fetch(`/modules/${route.module}/${route.module}.css`),
                import(`./modules/${route.module}/${route.module}.js`)
            ]);
            const html = await htmlRes.text();
            const css = cssRes.ok ? await cssRes.text() : '';
            moduleCache.set(route.module, { html, css, js });
        }

        const { html, css, js } = moduleCache.get(route.module);
        
        // 4. Render and initialize
        appContainer.innerHTML = `<style>${css}</style>${html}`;
        currentModule = { ...route, instance: js };
        
        if (js.init) {
            await js.init(appState);
        }

    } catch (error) {
        console.error(`Failed to load module ${route.module}:`, error);
        appContainer.innerHTML = `<h2>Error loading ${route.name}</h2><p>Please try refreshing the page.</p>`;
    } finally {
        // 5. Finalize UI
        appContainer.classList.remove('fade-out');
        window.scrollTo(0, 0);
    }
}

/**
 * Handles hash changes to navigate between modules.
 */
function handleRouteChange() {
    const hash = window.location.hash || '#home';
    const route = matchRoute(hash);
    
    // Persist URL params to the global state for modules to access
    if (route.params) {
        appState.context = { params: route.params };
    }
    
    // Feature flag check
    if (route.featureFlag && !isFeatureEnabled(route.featureFlag)) {
        console.warn(`Access to disabled feature "${route.featureFlag}" blocked.`);
        const placeholderRoute = ROUTES.find(r => r.hash === 'placeholder');
        loadModule(placeholderRoute);
        return;
    }
    
    loadModule(route);
}

/**
 * Applies user settings (theme, accessibility) to the body element.
 */
function applyBodySettings() {
    const settings = getAllSettings();
    const body = document.body;
    body.className = ''; // Clear existing accessibility classes
    if (settings.largeText) body.classList.add('large-text');
    if (settings.highContrast) body.classList.add('high-contrast');
    if (settings.dyslexiaFont) body.classList.add('dyslexia-font');
    body.setAttribute('data-theme', settings.theme || 'cyber');
}

/**
 * Main application entry point. Initializes all core systems.
 */
async function main() {
    try {
        // Verify essential DOM elements exist
        const appContainer = document.getElementById('app');
        const sidebarContainer = document.getElementById('sidebar-container');
        if (!appContainer || !sidebarContainer) throw new Error("Core application layout elements (#app, #sidebar-container) are missing.");

        appState.init();
        applyBodySettings();
        
        // Listen for global events
        window.addEventListener('settings-changed', applyBodySettings);
        window.addEventListener('hashchange', handleRouteChange);
        document.body.addEventListener('click', () => soundService.init(), { once: true });
        
        // Initial setup
        await renderSidebar();
        handleRouteChange(); // Load initial route
        createIndex(); // Build search index in the background
        hideSplashScreen();

    } catch (error) {
        console.error("A critical error occurred during application startup:", error);
        hideSplashScreen(); // Ensure splash is hidden even on error
        document.body.innerHTML = `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; text-align:center; padding:2rem; color:#333; background-color:#fff; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <h2 style="color:#d9534f; margin-bottom: 1rem;">Application Error</h2>
                <p>The application failed to start correctly.</p>
                <div style="font-family:monospace,monospace; font-size:0.8rem; color:#555; background:#f0f0f0; padding:1rem; border-radius:4px; margin-top:1rem; text-align:left; max-width:800px; word-wrap:break-word;">
                    <strong>Error:</strong> ${error.message}
                </div>
                <button onclick="window.location.reload()" style="padding:0.8rem 1.5rem; font-size:1rem; color:#fff; background-color:#0275d8; border:none; border-radius:4px; cursor:pointer; margin-top:1.5rem;">
                    Reload Page
                </button>
            </div>
        `;
    }
}

// Start the application only after the entire page (including CSS) is loaded.
// This is the definitive fix for the original splash screen race condition.
window.addEventListener('load', main);
