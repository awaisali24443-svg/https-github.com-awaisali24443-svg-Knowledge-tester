import { getSavedQuestions } from '../../services/libraryService.js';

let deck = [];
let currentIndex = 0;
let elements = {};

function shuffleDeck() {
    // Fisher-Yates shuffle algorithm
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    currentIndex = 0;
    displayCard();
}

function displayCard() {
    if (deck.length === 0) {
        elements.container.style.display = 'none';
        elements.emptyState.style.display = 'block';
        return;
    }
    
    elements.container.style.display = 'block';
    elements.emptyState.style.display = 'none';

    const cardData = deck[currentIndex];
    elements.card.classList.remove('is-flipped');
    
    // Use a short delay to allow flip animation to reset before changing content
    setTimeout(() => {
        elements.question.textContent = cardData.question;
        elements.answer.textContent = cardData.options[cardData.correctAnswerIndex];
        elements.progress.textContent = `${currentIndex + 1} / ${deck.length}`;
    }, 200);
}

function flipCard() {
    elements.card.classList.toggle('is-flipped');
}

function nextCard() {
    currentIndex = (currentIndex + 1) % deck.length;
    displayCard();
}

export function init() {
    elements = {
        container: document.getElementById('study-container'),
        emptyState: document.getElementById('study-empty-state'),
        card: document.getElementById('flashcard'),
        question: document.getElementById('card-question'),
        answer: document.getElementById('card-answer'),
        flipBtn: document.getElementById('flip-btn'),
        nextBtn: document.getElementById('next-btn'),
        shuffleBtn: document.getElementById('shuffle-btn'),
        progress: document.getElementById('card-progress')
    };

    deck = getSavedQuestions();
    currentIndex = 0;

    displayCard();

    elements.flipBtn.addEventListener('click', flipCard);
    elements.card.addEventListener('click', flipCard);
    elements.nextBtn.addEventListener('click', nextCard);
    elements.shuffleBtn.addEventListener('click', shuffleDeck);
}

export function destroy() {
    if (elements.flipBtn) {
        elements.flipBtn.removeEventListener('click', flipCard);
        elements.card.removeEventListener('click', flipCard);
        elements.nextBtn.removeEventListener('click', nextCard);
        elements.shuffleBtn.removeEventListener('click', shuffleDeck);
    }
    elements = {}; // Clear references
    console.log("Study module destroyed.");
}
