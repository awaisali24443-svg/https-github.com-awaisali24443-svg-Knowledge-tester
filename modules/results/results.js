import * as progressService from '../../services/progressService.js';
import { UNLOCK_SCORE, MAX_LEVEL, NUM_QUESTIONS } from '../../constants.js';
import { playSound } from '../../services/soundService.js';
import * as quizState from '../../services/quizStateService.js';
import { SceneManager } from '../../services/threeManager.js';

let sceneManager;
let quizData = null;
let userAnswers = [];
let quizContext = {};

const resultsContainer = document.getElementById('results-container');

function triggerConfetti() {
    const confettiContainer = document.createElement('div');
    confettiContainer.id = 'confetti-container';
    document.body.appendChild(confettiContainer);

    const colors = ['var(--color-primary)', 'var(--color-secondary)', '#22c55e', '#f59e0b'];
    for (let i = 0; i < 150; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.animationDelay = `${Math.random() * 2}s`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        
        if (i % 3 === 0) { // Rectangles
            confetti.style.height = '15px';
            confetti.style.width = '7px';
            confetti.style.borderRadius = '2px';
        }

        confettiContainer.appendChild(confetti);
    }

    setTimeout(() => {
        confettiContainer.remove();
    }, 4000);
}

function animateCountUp(element, finalValue, total) {
    let current = 0;
    const duration = 1000;
    const stepTime = Math.abs(Math.floor(duration / finalValue)) || 50;
    
    const timer = setInterval(() => {
        current += 1;
        element.textContent = total ? `${current}/${total}` : current;
        if (current >= finalValue) {
            clearInterval(timer);
             element.textContent = total ? `${finalValue}/${total}` : finalValue;
        }
    }, stepTime);
}


function renderStandardResults(score) {
    playSound('complete');
    
    // --- GAMIFICATION UPDATE ---
    const xpGained = score * 10; // 10 XP per correct answer
    progressService.recordQuizResult(score, quizData.length, xpGained);
    window.updateHeaderStats(); // Refresh the header UI
    // --- END GAMIFICATION ---

    const scorePercentage = Math.round((score / quizData.length) * 100);
    
    let feedbackHtml = '';
    let primaryActionHtml = '';
    let secondaryActionsHtml = '';

    if (quizContext.isLeveled) {
        const didPass = score >= UNLOCK_SCORE;
        const isMaxLevel = quizContext.level >= MAX_LEVEL;

        if (didPass) {
            if (!isMaxLevel) {
                triggerConfetti();
                const newLevel = quizContext.level + 1;
                feedbackHtml = `<div class="results-feedback success"><strong>Level ${quizContext.level} Passed!</strong> You've unlocked Level ${newLevel}.</div>`;
                primaryActionHtml = `<button id="next-level-btn" class="btn btn-primary">New Quiz (Next Level)</button>`;
                progressService.unlockNextLevel(quizContext.topicName, MAX_LEVEL);
            } else {
                feedbackHtml = `<div class="results-feedback success"><strong>Congratulations!</strong> You've mastered ${quizContext.topicName} by completing the final level!</div>`;
            }
        } else {
            feedbackHtml = `<div class="results-feedback failure"><strong>Nice try!</strong> You need a score of at least ${UNLOCK_SCORE} to unlock the next level.</div>`;
            primaryActionHtml = `<button id="retry-level-btn" class="btn btn-primary">New Quiz (Retry Level)</button>`;
        }
    } else { // Non-leveled quiz
        if (scorePercentage >= 80) feedbackHtml = `<div class="results-feedback success"><strong>Great job!</strong> A fantastic score.</div>`;
        else if (scorePercentage >= 50) feedbackHtml = `<div class="results-feedback"><strong>Good effort!</strong> Keep practicing.</div>`;
        else feedbackHtml = `<div class="results-feedback failure"><strong>Keep trying!</strong> Every quiz is a learning opportunity.</div>`;
        
        primaryActionHtml = `<button id="retry-level-btn" class="btn btn-primary">New Quiz (Same Topic)</button>`;
    }

    // Add secondary actions
    const incorrectAnswers = quizData.filter((q, index) => userAnswers[index] !== q.correctAnswerIndex);
    if (incorrectAnswers.length > 0) {
        secondaryActionsHtml += `<button id="retry-missed-btn" class="btn btn-secondary">Retry Missed (${incorrectAnswers.length})</button>`;
    }
    secondaryActionsHtml += `<button id="retry-quiz-btn" class="btn btn-secondary">Retry Same Questions</button>`;
    secondaryActionsHtml += `<button id="back-to-topics-btn" class="btn btn-secondary">Back</button>`;

    const reviewHtml = quizData.map((q, index) => {
        const userAnswerIndex = userAnswers[index];
        return `<div class="review-item" style="animation-delay: ${index * 0.15}s">
            <p class="review-question">${index + 1}. ${q.question}</p>
            <div class="review-options">
                ${q.options.map((opt, i) => `<div class="review-option ${i === q.correctAnswerIndex ? 'review-correct' : (i === userAnswerIndex ? 'review-incorrect' : '')}">${opt}</div>`).join('')}
            </div>
            ${userAnswerIndex !== q.correctAnswerIndex ? `<div class="review-explanation"><strong>Explanation:</strong> ${q.explanation}</div>` : ''}
        </div>`;
    }).join('');

    const circumference = 2 * Math.PI * 54;
    const strokeDashoffset = circumference - (scorePercentage / 100) * circumference;

    resultsContainer.innerHTML = `
        <h2 class="results-title">Quiz Complete! (+${xpGained} XP)</h2>
        <div class="score-container">
            <svg class="score-circle" width="120" height="120" viewBox="0 0 120 120">
                <circle class="score-circle-bg" cx="60" cy="60" r="54"></circle>
                <circle id="score-fg" class="score-circle-fg" cx="60" cy="60" r="54" stroke="url(#score-gradient)" stroke-dasharray="${circumference}"></circle>
                <defs>
                    <linearGradient id="score-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stop-color="${scorePercentage < 50 ? 'var(--color-warning)' : 'var(--color-secondary)'}" />
                        <stop offset="100%" stop-color="${scorePercentage < 50 ? 'var(--color-danger)' : 'var(--color-primary)'}" />
                    </linearGradient>
                </defs>
            </svg>
            <div id="score-text" class="score-text">0/${quizData.length}</div>
        </div>
        <p class="results-summary">You scored ${scorePercentage}%</p>
        ${feedbackHtml}
        <div class="results-actions">
            ${primaryActionHtml}
            ${secondaryActionsHtml}
        </div>
        <div class="review-container">${reviewHtml}</div>
    `;
    
    document.getElementById('retry-missed-btn')?.addEventListener('click', () => handleRetryMissed(incorrectAnswers));
    const scoreTextEl = document.getElementById('score-text');
    const scoreFgCircle = document.getElementById('score-fg');
    setTimeout(() => {
        scoreFgCircle.style.strokeDashoffset = strokeDashoffset;
        animateCountUp(scoreTextEl, score, quizData.length);
    }, 100);
}

function renderChallengeResults(score) {
    playSound('complete');
    const progress = progressService.getProgress();
    const oldHighScore = progress.stats.challengeHighScore;
    const isNewHighScore = progressService.updateChallengeHighScore(score);

    if (isNewHighScore) {
        triggerConfetti();
    }
    
    resultsContainer.innerHTML = `
        <h2 class="results-title">Challenge Complete!</h2>
        <div class="challenge-high-score">
            High Score: <span>${isNewHighScore ? score : oldHighScore}</span>
        </div>
        <div class="score-container">
            <div id="score-text" class="score-text" style="font-size: 3.5rem;">0</div>
        </div>
        <p class="results-summary">${isNewHighScore ? "🎉 New High Score! 🎉" : "Great effort!"}</p>
        <div class="results-actions">
            <button id="retry-level-btn" class="btn btn-primary">Try Again</button>
            <button id="back-to-topics-btn" class="btn btn-secondary">Back to Dashboard</button>
        </div>
    `;
    
    const scoreTextEl = document.getElementById('score-text');
    animateCountUp(scoreTextEl, score, null);
}


function _startNewQuiz(topicName, level, returnHash, promptOverride = null) {
    let prompt;
    let newQuizContext;

    if (promptOverride) { // For non-leveled quizzes
        prompt = promptOverride;
        newQuizContext = { topicName, isLeveled: false, prompt, returnHash };
    } else { // For leveled quizzes
        const descriptor = getLevelDescriptor(level);
        prompt = `Generate a quiz with ${NUM_QUESTIONS} multiple-choice questions about "${topicName}". The difficulty should be for an expert at Level ${level} out of ${MAX_LEVEL} (${descriptor} level).`;
        newQuizContext = { topicName, level, returnHash, isLeveled: true };
    }
    
    sessionStorage.setItem('quizContext', JSON.stringify(newQuizContext));
    window.location.hash = '#loading';
}

function handleRetrySameQuiz() {
    if (quizData && quizContext) {
        quizState.startNewQuizState(quizData, quizContext);
        window.location.hash = '#quiz';
    } else {
        window.showToast("Error: Could not reload quiz data.", "error");
        window.location.hash = quizContext.returnHash || '#home';
    }
}

function handleRetryMissed(missedQuestions) {
    playSound('start');
    const reviewContext = {
        ...quizContext,
        topicName: `${quizContext.topicName} (Review)`,
        isLeveled: false, // Review quizzes don't affect levels
    };
    quizState.startNewQuizState(missedQuestions, reviewContext);
    window.location.hash = '#quiz';
}

function handleRetryLevel() {
    if (quizContext.isChallenge) {
        window.location.hash = '#challenge-setup';
    } else if (quizContext.isLeveled === false) {
        _startNewQuiz(quizContext.topicName, null, quizContext.returnHash, quizContext.prompt);
    } else {
        _startNewQuiz(quizContext.topicName, quizContext.level, quizContext.returnHash);
    }
}

function handleNextLevel() {
    _startNewQuiz(quizContext.topicName, quizContext.level + 1, quizContext.returnHash);
}

function getLevelDescriptor(level) {
    const descriptors = { 1: "Noob", 10: "Beginner", 20: "Intermediate", 30: "Advanced", 40: "Expert", 50: "Master" };
    const keys = Object.keys(descriptors).map(Number).sort((a, b) => b - a);
    for (const key of keys) {
        if (level >= key) return descriptors[key];
    }
    return "Noob";
}

function init() {
    const resultsString = sessionStorage.getItem('quizResults');
    if (!resultsString) {
        console.error("No results data found. Redirecting home.");
        window.location.hash = '#home';
        return;
    }

    try {
        const results = JSON.parse(resultsString);
        quizData = results.quizData;
        userAnswers = results.userAnswers;
        quizContext = results.quizContext;
        
        const score = userAnswers.reduce((acc, answer, index) => 
            (answer !== null && answer === quizData[index].correctAnswerIndex ? acc + 1 : acc), 0);

        if (quizContext.isChallenge) {
            renderChallengeResults(score);
        } else {
            renderStandardResults(score);
        }

        // Common event listeners
        document.getElementById('back-to-topics-btn')?.addEventListener('click', () => window.location.hash = quizContext.returnHash || '#home');
        document.getElementById('next-level-btn')?.addEventListener('click', () => handleNextLevel());
        document.getElementById('retry-level-btn')?.addEventListener('click', () => handleRetryLevel());
        document.getElementById('retry-quiz-btn')?.addEventListener('click', handleRetrySameQuiz);

    } catch (e) {
        console.error("Failed to parse results data:", e);
        window.location.hash = '#home';
    } finally {
        sessionStorage.removeItem('quizResults');
    }

    const canvas = document.querySelector('.background-canvas');
    if (canvas && window.THREE) {
        sceneManager = new SceneManager(canvas);
        sceneManager.init('subtleParticles');
    }
}

window.addEventListener('hashchange', () => {
    if (sceneManager) {
        sceneManager.destroy();
        sceneManager = null;
    }
}, { once: true });

init();