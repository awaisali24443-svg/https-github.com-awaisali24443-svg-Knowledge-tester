import { getSetting } from '../../services/configService.js';
import { threeManager } from '../../services/threeManager.js';
import { isFeatureEnabled } from '../../services/featureService.js';

let is3DInitialized = false;
let homeContainer;

const handleMouseMove = (event) => {
    if (is3DInitialized) {
        // Normalize mouse position to a -1 to 1 range
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = -(event.clientY / window.innerHeight) * 2 + 1;
        threeManager.updateMousePosition(x, y);
    }
};


// Centralized dashboard configuration
const dashboardItems = [
    {
        href: '#custom-quiz',
        icon: '🚀',
        title: 'Custom Quiz',
        description: 'Challenge yourself on any topic. Our AI will generate a unique quiz for you in seconds.',
        size: 'large',
    },
    {
        href: '#explore',
        icon: '🧭',
        title: 'Explore Topics',
        description: 'Browse our library of curated topics and quizzes across various subjects like science, history, and more.',
        size: 'large',
    },
    {
        href: '#library',
        icon: '📚',
        title: 'My Library',
        description: 'Review your saved questions and prepare for tests.',
    },
    {
        href: '#study',
        icon: '🧠',
        title: 'Study Mode',
        description: 'Use flashcards to master your saved questions.',
        feature: 'studyMode'
    },
    {
        href: '#paths',
        icon: '🗺️',
        title: 'Learning Paths',
        description: 'Follow a structured journey to master a new subject.',
        feature: 'learningPaths'
    },
    {
        href: '#settings',
        icon: '⚙️',
        title: 'Settings',
        description: 'Customize your theme, accessibility, and experience.',
    }
];

function renderDashboard() {
    const gridContainer = document.getElementById('dashboard-grid');
    if (!gridContainer) return;

    const cardsHtml = dashboardItems.map(item => {
        const isEnabled = !item.feature || isFeatureEnabled(item.feature);
        
        const isComingSoon = item.feature === 'learningPaths' && !isEnabled;

        if (!isEnabled && !isComingSoon) {
            return '';
        }

        const tag = isComingSoon ? 'div' : 'a';
        const href = isComingSoon ? '' : `href="${item.href}"`;
        const extraClasses = `${item.size === 'large' ? 'large' : ''} ${isComingSoon ? 'coming-soon' : ''}`;

        const largeCardContent = `
            <div class="card-icon">${item.icon}</div>
            <div class="card-content">
                <h3>${item.title}</h3>
                <p>${item.description}</p>
            </div>
        `;
        const smallCardContent = `
            <div class="card-icon">${item.icon}</div>
            <div class="card-content">
                <h3>${item.title}</h3>
                <p>${item.description}</p>
                ${isComingSoon ? `<div class="card-footer"><span class="coming-soon-tag">Coming Soon</span></div>` : ''}
            </div>
        `;

        return `
            <${tag} ${href} class="dashboard-card ${extraClasses}">
                ${item.size === 'large' ? largeCardContent : smallCardContent}
            </${tag}>
        `;
    }).join('');

    gridContainer.innerHTML = cardsHtml;
    
    // Apply staggered animation delay
    const cards = gridContainer.querySelectorAll('.dashboard-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 100}ms`;
    });
}


export function init(appState) {
    console.log("Home module initialized.");
    homeContainer = document.querySelector('.home-container');

    renderDashboard();

    const use3DBackground = getSetting('enable3DBackground');
    const canvas = document.getElementById('bg-canvas');

    if (use3DBackground && homeContainer && canvas) {
        try {
            console.log("Initializing 3D background...");
            threeManager.init(homeContainer);
            canvas.classList.add('visible');
            is3DInitialized = true;
            homeContainer.addEventListener('mousemove', handleMouseMove);
        } catch (error) {
            console.error("Failed to initialize 3D background. Falling back to static.", error);
            if(canvas) canvas.style.display = 'none';
            is3DInitialized = false;
        }
    } else {
        console.log("3D background is disabled or elements not found.");
    }
}

export function destroy() {
    if (homeContainer) {
        homeContainer.removeEventListener('mousemove', handleMouseMove);
    }
    if (is3DInitialized) {
        console.log("Destroying 3D background from Home module.");
        const canvas = document.getElementById('bg-canvas');
        if(canvas) canvas.classList.remove('visible');
        
        threeManager.destroy();
        is3DInitialized = false;
    }
    console.log("Home module destroyed.");
}