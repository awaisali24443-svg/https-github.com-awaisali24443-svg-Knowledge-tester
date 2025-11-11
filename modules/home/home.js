

import { getSetting } from '../../services/configService.js';
import { threeManager } from '../../services/threeManager.js';
import { isFeatureEnabled } from '../../services/featureService.js';
import { getCategories } from '../../services/topicService.js';

let is3DInitialized = false;
let homeContainer;
let appStateRef;
let cardEventListeners = [];

// --- Mouse Handlers for 3D Effects ---

const handleMouseMove = (event) => {
    if (is3DInitialized) {
        // Normalize mouse position to a -1 to 1 range
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = -(event.clientY / window.innerHeight) * 2 + 1;
        threeManager.updateMousePosition(x, y);
    }
};

const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;

    // Update CSS custom properties for the glow effect
    card.style.setProperty('--x', `${x}px`);
    card.style.setProperty('--y', `${y}px`);

    // 3D tilt effect
    const rotateX = (y / height - 0.5) * -20;
    const rotateY = (x / width - 0.5) * 20;

    card.style.transform = `scale(1.03) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
};

const handleCardMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transition = `transform ${getComputedStyle(card).getPropertyValue('--transition-med')} ease-out`;
    card.style.transform = `scale(1) rotateX(0) rotateY(0)`;
};


// --- UI Rendering ---

const dashboardItems = [
    {
        href: '#library',
        icon: '📚',
        title: 'My Library',
        description: 'Review your saved questions and prepare for tests.',
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

const handleHeroFormSubmit = (e) => {
    e.preventDefault();
    const input = document.getElementById('hero-topic-input');
    const topic = input.value.trim();
    if (topic && appStateRef) {
        appStateRef.context = { topic };
        window.location.hash = '#loading';
    } else {
        input.focus();
    }
};

function renderActionCards() {
    const gridContainer = document.getElementById('dashboard-grid');
    if (!gridContainer) return;

    const cardsHtml = dashboardItems.map(item => {
        const isEnabled = !item.feature || isFeatureEnabled(item.feature);
        const isComingSoon = item.feature === 'learningPaths' && !isEnabled;

        if (!isEnabled && !isComingSoon) return '';

        const tag = isComingSoon ? 'div' : 'a';
        const href = isComingSoon ? '' : `href="${item.href}"`;
        const extraClasses = isComingSoon ? 'coming-soon' : '';

        return `
            <${tag} ${href} class="dashboard-card ${extraClasses}">
                 <div class="card-icon">${item.icon}</div>
                 <div class="card-content">
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                    ${isComingSoon ? `<div class="card-footer"><span class="coming-soon-tag">Coming Soon</span></div>` : ''}
                </div>
            </${tag}>
        `;
    }).join('');
    gridContainer.innerHTML = cardsHtml;
}

async function renderTopicCategories() {
    const carouselContainer = document.getElementById('category-carousel-container');
    if (!carouselContainer) return;

    try {
        const categories = await getCategories();
        if (categories.length > 0) {
            const categoriesHtml = categories.map(cat => `
                <a href="#topics/${cat.id}" class="category-card">
                    <div class="category-card-icon">${cat.icon}</div>
                    <h3>${cat.name}</h3>
                    <p>${cat.description}</p>
                    <div class="category-card-footer">Explore →</div>
                </a>
            `).join('');
            carouselContainer.innerHTML = categoriesHtml;
        } else {
            carouselContainer.innerHTML = `<p>No curated topics available right now.</p>`;
        }
    } catch (error) {
        console.error("Could not load topic categories for home screen", error);
        carouselContainer.innerHTML = '<p>Error loading topics. Please try refreshing the page.</p>';
    }
}

// --- Module Lifecycle ---

export async function init(appState) {
    console.log("Home module initialized.");
    appStateRef = appState;
    homeContainer = document.querySelector('.home-container');
    
    const heroForm = document.getElementById('hero-quiz-form');
    if (heroForm) {
        heroForm.addEventListener('submit', handleHeroFormSubmit);
    }
    
    renderActionCards();
    await renderTopicCategories();
    
    const allCards = document.querySelectorAll('.dashboard-card');
    allCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 100}ms`;
        if (!card.classList.contains('coming-soon')) {
            card.addEventListener('mousemove', handleCardMouseMove);
            card.addEventListener('mouseleave', handleCardMouseLeave);
            cardEventListeners.push({ element: card, type: 'mousemove', handler: handleCardMouseMove });
            cardEventListeners.push({ element: card, type: 'mouseleave', handler: handleCardMouseLeave });
        }
    });

    const use3DBackground = getSetting('enable3DBackground');
    const canvas = document.getElementById('bg-canvas');

    if (use3DBackground && homeContainer && canvas) {
        try {
            threeManager.init(homeContainer);
            canvas.classList.add('visible');
            is3DInitialized = true;
            homeContainer.addEventListener('mousemove', handleMouseMove);
        } catch (error) {
            console.error("Failed to initialize 3D background. Falling back to static.", error);
            if(canvas) canvas.style.display = 'none';
            is3DInitialized = false;
        }
    }
}

export function destroy() {
    if (homeContainer) {
        homeContainer.removeEventListener('mousemove', handleMouseMove);
    }
    const heroForm = document.getElementById('hero-quiz-form');
    if (heroForm) {
        heroForm.removeEventListener('submit', handleHeroFormSubmit);
    }
    
    cardEventListeners.forEach(listener => {
        listener.element.removeEventListener(listener.type, listener.handler);
    });
    cardEventListeners = [];

    if (is3DInitialized) {
        const canvas = document.getElementById('bg-canvas');
        if(canvas) canvas.classList.remove('visible');
        
        threeManager.destroy();
        is3DInitialized = false;
    }
    appStateRef = null;
    console.log("Home module destroyed.");
}