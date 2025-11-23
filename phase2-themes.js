/**
 * PHASE 2: VISUAL & THEME REVOLUTION MANAGER
 */

(function() {
    'use strict';

    const CONFIG = {
        ENABLE_PHASE_2: true,
        DEFAULT_THEME: 'dark-cyber',
        STORAGE_KEY: 'kt_phase2_theme'
    };

    if (!CONFIG.ENABLE_PHASE_2) return;

    // Theme Definitions (Data for UI)
    const THEMES = [
        { id: 'dark-cyber', name: 'Dark Cyber', color: '#38bdf8' },
        { id: 'light-cyber', name: 'Light Cyber', color: '#0ea5e9' },
        { id: 'light-solar', name: 'Solar', color: '#f97316' },
        { id: 'dark-bio', name: 'Bioluminescent', color: '#84cc16' },
        { id: 'dark-arcane', name: 'Arcane', color: '#d8b4fe' },
        { id: 'dark-nebula', name: 'Nebula', color: '#818cf8' },
        // Premium
        { id: 'matrix', name: 'Matrix Rain', color: '#00ff41' },
        { id: 'cyberpunk', name: 'Cyberpunk', color: '#fcee0a' },
        { id: 'synthwave', name: 'Synthwave', color: '#ff71ce' },
        { id: 'aurora', name: 'Aurora', color: '#69ffbe' },
        { id: 'obsidian', name: 'Obsidian', color: '#ff5252' },
        { id: 'hacker', name: 'Terminal', color: '#33ff00' },
        { id: 'quantum', name: 'Quantum', color: '#7df9ff' },
        { id: 'neural', name: 'Neural Net', color: '#e94560' },
        { id: 'cloud', name: 'Cloud Sky', color: '#87ceeb' },
        { id: 'eco', name: 'Eco Green', color: '#99d98c' },
        { id: 'spatial', name: 'Spatial VR', color: '#74b9ff' },
        { id: 'biotech', name: 'Biotech', color: '#009688' }
    ];

    function initPhase2() {
        console.log("Phase 2: Visual Revolution Initializing...");
        injectUI();
        loadSavedTheme();
    }

    // --- Core UI Injection ---
    function injectUI() {
        // 1. Orb
        const orb = document.createElement('div');
        orb.id = 'p2-theme-orb';
        orb.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20Z"></path><path d="M12 18C15.3137 18 18 15.3137 18 12C18 8.68629 15.3137 6 12 6C8.68629 6 6 8.68629 6 12C6 15.3137 8.68629 18 12 18Z"></path></svg>`;
        orb.onclick = toggleModal;
        document.body.appendChild(orb);

        // 2. Backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'p2-backdrop';
        backdrop.onclick = toggleModal;
        document.body.appendChild(backdrop);

        // 3. Modal
        const modal = document.createElement('div');
        modal.id = 'p2-theme-modal';
        modal.innerHTML = `
            <div class="p2-modal-header">
                <h2>Select Reality</h2>
                <button class="btn" onclick="document.getElementById('p2-theme-modal').classList.remove('active');document.getElementById('p2-backdrop').classList.remove('active');">Close</button>
            </div>
            <div class="p2-modal-grid"></div>
        `;
        document.body.appendChild(modal);

        // Populate Grid
        const grid = modal.querySelector('.p2-modal-grid');
        THEMES.forEach(theme => {
            const btn = document.createElement('div');
            btn.className = 'p2-theme-btn';
            btn.innerHTML = `
                <div class="p2-theme-preview" style="background: ${theme.color}"></div>
                <span>${theme.name}</span>
            `;
            btn.onclick = () => applyTheme(theme.id);
            grid.appendChild(btn);
        });
    }

    function toggleModal() {
        document.getElementById('p2-theme-modal').classList.toggle('active');
        document.getElementById('p2-backdrop').classList.toggle('active');
    }

    function loadSavedTheme() {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEY) || CONFIG.DEFAULT_THEME;
        applyTheme(saved);
    }

    function applyTheme(themeId) {
        document.body.setAttribute('data-phase2-theme', themeId);
        localStorage.setItem(CONFIG.STORAGE_KEY, themeId);
        initParticles(themeId);
    }

    // --- Particles.js Config Generator ---
    function initParticles(themeId) {
        if (!window.particlesJS) return;

        // Determine particle color based on theme
        let color = '#ffffff';
        let shape = 'circle';
        let number = 80;
        let size = 3;
        let moveSpeed = 6;
        let lineLinked = true;

        const theme = THEMES.find(t => t.id === themeId);
        if (theme) color = theme.color;

        // Custom behaviors per theme
        if (themeId === 'matrix' || themeId === 'hacker') {
            shape = 'edge'; // Square/pixel like
            moveSpeed = 10;
            lineLinked = false; 
            number = 150;
        } else if (themeId === 'snow' || themeId === 'aurora') {
            moveSpeed = 2;
            lineLinked = false;
            size = 5;
        } else if (themeId === 'cyberpunk') {
            number = 50;
            size = 5;
            lineLinked = true;
        }

        particlesJS('particles-js', {
            "particles": {
                "number": { "value": number, "density": { "enable": true, "value_area": 800 } },
                "color": { "value": color },
                "shape": { 
                    "type": shape, 
                    "stroke": { "width": 0, "color": "#000000" }
                },
                "opacity": { 
                    "value": 0.5, 
                    "random": true, 
                    "anim": { "enable": false } 
                },
                "size": { 
                    "value": size, 
                    "random": true 
                },
                "line_linked": { 
                    "enable": lineLinked, 
                    "distance": 150, 
                    "color": color, 
                    "opacity": 0.2, 
                    "width": 1 
                },
                "move": { 
                    "enable": true, 
                    "speed": moveSpeed, 
                    "direction": themeId === 'matrix' ? 'bottom' : 'none', 
                    "random": false, 
                    "straight": false, 
                    "out_mode": "out", 
                    "bounce": false 
                }
            },
            "interactivity": {
                "detect_on": "canvas",
                "events": {
                    "onhover": { "enable": true, "mode": "repulse" },
                    "onclick": { "enable": true, "mode": "push" },
                    "resize": true
                },
                "modes": {
                    "repulse": { "distance": 100, "duration": 0.4 }
                }
            },
            "retina_detect": true
        });
    }

    // Init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPhase2);
    } else {
        initPhase2();
    }

})();