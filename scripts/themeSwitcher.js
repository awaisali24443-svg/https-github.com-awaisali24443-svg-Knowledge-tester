import { themes, applyTheme, initTheme, aiSuggestTheme } from './themeEngine.js';

function createSwitcher() {
    const switcherHTML = `
        <div id="theme-switcher-container">
            <button id="theme-switcher-toggle" aria-label="Open theme switcher" title="Change Theme">
                🎨
            </button>
            <div id="theme-switcher-panel" class="hidden">
                <h3>Select Theme</h3>
                <div id="theme-options">
                    ${themes.map(theme => `
                        <div class="theme-option" data-theme-id="${theme.id}" title="${theme.name}" role="button" tabindex="0">
                            <div class="theme-preview" style="background: linear-gradient(45deg, ${theme.colors[0]}, ${theme.colors[1]})"></div>
                            <span>${theme.name}</span>
                        </div>
                    `).join('')}
                </div>
                 <button id="ai-suggest-theme-btn" class="btn btn-secondary">AI Suggests ✨</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', switcherHTML);

    const toggleBtn = document.getElementById('theme-switcher-toggle');
    const panel = document.getElementById('theme-switcher-panel');
    const container = document.getElementById('theme-switcher-container');
    const options = document.querySelectorAll('.theme-option');
    const aiSuggestBtn = document.getElementById('ai-suggest-theme-btn');
    const themeLink = document.getElementById('theme-link');
    
    let originalThemeHref = themeLink.href;

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('hidden');
        originalThemeHref = themeLink.href; // Store current theme when opening
    });

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            panel.classList.add('hidden');
        }
    });

    options.forEach(option => {
        const themeId = option.dataset.themeId;
        const theme = themes.find(t => t.id === themeId);
        if (!theme) return;
        
        option.addEventListener('click', () => {
            applyTheme(themeId);
        });

        option.addEventListener('keydown', (e) => {
            if(e.key === 'Enter' || e.key === ' ') {
                applyTheme(themeId);
            }
        });

        // Hover preview
        option.addEventListener('mouseenter', () => {
            if(themeLink) themeLink.href = `/themes/${theme.file}`;
        });
    });

    // Restore original theme on mouseleave if no selection was made
    panel.addEventListener('mouseleave', () => {
        const currentThemeId = localStorage.getItem('selected-theme') || 'dark-cyber';
        const currentTheme = themes.find(t => t.id === currentThemeId) || themes[0];
        if(themeLink) themeLink.href = `/themes/${currentTheme.file}`;
    });

    aiSuggestBtn.addEventListener('click', () => {
        aiSuggestTheme();
    });
}

// Initialize the theme from localStorage, then create the UI
initTheme();
createSwitcher();