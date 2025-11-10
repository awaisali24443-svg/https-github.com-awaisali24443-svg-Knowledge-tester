import { quizStateService } from '../../services/quizStateService.js';

let questionTextEl, optionsContainerEl, explanationContainerEl, explanationTextEl, nextButtonEl, progressBarEl, progressTextEl;
let appStateRef; // To hold a reference to appState

function renderQuestion() {
    const question = quizStateService.getCurrentQuestion();
    if (!question) {
        endQuiz();
        return;
    }

    const progress = quizStateService.getProgress();
    progressBarEl.style.width = `${(progress.current / progress.total) * 100}%`;
    progressTextEl.textContent = `Question ${progress.current}/${progress.total}`;

    questionTextEl.textContent = question.question;
    optionsContainerEl.innerHTML = '';
    explanationContainerEl.style.display = 'none';
    nextButtonEl.style.display = 'none';

    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'option-btn';
        button.textContent = option;
        button.dataset.index = index;
        button.addEventListener('click', handleOptionClick);
        optionsContainerEl.appendChild(button);
    });
}

function handleOptionClick(event) {
    const selectedButton = event.target;
    const selectedAnswerIndex = parseInt(selectedButton.dataset.index, 10);
    const { isCorrect, correctAnswerIndex } = quizStateService.submitAnswer(selectedAnswerIndex);

    const allOptionButtons = optionsContainerEl.querySelectorAll('.option-btn');
    allOptionButtons.forEach(btn => btn.disabled = true);

    if (isCorrect) {
        selectedButton.classList.add('correct');
    } else {
        selectedButton.classList.add('incorrect');
        allOptionButtons[correctAnswerIndex].classList.add('correct');
    }
    
    const question = quizStateService.getCurrentQuestion();
    explanationTextEl.textContent = question.explanation;
    explanationContainerEl.style.display = 'block';

    // FIX #27: Check if the quiz is over *after* answering the last question
    if (quizStateService.isQuizOverAfterAnswer()) {
        nextButtonEl.textContent = 'Finish';
    } else {
        nextButtonEl.textContent = 'Next';
    }
    nextButtonEl.style.display = 'inline-flex';
}

function handleNextClick() {
    if (quizStateService.isQuizOverAfterAnswer()) {
        endQuiz();
    } else {
        quizStateService.nextQuestion();
        renderQuestion();
    }
}

function endQuiz() {
    const results = quizStateService.getResults();
    // FIX #12: Pass results to the next module via appState context, which is now session-managed
    appStateRef.context = { results }; 
    window.location.hash = '#results';
}

export function init(appState) {
    appStateRef = appState; // Store reference

    const quizData = appState.context?.quizData;
    if (!quizData) {
        console.error("No quiz data found!");
        window.location.hash = '#home';
        return;
    }
    
    quizStateService.startQuiz(quizData);

    questionTextEl = document.getElementById('question-text');
    optionsContainerEl = document.getElementById('options-container');
    explanationContainerEl = document.getElementById('explanation-container');
    explanationTextEl = document.getElementById('explanation-text');
    nextButtonEl = document.getElementById('next-question-btn');
    progressBarEl = document.getElementById('progress-bar');
    progressTextEl = document.getElementById('progress-text');

    nextButtonEl.addEventListener('click', handleNextClick);

    renderQuestion();
    console.log("Quiz module initialized.");
}

export function destroy() {
    quizStateService.endQuiz();
    if(nextButtonEl) {
        nextButtonEl.removeEventListener('click', handleNextClick);
    }
    appStateRef = null; // Clear reference
    console.log("Quiz module destroyed.");
}