import { initCard, cleanup } from '../../services/threeManager.js';

console.log("Programming Quiz module loaded.");

// Clean up any existing 3D scenes from other pages to prevent memory leaks
cleanup();

document.querySelectorAll('.topic-card').forEach(card => {
    // Initialize the 3D visual for the card
    initCard(card);

    // Keep the existing click functionality
    card.addEventListener('click', () => {
        const language = card.dataset.topic;
        if (language) {
            // Create a more specific prompt for the AI to generate a better quiz
            const fullTopic = `A quiz on intermediate concepts in the ${language} programming language`;
            sessionStorage.setItem('quizTopic', fullTopic);
            window.location.hash = '#loading';
        }
    });
});