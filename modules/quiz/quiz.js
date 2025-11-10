import { quizStateService } from '../../services/quizStateService.js';

let questionTextEl, optionsContainerEl, explanationContainerEl, explanationTextEl, nextButtonEl, progressBarEl, progressTextEl;

function renderQuestion() {
    const question = quizStateService.getCurrentQuestion();
    if (!question) {
        // Handle case where quiz ends or data is missing
        endQuiz();
        return;
    }

    // Update progress
    const progress = quizStateService.getProgress();
    progressBarEl.style.width = `${(progress.current / progress.total) * 100}%`;
    progressTextEl.textContent = `Question ${progress.current}/${progress.total}`;

    // Update UI elements
    questionTextEl.textContent = question.question;
    optionsContainerEl.innerHTML = '';
    explanationContainerEl.style.display = 'none';
    nextButtonEl.style.display = 'none';

    // Create option buttons
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

    // Disable all option buttons
    const allOptionButtons = optionsContainerEl.querySelectorAll('.option-btn');
    allOptionButtons.forEach(btn => btn.disabled = true);

    // Provide visual feedback
    if (isCorrect) {
        selectedButton.classList.add('correct');
    } else {
        selectedButton.classList.add('incorrect');
        allOptionButtons[correctAnswerIndex].classList.add('correct');
    }
    
    // Show explanation
    const question = quizStateService.getCurrentQuestion();
    explanationTextEl.textContent = question.explanation;
    explanationContainerEl.style.display = 'block';

    // Show next/finish button
    if (quizStateService.isQuizOver()) {
        nextButtonEl.textContent = 'Finish';
    } else {
        nextButtonEl.textContent = 'Next';
    }
    nextButtonEl.style.display = 'inline-flex';
}

function handleNextClick() {
    if (quizStateService.isQuizOver()) {
        endQuiz();
    } else {
        quizStateService.nextQuestion();
        renderQuestion();
    }
}

function endQuiz() {
    const results = quizStateService.getResults();
    // Pass results to the next module via appState
    window.appState.context = { results }; 
    window.location.hash = '#results';
}

export function init(appState) {
    console.log("Quiz module initialized.");
    
    // This is a bit of a hack to ensure appState is available globally in the window scope
    // for our endQuiz function. A proper event bus would be better in a larger app.
    window.appState = appState; 

    const quizData = appState.context?.quizData;
    if (!quizData) {
        console.error("No quiz data found!");
        window.location.hash = '#home'; // Redirect if no data
        return;
    }
    
    quizStateService.startQuiz(quizData);

    // Cache DOM elements
    questionTextEl = document.getElementById('question-text');
    optionsContainerEl = document.getElementById('options-container');
    explanationContainerEl = document.getElementById('explanation-container');
    explanationTextEl = document.getElementById('explanation-text');
    nextButtonEl = document.getElementById('next-question-btn');
    progressBarEl = document.getElementById('progress-bar');
    progressTextEl = document.getElementById('progress-text');

    // Attach event listeners
    nextButtonEl.addEventListener('click', handleNextClick);

    // Render the first question
    renderQuestion();
}

export function destroy() {
    // Clean up state and listeners
    quizStateService.endQuiz();
    if(nextButtonEl) {
        nextButtonEl.removeEventListener('click', handleNextClick);
    }
    window.appState = null;
    console.log("Quiz module destroyed.");
}