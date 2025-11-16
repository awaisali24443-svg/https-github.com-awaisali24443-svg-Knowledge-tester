import * as apiService from '../../services/apiService.js';
import * as learningPathService from '../../services/learningPathService.js';
import * as markdownService from '../../services/markdownService.js';
import * as soundService from '../../services/soundService.js';
import * as historyService from '../../services/historyService.js';
import * as levelCacheService from '../../services/levelCacheService.js';
import { showConfirmationModal } from '../../services/modalService.js';

let appState;
let levelData;
let currentQuestionIndex = 0;
let score = 0;
let answered = false;
let elements = {};
let selectedAnswerIndex = null;
let timerInterval = null;
let timeLeft = 60;

const PASS_THRESHOLD = 0.8; // 80% to pass

function switchState(targetStateId) {
    document.querySelectorAll('.game-level-state').forEach(s => s.classList.remove('active'));
    document.getElementById(targetStateId)?.classList.add('active');
}

async function startLevel() {
    const { topic, level, journeyId } = appState.context;
    if (!topic || !level || !journeyId) {
        window.location.hash = '/topics';
        return;
    }
    
    elements.loadingTitle.textContent = `Level ${level}: ${topic}`;
    switchState('level-loading-state');

    const cachedLevel = levelCacheService.getLevel(topic, level);
    if (cachedLevel) {
        levelData = cachedLevel;
        renderLesson();
        return;
    }

    if (!navigator.onLine) {
        elements.loadingTitle.textContent = 'You are Offline';
        elements.loadingTitle.nextElementSibling.textContent = 'This level is not cached. Please connect to the internet to play.';
        elements.loadingTitle.parentElement.querySelector('.spinner').style.display = 'none';
        elements.cancelBtn.textContent = 'Back to Map';
        return;
    }
    
    try {
        levelData = await apiService.generateLevel({ topic, level });
        if (!levelData || !levelData.lesson || !levelData.questions || levelData.questions.length === 0) {
            throw new Error("AI failed to generate valid level content.");
        }
        levelCacheService.saveLevel(topic, level, levelData);
        renderLesson();
    } catch (error) {
        elements.loadingTitle.textContent = 'Error';
        elements.loadingTitle.nextElementSibling.textContent = error.message;
        elements.loadingTitle.parentElement.querySelector('.spinner').style.display = 'none';
        elements.cancelBtn.textContent = 'Back to Map';
    }
}

function renderLesson() {
    elements.lessonTitle.textContent = `Level ${appState.context.level}: ${appState.context.topic}`;
    elements.lessonBody.innerHTML = markdownService.render(levelData.lesson);
    switchState('level-lesson-state');
}

function startQuiz() {
    currentQuestionIndex = 0;
    score = 0;
    renderQuestion();
    switchState('level-quiz-state');
    soundService.playSound('start');
}

function renderQuestion() {
    answered = false;
    selectedAnswerIndex = null;
    const question = levelData.questions[currentQuestionIndex];
    
    elements.quizProgressText.textContent = `Question ${currentQuestionIndex + 1} / ${levelData.questions.length}`;
    const progress = ((currentQuestionIndex + 1) / levelData.questions.length) * 100;
    elements.quizProgressBarFill.style.width = `${progress}%`;
    
    elements.quizQuestionText.textContent = question.question;
    elements.quizOptionsContainer.innerHTML = '';
    const optionLetters = ['A', 'B', 'C', 'D'];
    question.options.forEach((optionText, index) => {
        const button = document.createElement('button');
        button.className = 'btn option-btn';
        // The letter is now handled by CSS counters
        const textSpan = document.createElement('span');
        textSpan.textContent = optionText;
        button.appendChild(textSpan);
        button.dataset.index = index;
        elements.quizOptionsContainer.appendChild(button);
    });

    elements.submitAnswerBtn.disabled = true;
    elements.submitAnswerBtn.textContent = 'Submit Answer';
    
    startTimer();
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 60;
    elements.timerText.textContent = `01:00`;
    timerInterval = setInterval(() => {
        timeLeft--;
        const seconds = String(timeLeft % 60).padStart(2, '0');
        elements.timerText.textContent = `00:${seconds}`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            handleTimeUp();
        }
    }, 1000);
}

function handleTimeUp() {
    // Treat as incorrect answer and move on
    soundService.playSound('incorrect');
    selectedAnswerIndex = -1; // Indicate no answer was selected
    handleSubmitAnswer();
}


function handleOptionClick(event) {
    const button = event.target.closest('.option-btn');
    if (answered || !button) return;

    // Deselect others
    elements.quizOptionsContainer.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
    
    // Select clicked
    button.classList.add('selected');
    selectedAnswerIndex = parseInt(button.dataset.index, 10);
    elements.submitAnswerBtn.disabled = false;
}

function handleSubmitAnswer() {
    if (answered) {
        handleNextQuestion();
        return;
    }
    clearInterval(timerInterval);
    answered = true;

    const question = levelData.questions[currentQuestionIndex];
    const isCorrect = question.correctAnswerIndex === selectedAnswerIndex;
    
    if (isCorrect) {
        score++;
        soundService.playSound('correct');
    } else {
        soundService.playSound('incorrect');
    }

    elements.quizOptionsContainer.querySelectorAll('.option-btn').forEach(btn => {
        const index = parseInt(btn.dataset.index, 10);
        if (index === question.correctAnswerIndex) {
            btn.classList.add('correct');
        } else if (index === selectedAnswerIndex) {
            btn.classList.add('incorrect');
        }
        btn.disabled = true;
    });

    elements.submitAnswerBtn.textContent = 'Next Question';
    elements.submitAnswerBtn.disabled = false;
    elements.submitAnswerBtn.focus();
}

function handleNextQuestion() {
    if (currentQuestionIndex < levelData.questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    const totalQuestions = levelData.questions.length;
    const scorePercent = totalQuestions > 0 ? (score / totalQuestions) : 0;
    const passed = scorePercent >= PASS_THRESHOLD;

    soundService.playSound('finish');
    
    historyService.addQuizAttempt({
        topic: `${appState.context.topic} - Level ${appState.context.level}`,
        score: score,
        totalQuestions: totalQuestions,
        startTime: Date.now() - (totalQuestions * 60000), // Approximate
        endTime: Date.now(),
    });

    if (passed) {
        elements.resultsIcon.innerHTML = `<svg><use href="/assets/icons/feather-sprite.svg#check-circle"/></svg>`;
        elements.resultsIcon.className = 'results-icon passed';
        elements.resultsTitle.textContent = `Level ${appState.context.level} Complete!`;
        elements.resultsDetails.textContent = `You scored ${score} out of ${totalQuestions}. Great job!`;
        elements.resultsActions.innerHTML = `<a href="#/game/${encodeURIComponent(appState.context.topic)}" class="btn btn-primary">Continue Journey</a>`;
        
        const journey = learningPathService.getJourneyById(appState.context.journeyId);
        if (journey && journey.currentLevel === appState.context.level) {
            learningPathService.completeLevel(appState.context.journeyId);
        }
    } else {
        elements.resultsIcon.innerHTML = `<svg><use href="/assets/icons/feather-sprite.svg#x-circle"/></svg>`;
        elements.resultsIcon.className = 'results-icon failed';
        elements.resultsTitle.textContent = 'Keep Practicing!';
        elements.resultsDetails.textContent = `You scored ${score} out of ${totalQuestions}. Review the lesson and try again.`;
        elements.resultsActions.innerHTML = `
            <a href="#/game/${encodeURIComponent(appState.context.topic)}" class="btn">Back to Map</a>
            <button id="retry-level-btn" class="btn btn-primary">Try Again</button>
        `;
        document.getElementById('retry-level-btn').addEventListener('click', startQuiz);
    }
    switchState('level-results-state');
}

async function handleQuit() {
    const confirmed = await showConfirmationModal({
        title: 'Quit Quiz?',
        message: 'Are you sure you want to quit? Your progress in this level will not be saved.',
        confirmText: 'Yes, Quit',
        cancelText: 'Cancel',
        danger: true,
    });
    if (confirmed) {
        window.location.hash = `#/game/${encodeURIComponent(appState.context.topic)}`;
    }
}

function goHome() {
    window.location.hash = `/#/`;
}

export function init(globalState) {
    appState = globalState;
    elements = {
        loadingTitle: document.getElementById('loading-title'),
        cancelBtn: document.getElementById('cancel-generation-btn'),
        lessonTitle: document.getElementById('lesson-title'),
        lessonBody: document.getElementById('lesson-body'),
        startQuizBtn: document.getElementById('start-quiz-btn'),
        // New Quiz Elements
        quitBtn: document.getElementById('quit-btn'),
        homeBtn: document.getElementById('home-btn'),
        timerText: document.getElementById('timer-text'),
        quizProgressText: document.getElementById('quiz-progress-text'),
        quizProgressBarFill: document.getElementById('quiz-progress-bar-fill'),
        quizQuestionText: document.getElementById('quiz-question-text'),
        quizOptionsContainer: document.getElementById('quiz-options-container'),
        submitAnswerBtn: document.getElementById('submit-answer-btn'),
        // Results Elements
        resultsIcon: document.getElementById('results-icon'),
        resultsTitle: document.getElementById('results-title'),
        resultsDetails: document.getElementById('results-details'),
        resultsActions: document.getElementById('results-actions'),
    };

    elements.cancelBtn.addEventListener('click', () => window.history.back());
    elements.startQuizBtn.addEventListener('click', startQuiz);
    elements.quizOptionsContainer.addEventListener('click', handleOptionClick);
    elements.submitAnswerBtn.addEventListener('click', handleSubmitAnswer);
    elements.quitBtn.addEventListener('click', handleQuit);
    elements.homeBtn.addEventListener('click', goHome);

    startLevel();
}

export function destroy() {
    clearInterval(timerInterval);
}