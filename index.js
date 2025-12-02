
import { ROUTES, LOCAL_STORAGE_KEYS } from './constants.js';
import * as configService from './services/configService.js';
import { renderSidebar } from './services/sidebarService.js';
import { showFatalError } from './services/errorService.js';
import * as soundService from './services/soundService.js';
import * as learningPathService from './services/learningPathService.js';
import * as historyService from './services/historyService.js';
import * as themeService from './services/themeService.js';
import * as gamificationService from './services/gamificationService.js';
import * as stateService from './services/stateService.js';
import * as firebaseService from './services/firebaseService.js';
import { init as initVoice, toggleListening } from './services/voiceCommandService.js';
import * as authModule from './modules/auth/auth.js';

// --- GLOBAL ERROR TRAP ---
// Catches crashes during startup to prevent "Infinite Spinner"
window.onerror = function(msg, url, line, col, error) {
    const splash = document.getElementById('splash-screen');
    if (splash && !splash.classList.contains('hidden')) {
        // Only override splash if app hasn't started yet
        splash.innerHTML = `
            <div style="color:#ef4444; text-align:center; padding:40px; font-family:sans-serif;">
                <h3 style="margin-bottom:10px;">Startup Error</h3>
                <p style="opacity:0.8; margin-bottom:20px;">${msg}</p>
                <button onclick="window.location.reload()" style="padding:10px 20px; background:#333; color:white; border:none; border-radius:8px; cursor:pointer;">Reload Application</button>
            </div>
        `;
    }
};

const moduleCache = new Map();
let currentModule = null;

async function fetchModule(moduleName) {
    if (moduleCache.has(moduleName)) {
        return moduleCache.get(moduleName);
    }
    try {
        const [html, css, js] = await Promise.all([
            fetch(`./modules/${moduleName}/${moduleName}.html`).then(res => res.text()),
            fetch(`./modules/${moduleName}/${moduleName}.css`).then(res => res.text()),
            import(`./modules/${moduleName}/${moduleName}.js`)
        ]);
        const moduleData = { html, css, js };
        moduleCache.set(moduleName, moduleData);
        return moduleData;
    } catch (error) {
        console.error(`Failed to load module: ${moduleName}`, error);
        throw new Error(`Module ${moduleName} could not be loaded.`);
    }
}

function matchRoute(path) {
    for (const route of ROUTES) {
        const paramNames = [];
        const regexPath = route.path.replace(/:(\w+)/g, (_, paramName) => {
            paramNames.push(paramName);
            return '([^/]+)';
        });
        const regex = new RegExp(`^${regexPath}$`);
        const match = path.match(regex);

        if (match) {
            const params = {};
            paramNames.forEach((name, index) => {
                params[name] = decodeURIComponent(match[index + 1]);
            });
            return { ...route, params };
        }
    }
    return null;
}

async function loadModule(route) {
    const appContainer = document.getElementById('app');
    if (!appContainer) return;

    if (currentModule && currentModule.js.destroy) {
        try {
            currentModule.js.destroy();
        } catch (e) {
            console.error('Error destroying module:', e);
        }
    }

    const renderNewModule = async () => {
        try {
            stateService.setCurrentRoute(route);
            const moduleData = await fetchModule(route.module);
            currentModule = moduleData;

            appContainer.innerHTML = '';
            document.getElementById('app-container')?.classList.toggle('full-bleed-container', !!route.fullBleed);
            
            let styleTag = document.getElementById('module-style');
            if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = 'module-style';
                document.head.appendChild(styleTag);
            }
            styleTag.textContent = moduleData.css;

            appContainer.innerHTML = moduleData.html;

            if (moduleData.js.init) {
                await moduleData.js.init();
            }
            
            stateService.clearNavigationContext();

            document.querySelectorAll('.sidebar-link').forEach(link => {
                link.classList.remove('active');
                const linkPath = link.getAttribute('href')?.slice(1) || '';
                if (route.path.startsWith(linkPath) && (linkPath !== '/' || route.path === '/')) {
                    link.classList.add('active');
                }
            });
            
            document.getElementById('app-container').scrollTop = 0;

            const mainHeading = appContainer.querySelector('h1');
            if (mainHeading) {
                mainHeading.setAttribute('tabindex', '-1');
                mainHeading.focus({ preventScroll: true });
            }

        } catch (error) {
            console.error("Failed to load module:", error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            appContainer.innerHTML = `
                <div class="error-page card">
                    <h2>Error Loading Module</h2>
                    <p>${errorMessage}</p>
                    <a href="#" class="btn">Go Home</a>
                </div>
            `;
        }
    };

    if (document.startViewTransition) {
        const transition = document.startViewTransition(async () => {
             await renderNewModule();
        });
    } else {
        await new Promise(resolve => {
            const handler = (event) => {
                if (event.target === appContainer) {
                    appContainer.removeEventListener('transitionend', handler);
                    resolve();
                }
            };
            appContainer.addEventListener('transitionend', handler);
            appContainer.classList.add('fade-out');
            setTimeout(resolve, 350);
        });
        
        await renderNewModule();
        appContainer.classList.remove('fade-out');
    }
}

function handleRouteChange() {
    const path = window.location.hash.slice(1) || '/';
    const route = matchRoute(path);

    if (route) {
        loadModule(route);
    } else {
        const homeRoute = ROUTES.find(r => r.path === '/');
        if(homeRoute) {
            loadModule(homeRoute);
        }
    }
}

function applyAppSettings(config) {
    themeService.applyTheme(config.theme);
    themeService.applyAnimationSetting(config.animationIntensity);
}

function showWelcomeScreen() {
    const welcomeScreen = document.getElementById('welcome-screen');
    const startBtn = document.getElementById('welcome-get-started-btn');
    if (!welcomeScreen || !startBtn) return;

    welcomeScreen.style.display = 'flex';
    setTimeout(() => {
        welcomeScreen.classList.add('visible');
    }, 10);
    
    startBtn.addEventListener('click', () => {
        localStorage.setItem(LOCAL_STORAGE_KEYS.WELCOME_COMPLETED, 'true');
        welcomeScreen.classList.remove('visible');
        
        welcomeScreen.addEventListener('transitionend', () => {
            welcomeScreen.remove();
        }, { once: true });
        
        setTimeout(() => {
            if (document.body.contains(welcomeScreen)) {
                welcomeScreen.remove();
            }
        }, 500);
    }, { once: true });
}

function showLevelUpModal(level) {
    soundService.playSound('achievement');
    const modal = document.createElement('div');
    modal.className = 'level-up-overlay';
    modal.innerHTML = `
        <div class="level-up-content">
            <div class="level-badge">${level}</div>
            <h2 class="level-up-title">LEVEL UP!</h2>
            <p class="level-up-sub">You've reached Level ${level}</p>
            <button id="level-up-continue" class="btn btn-primary">Continue</button>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('level-up-continue').addEventListener('click', () => {
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 500);
    });
}

async function preloadCriticalModules() {
    const modulesToPreload = ['topic-list', 'game-map', 'game-level', 'quiz-review'];
    
    for (const moduleName of modulesToPreload) {
        try {
            await Promise.all([
                fetch(`./modules/${moduleName}/${moduleName}.html`).then(res => res.text()),
                fetch(`./modules/${moduleName}/${moduleName}.css`).then(res => res.text()),
                import(`./modules/${moduleName}/${moduleName}.js`)
            ]);
        } catch (e) {
            // Ignore errors in background preload
        }
    }
    console.log('All critical modules preloaded.');
}

// Helper to reliably remove splash screen
function removeSplashScreen() {
    const splashScreen = document.getElementById('splash-screen');
    if (!splashScreen || splashScreen.classList.contains('hidden')) return;

    const finalize = () => {
        if (splashScreen.parentNode) {
            splashScreen.parentNode.removeChild(splashScreen);
        }
        const hasBeenWelcomed = localStorage.getItem(LOCAL_STORAGE_KEYS.WELCOME_COMPLETED);
        if (!hasBeenWelcomed) {
            showWelcomeScreen();
        }
        // Defer heavy lifting slightly
        setTimeout(preloadCriticalModules, 200);
    };

    splashScreen.classList.add('hidden');
    
    // Race: transitionend vs setTimeout safety net
    // If browser is backgrounded, transitionend might not fire.
    // Timeout ensures we never get stuck.
    const safetyTimer = setTimeout(finalize, 600);
    
    splashScreen.addEventListener('transitionend', () => {
        clearTimeout(safetyTimer);
        finalize();
    }, { once: true });
}

// --- APP INITIALIZATION ---
function initializeAppContent(user) {
    // 1. Initialize Services
    learningPathService.init();
    historyService.init();
    gamificationService.init();
    stateService.initState();
    setTimeout(initVoice, 2000); 

    // 2. Render App Shell
    const sidebarEl = document.getElementById('sidebar');
    renderSidebar(sidebarEl);
    
    const voiceToggleBtn = document.getElementById('voice-mic-btn');
    if (voiceToggleBtn) {
        voiceToggleBtn.addEventListener('click', () => {
            toggleListening();
            voiceToggleBtn.classList.toggle('active');
        });
    }

    // 3. Setup Listeners
    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('settings-changed', (e) => applyAppSettings(e.detail));
    window.addEventListener('achievement-unlocked', () => soundService.playSound('achievement'));
    window.addEventListener('level-up', (e) => showLevelUpModal(e.detail.level));

    document.body.addEventListener('click', (event) => {
        if (event.target.closest('.btn, .sidebar-link, .topic-button, .option-btn, .flashcard, .topic-card')) {
            soundService.playSound('click');
        }
    });
    
    document.body.addEventListener('mouseover', (event) => {
        const target = event.target;
        if (target.closest('.btn:not(:disabled), .sidebar-link, .topic-card, .level-card:not(.locked), .chapter-card:not(.locked), .flashcard')) {
            soundService.playSound('hover');
        }
    });

    // 4. Start Router
    handleRouteChange();

    // 5. Hide Overlay
    authModule.destroy(); 
    document.getElementById('app-wrapper').style.display = 'flex'; 
    document.getElementById('auth-container').style.display = 'none';

    // 6. Remove Splash
    removeSplashScreen();
}

function showAuthScreen() {
    const splashScreen = document.getElementById('splash-screen');
    // We only remove splash if Auth module is fully rendered, handled internally by Auth if needed,
    // but typically we just fade it out once auth container is visible.
    // For now, let's remove splash immediately when showing auth.
    if (splashScreen) {
        splashScreen.classList.add('hidden');
        setTimeout(() => { if(splashScreen.parentNode) splashScreen.remove(); }, 500);
    }
    
    document.getElementById('app-wrapper').style.display = 'none'; 
    document.getElementById('auth-container').style.display = 'flex';
    authModule.init(); 
}

async function main() {
    try {
        setInterval(() => { fetch('/health').catch(() => {}); }, 5 * 60 * 1000);

        configService.init();
        applyAppSettings(configService.getConfig());
        soundService.init(configService);

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js');
            });
        }

        // --- ROBUST LOADING ---
        // Safety timeout in case Firebase never responds
        const authTimeout = setTimeout(() => {
            console.warn("Auth check timed out. Forcing Auth screen.");
            showAuthScreen();
        }, 5000); // 5 seconds max wait

        firebaseService.onAuthChange((user) => {
            clearTimeout(authTimeout); // Cancel fallback
            if (user) {
                console.log('User authenticated:', user.email);
                initializeAppContent(user);
            } else {
                console.log('No user. Showing Auth screen.');
                showAuthScreen();
            }
        });

    } catch (error) {
        console.error("A critical error occurred during application startup:", error);
        showFatalError(error);
    }
}

main();
