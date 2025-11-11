
// services/overlayService.js

const overlay = document.getElementById('module-overlay');
const moduleCache = new Map();
let currentModule = null;

async function show(moduleConfig, appState) {
    if (!overlay || !appState) {
        console.error("Overlay service called without overlay element or appState.");
        return;
    }

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

        // Create the panel structure
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
            </div>
        `;

        // Add event listener to the back button
        overlay.querySelector('.back-to-galaxy-btn').addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('close-module-view'));
        });

        // Initialize the module's JavaScript, passing the required appState
        if (typeof js.init === 'function') {
            await js.init(appState);
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
    
    // Clear content after animation
    setTimeout(() => {
        overlay.innerHTML = '';
        currentModule = null;
    }, 400);
}

export const overlayService = { show, hide };
