import { categoryData } from '../../services/topicService.js';
import { NUM_QUESTIONS } from '../../constants.js';
import { playSound } from '../../services/soundService.js';
import { startQuizFlow } from '../../services/navigationService.js';
import { getProgress } from '../../services/progressService.js';
import { SceneManager } from '../../services/threeManager.js';

let cardListeners = [];
let sceneManager;

function animateFeatureCards() {
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, index) => {
        card.style.animation = `popIn 0.5s ease-out ${index * 0.1}s forwards`;
        card.style.opacity = '0';
    });
}

function apply3DTiltEffect(card) {
    const handleMouseMove = (e) => {
        const { left, top, width, height } = card.getBoundingClientRect();
        const x = e.clientX - left;
        const y = e.clientY - top;

        const rotateX = -1 * ((height / 2 - y) / (height / 2)) * 8; // Max rotation 8 degrees
        const rotateY = ((width / 2 - x) / (width / 2)) * 8;

        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
    };

    const handleMouseLeave = () => {
        card.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);
    
    cardListeners.push({ element: card, move: handleMouseMove, leave: handleMouseLeave });
}

function cleanupEffects() {
    cardListeners.forEach(({ element, move, leave }) => {
        element.removeEventListener('mousemove', move);
        element.removeEventListener('mouseleave', leave);
    });
    cardListeners = [];
    if (sceneManager) {
        sceneManager.destroy();
        sceneManager = null;
    }
}


async function handleSurpriseMe(e) {
    e.preventDefault();
    playSound('start');

    // Flatten all topics from all categories into a single array
    const allTopics = Object.values(categoryData).flatMap(category => category.topics);
    const randomTopic = allTopics[Math.floor(Math.random() * allTopics.length)];
    const topicName = randomTopic.name;

    const prompt = `Generate a quiz with ${NUM_QUESTIONS} multiple-choice questions about "${topicName}". The difficulty should be Medium.`;
    
    const quizContext = {
        topicName: topicName,
        isLeveled: false,
        prompt: prompt,
        returnHash: '#home'
    };
    
    await startQuizFlow(quizContext, prompt);
}

function personalizeDashboard() {
    const profile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const { stats } = getProgress();
    const subtitleEl = document.querySelector('.main-home-subtitle');
    
    if (subtitleEl) {
        let greeting = `Ready to test your knowledge, ${profile.name || 'friend'}?`;
        if (stats.streak > 0) {
            greeting += ` You're on a ${stats.streak}-day streak, keep it up!`;
        }
        subtitleEl.textContent = greeting;
    }
}

function init() {
    console.log("Home module (Dashboard) loaded.");
    
    document.querySelectorAll('.feature-card').forEach(apply3DTiltEffect);
    
    const surpriseMeCard = document.getElementById('surprise-me-card');
    if (surpriseMeCard) {
        surpriseMeCard.addEventListener('click', handleSurpriseMe);
    }
    
    animateFeatureCards();
    personalizeDashboard();

    const canvas = document.querySelector('.background-canvas');
    if (canvas && window.THREE) {
        sceneManager = new SceneManager(canvas);
        sceneManager.init('abstractHub');
    }
}

window.addEventListener('hashchange', () => {
    if (window.location.hash !== '#home') {
        cleanupEffects();
    }
}, { once: true });


init();