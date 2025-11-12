
import { getQuizState, startQuiz, getCurrentQuestion, answerQuestion, nextQuestion, isLastQuestion } from '../../services/quizStateService.js';
import { soundService } from '../../services/soundService.js';

let appStateRef;
let elements;
let hasAnswered = false;

async function proceedToNextStep() {
    soundService.playSound('click');
    if (isLastQuestion()) {
        window.location.hash = '#results';
        return;
    }
    
    // Animate out the current question and options
    elements.questionArea.classList.add('hiding');
    elements.optionsContainer.classList.add('hiding');
    elements.explanationContainer.classList.add('hiding');
    elements.quizFooter.style.display = 'none';

    // Wait for the animation to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // Update state and render the next question
    nextQuestion();
    renderQuestion();
}

function renderQuestion() {
    const question = getCurrentQuestion();
    if (!question) {
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
    
    elements.explanationContainer.style.display = 'none';
    elements.quizFooter.style.display = 'none';
    
    elements.questionArea.classList.remove('hiding');
    elements.optionsContainer.classList.remove('hiding');
}

function handleOptionClick(e) {
    if (hasAnswered || !e.target.classList.contains('option-btn')) return;

    hasAnswered = true;
    const selectedIndex = parseInt(e.target.dataset.index, 10);
    answerQuestion(selectedIndex);

    const question = getCurrentQuestion();
    const isCorrect = selectedIndex === question.correctAnswerIndex;

    soundService.playSound(isCorrect ? 'correct' : 'incorrect');

    const optionButtons = Array.from(elements.optionsContainer.querySelectorAll('.option-btn'));
    optionButtons.forEach(btn => btn.disabled = true);

    const selectedButton = optionButtons[selectedIndex];
    const correctButton = optionButtons[question.correctAnswerIndex];

    correctButton.classList.add('correct');
    if (!isCorrect) {
        selectedButton.classList.add('incorrect');
    }

    elements.srFeedback.textContent = isCorrect ? 'Correct!' : 'Incorrect.';
    elements.explanationText.textContent = question.explanation;
    elements.explanationContainer.style.display = 'block';
    
    elements.nextQuestionBtn.textContent = isLastQuestion() ? 'Finish Quiz' : 'Next Question';
    elements.quizFooter.style.display = 'block';
}

function updateProgress() {
    const state = getQuizState();
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

    elements = {
        progressBar: document.getElementById('progress-bar'),
        progressText: document.getElementById('progress-text'),
        questionArea: document.querySelector('.question-area'),
        questionText: document.getElementById('question-text'),
        optionsContainer: document.getElementById('options-container'),
        explanationContainer: document.getElementById('explanation-container'),
        explanationText: document.getElementById('explanation-text'),
        quizFooter: document.getElementById('quiz-footer'),
        nextQuestionBtn: document.getElementById('next-question-btn'),
        srFeedback: document.getElementById('sr-feedback')
    };

    elements.optionsContainer.addEventListener('click', handleOptionClick);
    elements.nextQuestionBtn.addEventListener('click', proceedToNextStep);

    renderQuestion();
}

export function destroy() {
    if (elements) {
        elements.optionsContainer?.removeEventListener('click', handleOptionClick);
        elements.nextQuestionBtn?.removeEventListener('click', proceedToNextStep);
    }
    elements = {};
    appStateRef = null;
}
