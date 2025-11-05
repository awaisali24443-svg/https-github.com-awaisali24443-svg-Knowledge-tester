import * as quizState from '../../services/quizStateService.js';
import { playSound } from '../../services/soundService.js';

let quizData = null;
let userAnswers = [];
let currentQuestionIndex = 0;
let quizContext = {};

const quizContainer = document.getElementById('quiz-container');

const motivationalHints = [
    "You’re doing great!", "This next one’s a brain-twister!", "Keep up the awesome work!",
    "One step closer to mastery!", "Let's see how you handle this one.", "Knowledge is power!"
];

const handleKeyPress = (e) => {
    const key = parseInt(e.key, 10);
    if (key >= 1 && key <= 4) {
        const optionButtons = document.querySelectorAll('.quiz-option');
        const targetButton = optionButtons[key - 1];
        if (targetButton && !targetButton.disabled) {
            targetButton.click();
        }
    }
};

async function renderQuiz() {
    if (!quizData || !quizData[currentQuestionIndex]) {
        handleError("Quiz data is missing or invalid. Returning to safety.", true);
        return;
    }

    const question = quizData[currentQuestionIndex];
    const optionsHtml = question.options.map((option, index) => `
        <button data-option-index="${index}" class="quiz-option">
           <span>${index + 1}.</span> ${option}
        </button>
    `).join('');
    
    const hint = currentQuestionIndex > 0 ? motivationalHints[Math.floor(Math.random() * motivationalHints.length)] : '';

    const newContent = document.createElement('div');
    newContent.id = 'quiz-content-wrapper';
    newContent.innerHTML = `
        <div class="progress-bar">
            <div class="progress-bar-inner" style="width: ${((currentQuestionIndex + 1) / quizData.length) * 100}%"></div>
        </div>
        <div class="question-header">
            <span>Question ${currentQuestionIndex + 1} / ${quizData.length}</span>
            <span>${quizContext.topicName || ''} ${quizContext.isLeveled === false ? '' : `- Level ${quizContext.level || ''}`}</span>
        </div>
        <div class="motivational-hint">${hint}</div>
        <h2 class="question-text">${question.question}</h2>
        <div class="options-grid">${optionsHtml}</div>
        <div id="quiz-feedback"></div>
    `;
    
    const oldContent = quizContainer.querySelector('#quiz-content-wrapper');
    if (oldContent) {
        oldContent.classList.add('exiting');
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    quizContainer.innerHTML = '';
    quizContainer.appendChild(newContent);

    document.querySelectorAll('.quiz-option').forEach(button => {
        button.addEventListener('click', handleAnswerSelect);
    });
}

function handleAnswerSelect(e) {
    const selectedButton = e.currentTarget;
    const selectedAnswerIndex = parseInt(selectedButton.dataset.optionIndex, 10);
    userAnswers[currentQuestionIndex] = selectedAnswerIndex;

    const question = quizData[currentQuestionIndex];
    const isCorrect = selectedAnswerIndex === question.correctAnswerIndex;
    playSound(isCorrect ? 'correct' : 'incorrect');

    document.querySelectorAll('.quiz-option').forEach(button => {
        button.disabled = true;
        const index = parseInt(button.dataset.optionIndex, 10);
        if (index === question.correctAnswerIndex) {
            button.classList.add('correct');
        } else if (index === selectedAnswerIndex) {
            button.classList.add('incorrect');
        } else {
            button.classList.add('faded');
        }
    });

    const isLastQuestion = currentQuestionIndex === quizData.length - 1;
    document.getElementById('quiz-feedback').innerHTML = `
        <button id="next-btn" class="btn btn-primary">${isLastQuestion ? 'Finish Quiz' : 'Next Question'}</button>
    `;
    document.getElementById('next-btn').addEventListener('click', handleNext);

    quizState.saveQuizState({ quizData, userAnswers, currentQuestionIndex, quizContext });
}

function handleNext() {
    if (currentQuestionIndex < quizData.length - 1) {
        currentQuestionIndex++;
        renderQuiz();
    } else {
        sessionStorage.setItem('quizResults', JSON.stringify({
            quizData, userAnswers, quizContext
        }));
        quizState.clearQuizState();
        window.location.hash = '#results';
    }
}

function handleError(message, shouldClearState = false) {
    console.error(message);
    window.showToast(message, 'error');
    if (shouldClearState) {
        quizState.clearQuizState();
    }
    window.location.hash = '#home';
}

function init() {
    // **IMPROVEMENT**: Simplified, single entry point. Always load from the robust state service.
    const savedState = quizState.loadQuizState();

    if (savedState) {
        quizData = savedState.quizData;
        userAnswers = savedState.userAnswers;
        currentQuestionIndex = savedState.currentQuestionIndex;
        quizContext = savedState.quizContext;
        renderQuiz();
    } else {
        handleError("No active quiz found. Please select a topic to start.", false);
        return;
    }
    
    document.addEventListener('keydown', handleKeyPress);
}

// Cleanup listener when navigating away
window.addEventListener('hashchange', () => {
    document.removeEventListener('keydown', handleKeyPress);
}, { once: true });

init();