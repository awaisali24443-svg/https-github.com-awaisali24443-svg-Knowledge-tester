export const themes = [
    { id: 'dark-cyber', name: 'Dark Cyber', file: 'theme-dark-cyber.css', colors: ['#00d2ff', '#3a7bd5'] },
    { id: 'neon-pulse', name: 'Neon Pulse', file: 'theme-neon-pulse.css', colors: ['#f472b6', '#818cf8'] },
    { id: 'aurora-flow', name: 'Aurora Flow', file: 'theme-aurora-flow.css', colors: ['#7B2FF7', '#00F5D4'] },
    { id: 'matrix-stream', name: 'Matrix Stream', file: 'theme-matrix-stream.css', colors: ['#39FF14', '#0D0D0D'] },
    { id: 'carbon-mist', name: 'Carbon Mist', file: 'theme-carbon-mist.css', colors: ['#2dd4bf', '#9ca3af'] },
    { id: 'galactic-blue', name: 'Galactic Blue', file: 'theme-galactic-blue.css', colors: ['#7dd3fc', '#1e293b'] },
    { id: 'solar-flare', name: 'Solar Flare', file: 'theme-solar-flare.css', colors: ['#FFD700', '#FF8C00'] },
    { id: 'chrome-noir', name: 'Chrome Noir', file: 'theme-chrome-noir.css', colors: ['#d1d5db', '#111111'] },
    { id: 'luminous-slate', name: 'Luminous Slate', file: 'theme-luminous-slate.css', colors: ['#0ea5e9', '#0d1a2e'] },
    { id: 'code-horizon', name: 'Code Horizon', file: 'theme-code-horizon.css', colors: ['#FF00FF', '#00FFFF'] },
    { id: 'celestial-white', name: 'Celestial White', file: 'theme-celestial-white.css', colors: ['#a78bfa', '#89f7fe'] },
    { id: 'crimson-core', name: 'Crimson Core', file: 'theme-crimson-core.css', colors: ['#DC143C', '#FF4500'] },
    { id: 'cyber-aurora', name: 'Cyber Aurora', file: 'theme-cyber-aurora.css', colors: ['#7B2FF7', '#00F5D4'] },
    { id: 'eclipse-void', name: 'Eclipse Void', file: 'theme-eclipse-void.css', colors: ['#FFD700', '#F0E68C'] },
    { id: 'emerald-circuit', name: 'Emerald Circuit', file: 'theme-emerald-circuit.css', colors: ['#00FF7F', '#00FA9A'] },
    { id: 'neural-frost', name: 'Neural Frost', file: 'theme-neural-frost.css', colors: ['#00BFFF', '#87CEEB'] },
    { id: 'obsidian-matrix', name: 'Obsidian Matrix', file: 'theme-obsidian-matrix.css', colors: ['#39FF14', '#0D0D0D'] },
    { id: 'prism-halo', name: 'Prism Halo', file: 'theme-prism-halo.css', colors: ['#FF00FF', '#00FFFF'] },
    { id: 'quantum-blue', name: 'Quantum Blue', file: 'theme-quantum-blue.css', colors: ['#00f7ff', '#00d2ff'] },
    { id: 'aurora-dawn', name: 'Aurora Dawn', file: 'aurora-dawn.css', colors: ['#f472b6', '#60a5fa'] },
    { id: 'cyber-royale', name: 'Cyber Royale', file: 'cyber-royale.css', colors: ['#facc15', '#d4af37'] },
    { id: 'digital-ice', name: 'Digital Ice', file: 'digital-ice.css', colors: ['#0ea5e9', '#38bdf8'] },
    { id: 'google-ai-studio', name: 'AI Studio', file: 'google-ai-studio.css', colors: ['#8952ff', '#0b57d0'] },
    { id: 'midnight-glass', name: 'Midnight Glass', file: 'midnight-glass.css', colors: ['#60a5fa', '#34d399'] },
    { id: 'ocean-core', name: 'Ocean Core', file: 'ocean-core.css', colors: ['#06b6d4', '#14b8a6'] },
    { id: 'quantum-edge', name: 'Quantum Edge', file: 'quantum-edge.css', colors: ['#00f7ff', '#00f7ff'] },
    { id: 'quantum-fade', name: 'Quantum Fade', file: 'quantum-fade.css', colors: ['#818cf8', '#f472b6'] },
    { id: 'royal-ember', name: 'Royal Ember', file: 'royal-ember.css', colors: ['#f59e0b', '#eab308'] },
    { id: 'space-alloy', name: 'Space Alloy', file: 'space-alloy.css', colors: ['#7dd3fc', '#9ca3af'] },
    { id: 'techno-breeze', name: 'Techno Breeze', file: 'techno-breeze.css', colors: ['#1d4ed8', '#047857'] },
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
    
    const themeFile = selectedTheme.file;
    themeLink.href = `/themes/${themeFile}`;

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
        themeId = 'celestial-white';
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