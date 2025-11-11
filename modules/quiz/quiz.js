import { startQuiz, getCurrentQuestion, answerQuestion, nextQuestion, isLastQuestion } from '../../services/quizStateService.js';

let appStateRef;
let elements;
let hasAnswered = false;

function renderQuestion() {
    const question = getCurrentQuestion();
    if (!question) {
        // Handle case where quiz ends or data is missing
        window.location.hash = '#home'; 
        return;
    }
    
    hasAnswered = false;
    elements.questionText.textContent = question.question;
    elements.optionsContainer.innerHTML = '';

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option;
        button.dataset.index = index;
        elements.optionsContainer.appendChild(button);
    });

    updateProgress();
    
    // Hide explanation and next button
    elements.explanationContainer.style.display = 'none';
    elements.nextButton.style.display = 'none';
}

function handleOptionClick(e) {
    if (hasAnswered || !e.target.classList.contains('option-btn')) return;

    hasAnswered = true;
    const selectedIndex = parseInt(e.target.dataset.index);
    answerQuestion(selectedIndex);

    const question = getCurrentQuestion();
    const isCorrect = selectedIndex === question.correctAnswerIndex;

    // Provide visual feedback
    const optionButtons = elements.optionsContainer.querySelectorAll('.option-btn');
    optionButtons.forEach((btn, index) => {
        if (index === question.correctAnswerIndex) {
            btn.classList.add('correct');
        } else if (index === selectedIndex) {
            btn.classList.add('incorrect');
        }
        btn.disabled = true;
    });

    // FIX #15: Provide screen reader feedback
    elements.srFeedback.textContent = isCorrect ? 'Correct!' : 'Incorrect.';

    // Show explanation
    elements.explanationText.textContent = question.explanation;
    elements.explanationContainer.style.display = 'block';

    // Show next button
    elements.nextButton.textContent = isLastQuestion() ? 'Finish Quiz' : 'Next Question';
    elements.nextButton.style.display = 'inline-flex';
}

function handleNextClick() {
    if (isLastQuestion()) {
        // Navigate to results page
        window.location.hash = '#results';
    } else {
        nextQuestion();
        renderQuestion();
    }
}

function updateProgress() {
    const state = appStateRef.context.quizState;
    const progressPercent = ((state.currentQuestionIndex + 1) / state.questions.length) * 100;
    elements.progressBar.style.width = `${progressPercent}%`;
    elements.progressText.textContent = `Question ${state.currentQuestionIndex + 1} / ${state.questions.length}`;
}

export function init(appState) {
    appStateRef = appState;
    const quizData = appStateRef.context.quizData;

    if (!quizData || !quizData.questions || quizData.questions.length === 0) {
        console.error("Quiz data is missing or invalid. Redirecting home.");
        window.location.hash = '#home';
        return;
    }

    startQuiz(quizData);
    appStateRef.context.quizState = { // For progress update
        questions: quizData.questions,
        currentQuestionIndex: 0
    };

    elements = {
        progressBar: document.getElementById('progress-bar'),
        progressText: document.getElementById('progress-text'),
        questionText: document.getElementById('question-text'),
        optionsContainer: document.getElementById('options-container'),
        explanationContainer: document.getElementById('explanation-container'),
        explanationText: document.getElementById('explanation-text'),
        nextButton: document.getElementById('next-question-btn'),
        srFeedback: document.getElementById('sr-feedback')
    };

    elements.optionsContainer.addEventListener('click', handleOptionClick);
    elements.nextButton.addEventListener('click', handleNextClick);

    renderQuestion();
    console.log("Quiz module initialized.");
}

export function destroy() {
    if (elements) {
        elements.optionsContainer.removeEventListener('click', handleOptionClick);
        elements.nextButton.removeEventListener('click', handleNextClick);
    }
    console.log("Quiz module destroyed.");
}
