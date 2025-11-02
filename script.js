import { generateQuiz } from './geminiService.js';

// --- Constants ---
const NUM_QUESTIONS = 5;

const GameState = {
  TOPIC_SELECTION: 'TOPIC_SELECTION',
  LOADING: 'LOADING',
  IN_PROGRESS: 'IN_PROGRESS',
  RESULTS: 'RESULTS',
};

// --- State ---
let gameState = GameState.TOPIC_SELECTION;
let quizData = null;
let userAnswers = [];
let currentQuestionIndex = 0;
let error = null;

// --- DOM Elements ---
const views = {
    topicSelector: document.getElementById('topic-selector-view'),
    loading: document.getElementById('loading-view'),
    quiz: document.getElementById('quiz-view'),
    results: document.getElementById('results-view'),
};
const topicForm = document.getElementById('topic-form');
const topicInput = document.getElementById('topic-input');
const generateQuizBtn = document.getElementById('generate-quiz-btn');
const errorMessage = document.getElementById('error-message');
const yearSpan = document.getElementById('year');

// --- Functions ---

/**
 * Updates the UI to show the correct view based on the current game state.
 */
function updateView() {
    Object.values(views).forEach(view => view.classList.add('hidden'));

    switch (gameState) {
        case GameState.TOPIC_SELECTION:
            views.topicSelector.classList.remove('hidden');
            if (error) {
                errorMessage.textContent = error;
                errorMessage.classList.remove('hidden');
            } else {
                errorMessage.classList.add('hidden');
            }
            break;
        case GameState.LOADING:
            views.loading.classList.remove('hidden');
            break;
        case GameState.IN_PROGRESS:
            views.quiz.classList.remove('hidden');
            renderQuiz();
            break;
        case GameState.RESULTS:
            views.results.classList.remove('hidden');
            renderResults();
            break;
    }
}

/**
 * Renders the current quiz question and options.
 */
function renderQuiz() {
    const question = quizData[currentQuestionIndex];
    const optionsHtml = question.options.map((option, index) => `
        <button
            data-option-index="${index}"
            class="quiz-option w-full text-left p-4 rounded-lg border-2 transition-all duration-300 bg-white dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-gray-600 cursor-pointer"
        >
            <span class="font-medium text-gray-800 dark:text-white">${option}</span>
        </button>
    `).join('');

    views.quiz.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg w-full">
            <div class="mb-4">
                <div class="flex justify-between items-center mb-2">
                    <h2 class="text-lg font-semibold text-blue-600 dark:text-blue-400">
                        Question ${currentQuestionIndex + 1} / ${NUM_QUESTIONS}
                    </h2>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                        class="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                        style="width: ${((currentQuestionIndex + 1) / NUM_QUESTIONS) * 100}%"
                    ></div>
                </div>
            </div>
            <h3 class="text-xl sm:text-2xl font-bold mb-6 text-gray-800 dark:text-white">${question.question}</h3>
            <div class="space-y-3">${optionsHtml}</div>
            <div id="quiz-feedback" class="mt-6 text-center"></div>
        </div>
    `;

    document.querySelectorAll('.quiz-option').forEach(button => {
        button.addEventListener('click', handleAnswerSelect);
    });
}

/**
 * Renders the final results page.
 */
function renderResults() {
    const score = userAnswers.reduce((acc, answer, index) => {
        return answer === quizData[index].correctAnswerIndex ? acc + 1 : acc;
    }, 0);
    const scorePercentage = Math.round((score / quizData.length) * 100);

    const getResultColor = () => {
        if (scorePercentage >= 80) return 'text-green-500';
        if (scorePercentage >= 50) return 'text-yellow-500';
        return 'text-red-500';
    };

    const questionsReviewHtml = quizData.map((question, index) => {
        const userAnswer = userAnswers[index];
        const optionsHtml = question.options.map((option, optionIndex) => {
            const isCorrect = optionIndex === question.correctAnswerIndex;
            const isSelected = optionIndex === userAnswer;
            let itemClass = 'bg-gray-100 dark:bg-gray-700 border-transparent';
            if (isCorrect) {
                itemClass = 'bg-green-100 dark:bg-green-900 border-green-500';
            } else if (isSelected) {
                itemClass = 'bg-red-100 dark:bg-red-900 border-red-500';
            }

            return `
                <div class="p-3 rounded-lg border ${itemClass}">
                    <span>${option}</span>
                    ${isCorrect ? ' ✓' : ''}
                    ${isSelected && !isCorrect ? ' ✗' : ''}
                </div>
            `;
        }).join('');

        const explanationHtml = userAnswer !== question.correctAnswerIndex
            ? `<p class="mt-3 text-sm text-gray-700 dark:text-gray-300 bg-yellow-100 dark:bg-yellow-900/50 p-2 rounded-md">
                   <strong>Explanation:</strong> ${question.explanation}
               </p>`
            : '';

        return `
            <div class="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                <h3 class="font-semibold text-lg mb-3">${index + 1}. ${question.question}</h3>
                <div class="space-y-2">${optionsHtml}</div>
                ${explanationHtml}
            </div>
        `;
    }).join('');

    views.results.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-lg w-full">
            <div class="text-center mb-8">
                <h2 class="text-3xl font-bold mb-2">Quiz Complete!</h2>
                <p class="text-5xl font-bold ${getResultColor()}">${score} / ${quizData.length}</p>
                <p class="text-lg text-gray-600 dark:text-gray-300">That's ${scorePercentage}%!</p>
            </div>
            <div class="space-y-6 mb-8">${questionsReviewHtml}</div>
            <div class="text-center">
                <button id="restart-btn" class="bg-gradient-to-r from-blue-500 to-teal-400 hover:from-blue-600 hover:to-teal-500 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200">
                    Try Another Quiz
                </button>
            </div>
        </div>
    `;

    document.getElementById('restart-btn').addEventListener('click', handleRestart);
}

// --- Event Handlers ---

async function handleStartQuiz(e) {
    e.preventDefault();
    const topic = topicInput.value.trim();
    if (!topic) return;

    generateQuizBtn.disabled = true;
    gameState = GameState.LOADING;
    error = null;
    updateView();

    try {
        const data = await generateQuiz(topic, NUM_QUESTIONS);
        quizData = data;
        userAnswers = new Array(data.length).fill(null);
        currentQuestionIndex = 0;
        gameState = GameState.IN_PROGRESS;
    } catch (err) {
        console.error('Failed to generate quiz:', err);
        error = "Sorry, I couldn't generate a quiz on that topic. Please try another one.";
        gameState = GameState.TOPIC_SELECTION;
    } finally {
        generateQuizBtn.disabled = false;
        updateView();
    }
}

function handleAnswerSelect(e) {
    const selectedButton = e.currentTarget;
    const selectedAnswerIndex = parseInt(selectedButton.dataset.optionIndex, 10);
    
    userAnswers[currentQuestionIndex] = selectedAnswerIndex;
    
    const question = quizData[currentQuestionIndex];
    const correctIndex = question.correctAnswerIndex;

    const optionButtons = document.querySelectorAll('.quiz-option');
    optionButtons.forEach(button => {
        button.disabled = true;
        button.classList.remove('hover:bg-blue-100', 'dark:hover:bg-gray-600', 'cursor-pointer');
        button.classList.add('cursor-default');

        const optionIndex = parseInt(button.dataset.optionIndex, 10);
        if (optionIndex === correctIndex) {
            button.classList.add('bg-green-200', 'dark:bg-green-700', 'border-green-500');
            button.classList.remove('bg-white', 'dark:bg-gray-700');
        } else if (optionIndex === selectedAnswerIndex) {
            button.classList.add('bg-red-200', 'dark:bg-red-700', 'border-red-500');
             button.classList.remove('bg-white', 'dark:bg-gray-700');
        } else {
             button.classList.add('opacity-60');
        }
    });

    const feedbackDiv = document.getElementById('quiz-feedback');
    const isLastQuestion = currentQuestionIndex === quizData.length - 1;
    feedbackDiv.innerHTML = `
        <button id="next-btn" class="bg-gradient-to-r from-blue-500 to-teal-400 hover:from-blue-600 hover:to-teal-500 text-white font-bold py-2 px-8 rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 mt-4">
            ${isLastQuestion ? 'Finish Quiz' : 'Next Question'}
        </button>
    `;
    document.getElementById('next-btn').addEventListener('click', handleNext);
}

function handleNext() {
    if (currentQuestionIndex < quizData.length - 1) {
        currentQuestionIndex++;
        renderQuiz();
    } else {
        gameState = GameState.RESULTS;
        updateView();
    }
}

function handleRestart() {
    gameState = GameState.TOPIC_SELECTION;
    quizData = null;
    userAnswers = [];
    currentQuestionIndex = 0;
    error = null;
    topicInput.value = '';
    updateView();
}

// --- Initialization ---
function init() {
    topicForm.addEventListener('submit', handleStartQuiz);
    topicInput.addEventListener('input', () => {
        generateQuizBtn.disabled = !topicInput.value.trim();
    });

    generateQuizBtn.disabled = true;
    yearSpan.textContent = new Date().getFullYear();
    updateView();
}

init();
