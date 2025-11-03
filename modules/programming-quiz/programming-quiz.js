import { initCard, cleanup } from '../../services/threeManager.js';

console.log("Programming Quiz module loaded.");

cleanup();

const topicGrid = document.querySelector('.topic-grid');
const topicCards = document.querySelectorAll('.topic-card');

topicCards.forEach(card => {
    try {
        initCard(card);
    } catch (error) {
        console.error("Failed to initialize 3D card for topic:", card.dataset.topic, error);
        const canvas = card.querySelector('.topic-canvas');
        if (canvas) canvas.style.display = 'none';
    }
});

topicGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.topic-card');
    const difficultyBtn = e.target.closest('.difficulty-btn');

    if (difficultyBtn) {
        // A difficulty button was clicked, so we generate the quiz
        const topic = card.dataset.topic;
        const difficulty = difficultyBtn.dataset.difficulty;
        
        const fullTopic = `Generate an ${difficulty.toLowerCase()} quiz on intermediate concepts in the ${topic} programming language`;
        sessionStorage.setItem('quizTopic', fullTopic);
        window.location.hash = '#loading';
        return; // Stop further processing
    }
    
    // If a card itself was clicked, handle the selection UI
    if (card) {
        if (card.classList.contains('selected')) {
            // If it's already selected, deselect it
            card.classList.remove('selected');
            topicGrid.classList.remove('selection-active');
        } else {
            // Otherwise, select it and deselect others
            topicCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            topicGrid.classList.add('selection-active');
        }
    } else {
        // If the click was on the grid but not on a card, deselect all
        topicCards.forEach(c => c.classList.remove('selected'));
        topicGrid.classList.remove('selection-active');
    }
});