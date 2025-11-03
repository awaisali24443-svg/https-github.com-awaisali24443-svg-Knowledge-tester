/*
    GLOBAL SCRIPT
    This file handles routing, theme switching, and loading shared components.
*/

const rootContainer = document.getElementById('root-container');
const headerContainer = document.getElementById('header-container');
const yearSpan = document.getElementById('year');

const routes = {
    '': 'welcome', // Default route
    '#welcome': 'welcome',
    '#login': 'login',
    '#home': 'main-home',
    '#quiz': 'main', // AI Quiz Generator module
    '#optional-quiz': 'optional-quiz-generator',
    '#programming-quiz': 'programming-quiz',
    '#historical-knowledge': 'historical-knowledge',
    '#loading': 'loading'
};

async function loadModule(moduleName) {
    if (!rootContainer) return;
    rootContainer.style.opacity = '0';
    
    // Wait for fade out
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
        const response = await fetch(`/modules/${moduleName}/${moduleName}.html`);
        if (!response.ok) throw new Error(`Module ${moduleName}.html not found.`);
        
        const html = await response.text();
        rootContainer.innerHTML = html;

        // Clean up old module-specific assets
        document.getElementById('module-style')?.remove();
        document.getElementById('module-script')?.remove();

        // Add new module assets
        const style = document.createElement('link');
        style.id = 'module-style';
        style.rel = 'stylesheet';
        style.href = `/modules/${moduleName}/${moduleName}.css`;
        
        // Wait for styles to load before showing content to prevent FOUC
        style.onload = () => {
            rootContainer.style.opacity = '1';
        };
        style.onerror = () => {
            console.error(`Failed to load stylesheet for ${moduleName}.`);
            rootContainer.style.opacity = '1'; // Show content anyway
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
        rootContainer.style.opacity = '1';
    }
}

function handleRouteChange() {
    const hash = window.location.hash || '#welcome';
    const moduleName = routes[hash] || 'welcome'; // Fallback
    loadModule(moduleName);
}

// --- Theme Switcher ---
function setTheme(themeName) {
    const themeLink = document.getElementById('theme-link');
    if (themeLink) {
        themeLink.href = `/themes/${themeName}.css`;
        localStorage.setItem('theme', themeName);
    }
}

function setupThemeSwitcher() {
    const changerBtn = document.getElementById('theme-changer-btn');
    const optionsContainer = document.getElementById('theme-options');
    
    if (!changerBtn || !optionsContainer) return;

    const themes = [
        { value: 'google-ai-studio', text: 'AI Studio' },
        { value: 'carbon-mist', text: 'Carbon Mist' },
        { value: 'neon-pulse', text: 'Neon Pulse' },
        { value: 'aurora-dawn', text: 'Aurora Dawn' },
        { value: 'space-alloy', text: 'Space Alloy' },
        { value: 'techno-breeze', text: 'Techno Breeze' },
        { value: 'midnight-glass', text: 'Midnight Glass' },
        { value: 'quantum-fade', text: 'Quantum Fade' },
        { value: 'ocean-core', text: 'Ocean Core' },
        { value: 'cyber-royale', text: 'Cyber Royale' },
        { value: 'digital-ice', text: 'Digital Ice' },
        { value: 'royal-ember', text: 'Royal Ember' },
        { value: 'quantum-edge', text: 'Quantum Edge' },
    ];

    optionsContainer.innerHTML = themes.map(theme => 
        `<div class="theme-option" data-theme="${theme.value}">${theme.text}</div>`
    ).join('');

    changerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        optionsContainer.classList.toggle('hidden');
    });
    
    optionsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.theme-option');
        if (target) {
            const theme = target.dataset.theme;
            setTheme(theme);
            optionsContainer.classList.add('hidden');
        }
    });

    // Close dropdown if clicking outside
    document.addEventListener('click', (e) => {
        if (!optionsContainer.contains(e.target) && !changerBtn.contains(e.target)) {
            optionsContainer.classList.add('hidden');
        }
    });
}

async function loadHeader() {
    try {
        const response = await fetch('/global/header.html');
        if (!response.ok) throw new Error('Header template not found.');
        headerContainer.innerHTML = await response.text();
        
        const savedTheme = localStorage.getItem('theme') || 'carbon-mist';
        setTheme(savedTheme);
        setupThemeSwitcher();

    } catch (error) {
        console.error('Error loading header:', error);
        headerContainer.innerHTML = '<p style="color:red; text-align:center;">Error loading header</p>';
    }
}

function init() {
    loadHeader();
    window.addEventListener('hashchange', handleRouteChange);
    handleRouteChange(); // Initial load
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

init();
