// services/overlayService.js
import { ROUTES } from '../constants.js';
import { soundService } from './soundService.js';

const overlay = document.getElementById('module-overlay');
const moduleCache = new Map();
let currentModule = null;
let appStateRef = null;

async function loadModuleContent(moduleConfig) {
    if (!overlay || !appStateRef) return;

    // --- 1. Destroy the old module instance ---
    if (currentModule && currentModule.instance && typeof currentModule.instance.destroy === 'function') {
        currentModule.instance.destroy();
    }

    // --- 2. Fetch new module assets ---
    const path = moduleConfig.module;
    if (!moduleCache.has(path)) {
        const [html, css, js] = await Promise.all([
            fetch(`/modules/${path}/${path}.html`).then(res => res.text()),
            fetch(`/modules/${path}/${path}.css`).then(res => res.text()),
            import(`../modules/${path}/${path}.js`)
        ]);
        moduleCache.set(path, { html, css, js });
    }
    const { html, css, js } = moduleCache.get(path);
    currentModule = { ...moduleConfig, instance: js };

    // --- 3. Animate out old content ---
    const panelHeader = overlay.querySelector('.module-panel-header');
    const panelBody = overlay.querySelector('.module-panel-body');
    panelHeader.style.opacity = 0;
    panelBody.style.opacity = 0;
    await new Promise(resolve => setTimeout(resolve, 200));

    // --- 4. Replace and initialize new content ---
    overlay.querySelector('style').textContent = css;
    panelHeader.querySelector('h2').textContent = moduleConfig.name;
    panelBody.innerHTML = html;
    
    if (typeof js.init === 'function') {
        await js.init(appStateRef);
    }

    // --- 5. Animate in new content ---
    panelHeader.style.opacity = 1;
    panelBody.style.opacity = 1;
}

async function show(moduleConfig, globalAppState) {
    if (!overlay) return;
    
    // Store appState for use in other functions
    if (globalAppState) {
        appStateRef = globalAppState;
    }
    
    // If overlay is already visible, just swap the content
    if (overlay.classList.contains('visible') && currentModule?.module !== moduleConfig.module) {
        soundService.playSound('click');
        await loadModuleContent(moduleConfig);
        return;
    }
    
    // If overlay is hidden, build it from scratch
    try {
        const path = moduleConfig.module;
        if (!moduleCache.has(path)) {
            const [html, css, js] = await Promise.all([
                fetch(`/modules/${path}/${path}.html`).then(res => res.text()),
                fetch(`/modules/${path}/${path}.css`).then(res => res.text()),
                import(`../modules/${path}/${path}.js`)
            ]);
            moduleCache.set(path, { html, css, js });
        }

        const { html, css, js } = moduleCache.get(path);
        currentModule = { ...moduleConfig, instance: js };

        overlay.innerHTML = `
            <div class="module-panel">
                <style>${css}</style>
                <div class="module-panel-header">
                    <h2>${moduleConfig.name}</h2>
                    <button class="back-to-galaxy-btn" aria-label="Back to Galaxy View">&times;</button>
                </div>
                <div class="module-panel-body">
                    ${html}
                </div>
                <div class="module-fab-container">
                    <button class="module-fab" data-module-hash="profile" title="Profile">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>
                    </button>
                    <button class="module-fab" data-module-hash="settings" title="Settings">
                        ${ROUTES.find(r => r.hash === 'settings').icon}
                    </button>
                </div>
            </div>
        `;

        overlay.querySelector('.back-to-galaxy-btn').addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('close-module-view'));
        });
        
        overlay.querySelectorAll('.module-fab').forEach(fab => {
            fab.addEventListener('click', (e) => {
                const moduleHash = e.currentTarget.dataset.moduleHash;
                const nextModuleConfig = ROUTES.find(r => r.hash === moduleHash);
                if (nextModuleConfig) {
                    show(nextModuleConfig);
                }
            });
        });

        if (typeof js.init === 'function') {
            await js.init(appStateRef);
        }

        overlay.classList.add('visible');

    } catch (error) {
        console.error(`Failed to load module into overlay: ${moduleConfig.module}`, error);
        overlay.innerHTML = `<div class="module-panel"><p>Error loading module.</p><button class="back-to-galaxy-btn">&times;</button></div>`;
        overlay.querySelector('.back-to-galaxy-btn').addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('close-module-view'));
        });
        overlay.classList.add('visible');
    }
}

function hide() {
    if (!overlay || !currentModule) return;

    if (currentModule.instance && typeof currentModule.instance.destroy === 'function') {
        currentModule.instance.destroy();
    }
    
    overlay.classList.remove('visible');
    
    setTimeout(() => {
        overlay.innerHTML = '';
        currentModule = null;
        appStateRef = null;
    }, 400);
}

export const overlayService = { show, hide };