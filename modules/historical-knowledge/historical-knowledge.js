import { initCard, cleanup } from '../../services/threeManager.js';

console.log("Historical Knowledge module loaded.");

// Clean up any existing 3D scenes from other pages
cleanup();

document.querySelectorAll('.topic-card').forEach(card => {
    // Initialize the 3D visual for the card
    initCard(card);

    // Keep the existing click functionality
    card.addEventListener('click', () => {
        const topic = card.dataset.topic;
        if (topic) {
            // Create a more specific prompt for the AI
            const fullTopic = `A quiz on the key events, figures, and concepts of ${topic}`;
            sessionStorage.setItem('quizTopic', fullTopic);
            window.location.hash = '#loading';
        }
    });
});