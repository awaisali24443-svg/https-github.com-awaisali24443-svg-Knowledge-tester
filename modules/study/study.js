import { generateStudyGuideStream, generateFlashcardsFromGuide } from '../../services/geminiService.js';
import { startQuizFlow } from '../../services/navigationService.js';
import { initModuleScene, cleanupModuleScene } from '../../services/moduleHelper.js';
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

let sceneManager;
let quizContext = null;
let currentGuideContent = '';
let flashcards = [];
let currentFlashcardIndex = 0;

// DOM Elements
const topicTitleEl = document.getElementById('study-topic-title');
const contentEl = document.getElementById('study-content');
const startQuizBtn = document.getElementById('start-quiz-btn');
const backBtn = document.getElementById('back-btn');

// Study Tools Elements
const studyToolsSection = document.getElementById('study-tools-section');
const genFlashcardsBtn = document.getElementById('generate-flashcards-btn');

// Flashcard Modal Elements
const flashcardModal = document.getElementById('flashcard-modal-overlay');
const flashcardFlipper = document.getElementById('flashcard-flipper');
const flashcardFront = document.getElementById('flashcard-front');
const flashcardBack = document.getElementById('flashcard-back');
const flashcardCounter = document.getElementById('flashcard-counter');
const flashcardPrevBtn = document.getElementById('flashcard-prev-btn');
const flashcardNextBtn = document.getElementById('flashcard-next-btn');
const flashcardCloseBtn = document.getElementById('flashcard-close-btn');

async function streamStudyGuide() {
    contentEl.innerHTML = ''; // Clear placeholder
    
    try {
        const stream = await generateStudyGuideStream(quizContext.prompt);
        let accumulatedText = '';
        for await (const chunk of stream) {
            accumulatedText += chunk;
            contentEl.innerHTML = marked.parse(accumulatedText);
        }
        currentGuideContent = accumulatedText; // Store final content
        startQuizBtn.disabled = false;
        studyToolsSection.classList.remove('hidden'); // Show study tools
    } catch (error) {
        console.error("Error streaming study guide:", error);
        contentEl.innerHTML = `<p style="color:var(--color-danger)">Failed to generate study guide. Please try again.</p>`;
    }
}

function handleStartQuiz() {
    if (quizContext) {
        startQuizFlow(quizContext);
    }
}

async function handleGenerateFlashcards() {
    genFlashcardsBtn.classList.add('loading');
    genFlashcardsBtn.disabled = true;

    try {
        const flashcardData = await generateFlashcardsFromGuide(currentGuideContent);
        flashcards = flashcardData;
        if (flashcards && flashcards.length > 0) {
            currentFlashcardIndex = 0;
            showFlashcardModal();
        } else {
            window.showToast("Could not generate flashcards from this guide.", "error");
        }
    } catch (error) {
        console.error("Error generating flashcards:", error);
        window.showToast("An error occurred while creating flashcards.", "error");
    } finally {
        genFlashcardsBtn.classList.remove('loading');
        genFlashcardsBtn.disabled = false;
    }
}

function showFlashcardModal() {
    renderCurrentFlashcard();
    flashcardModal.classList.remove('hidden');
}

function hideFlashcardModal() {
    flashcardModal.classList.add('hidden');
    flashcardFlipper.classList.remove('flipped');
}

function renderCurrentFlashcard() {
    const card = flashcards[currentFlashcardIndex];
    flashcardFront.textContent = card.term;
    flashcardBack.textContent = card.definition;
    flashcardFlipper.classList.remove('flipped');
    
    flashcardCounter.textContent = `${currentFlashcardIndex + 1} / ${flashcards.length}`;
    flashcardPrevBtn.disabled = currentFlashcardIndex === 0;
    flashcardNextBtn.disabled = currentFlashcardIndex === flashcards.length - 1;
}

function flipCard() {
    flashcardFlipper.classList.toggle('flipped');
}

function nextCard() {
    if (currentFlashcardIndex < flashcards.length - 1) {
        currentFlashcardIndex++;
        renderCurrentFlashcard();
    }
}

function prevCard() {
    if (currentFlashcardIndex > 0) {
        currentFlashcardIndex--;
        renderCurrentFlashcard();
    }
}


function init() {
    const contextString = sessionStorage.getItem('quizContext');
    if (!contextString) {
        window.showToast("No study topic selected.", "error");
        window.location.hash = '#home';
        return;
    }
    quizContext = JSON.parse(contextString);

    topicTitleEl.textContent = `Study Guide: ${quizContext.topicName}`;
    backBtn.href = quizContext.returnHash || '#home';

    streamStudyGuide();

    startQuizBtn.addEventListener('click', handleStartQuiz);
    genFlashcardsBtn.addEventListener('click', handleGenerateFlashcards);

    // Flashcard event listeners
    flashcardCloseBtn.addEventListener('click', hideFlashcardModal);
    flashcardFlipper.addEventListener('click', flipCard);
    flashcardNextBtn.addEventListener('click', nextCard);
    flashcardPrevBtn.addEventListener('click', prevCard);

    sceneManager = initModuleScene('.background-canvas', 'atomicStructure');
}

function cleanup() {
    sceneManager = cleanupModuleScene(sceneManager);
}

const observer = new MutationObserver((mutationsList, obs) => {
    if (!document.querySelector('.study-container')) {
        cleanup();
        obs.disconnect();
    }
});
observer.observe(document.getElementById('root-container'), { childList: true, subtree: true });

init();