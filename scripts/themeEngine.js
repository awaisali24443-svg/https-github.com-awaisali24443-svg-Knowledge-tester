export const themes = [
    { id: 'dark-cyber', name: 'Dark Cyber', colors: ['#00d2ff', '#3a7bd5'] },
    { id: 'neon-pulse', name: 'Neon Pulse', colors: ['#f472b6', '#818cf8'] },
    { id: 'aurora-flow', name: 'Aurora Flow', colors: ['#7B2FF7', '#00F5D4'] },
    { id: 'matrix-stream', name: 'Matrix Stream', colors: ['#39FF14', '#0D0D0D'] },
    { id: 'carbon-mist', name: 'Carbon Mist', colors: ['#e5e7eb', '#374151'] },
    { id: 'galactic-blue', name: 'Galactic Blue', colors: ['#7dd3fc', '#1e293b'] },
    { id: 'quantum-flame', name: 'Quantum Flame', colors: ['#FFD700', '#FF8C00'] },
    { id: 'chrome-noir', name: 'Chrome Noir', colors: ['#d1d5db', '#111111'] },
    { id: 'luminous-slate', name: 'Luminous Slate', colors: ['#0ea5e9', '#0d1a2e'] },
    { id: 'code-horizon', name: 'Code Horizon', colors: ['#FF00FF', '#00FFFF'] },
];

const themeLink = document.getElementById('theme-link');
const body = document.body;

function applyTheme(themeId, fromAI = false) {
    if (!themeLink) {
        console.error("Theme link element with id 'theme-link' not found!");
        return;
    }
    const selectedTheme = themes.find(t => t.id === themeId);
    if (!selectedTheme) {
        console.warn(`Theme "${themeId}" not found. Applying default.`);
        themeId = 'dark-cyber'; // Fallback to a default
    }

    body.classList.add('theme-transitioning');
    
    themeLink.href = `/themes/theme-${themeId}.css`;

    localStorage.setItem('selected-theme', themeId);
    
    if (window.showToast) {
        const message = fromAI 
            ? `🎨 AI suggests ${selectedTheme.name} for this time of day!`
            : `🎨 Switched to ${selectedTheme.name}`;
        window.showToast(message);
    }


    themeLink.onload = () => {
        setTimeout(() => {
            body.classList.remove('theme-transitioning');
        }, 50);
    };
}

function aiSuggestTheme() {
    const hour = new Date().getHours();
    let themeId = 'aurora-flow'; // Default (evening)

    if (hour >= 5 && hour < 12) { // Morning
        themeId = 'luminous-slate';
    } else if (hour >= 18 || hour < 5) { // Night
        themeId = 'neon-pulse';
    }
    
    applyTheme(themeId, true);
    return themeId;
}

function initTheme() {
    const savedTheme = localStorage.getItem('selected-theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        applyTheme('dark-cyber'); // Set default theme
    }
}

export { applyTheme, initTheme, aiSuggestTheme };