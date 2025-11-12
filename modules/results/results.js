import { getQuizState, endQuiz } from '../../services/quizStateService.js';
import { saveQuestion, isQuestionSaved } from '../../services/libraryService.js';
import { markStepComplete } from '../../services/learningPathService.js';
import { PASSING_SCORE_PERCENTAGE } from '../../constants.js';
import { toastService } from '../../services/toastService.js';
import { initializeCardGlow } from '../../global/global.js';

let appStateRef;
let retakeBtn, toggleReviewBtn;

const handleRetakeQuiz = () => {
    // Retake quiz with the same topic context
    window.location.hash = '#loading';
};

const handleToggleReview = () => {
    const reviewDetails = document.getElementById('review-details');
    if (reviewDetails) {
        reviewDetails.classList.toggle('visible');
        toggleReviewBtn.textContent = reviewDetails.classList.contains('visible') 
            ? 'Hide Details' 
            : 'Show Details';
    }
};

function animateScore(finalScore, scoreEl) {
    let currentScore = 0;
    const duration = 1000;
    const stepTime = 20;
    const increment = finalScore / (duration / stepTime) || 1;

    const timer = setInterval(() => {
        currentScore += increment;
        if (currentScore >= finalScore) {
            currentScore = finalScore;
            clearInterval(timer);
        }
        scoreEl.textContent = `${Math.round(currentScore)}%`;
    }, stepTime);
}

function renderResults() {
    const { questions, userAnswers, score } = getQuizState();
    
    if (!questions || questions.length === 0) {
        console.warn("No quiz state found, redirecting home.");
        window.location.hash = '#home';
        return;
    }
    
    const scorePercent = Math.round((score / questions.length) * 100);

    const scoreRingFg = document.getElementById('score-ring-fg');
    const scoreText = document.getElementById('score-text');
    const finalScoreText = document.getElementById('final-score-text');
    const title = document.getElementById('results-title');
    retakeBtn = document.getElementById('retake-quiz-btn');
    toggleReviewBtn = document.getElementById('toggle-review-btn');
    
    finalScoreText.textContent = `You answered ${score} out of ${questions.length} questions correctly.`;

    setTimeout(() => {
        scoreRingFg.style.strokeDasharray = `${scorePercent}, 100`;
        animateScore(scorePercent, scoreText);
    }, 100);

    if (scorePercent >= PASSING_SCORE_PERCENTAGE) {
        title.textContent = "Congratulations!";
    } else {
        title.textContent = "Keep Practicing!";
    }

    const pathContext = appStateRef.context.learningPathContext;
    if (pathContext && scorePercent >= PASSING_SCORE_PERCENTAGE) {
        markStepComplete(pathContext.pathId, pathContext.stepId);
        toastService.show("Learning path step completed!");
    }

    renderQuestionReview(questions, userAnswers);

    retakeBtn.addEventListener('click', handleRetakeQuiz);
    toggleReviewBtn.addEventListener('click', handleToggleReview);
}

function renderQuestionReview(questions, userAnswers) {
    const container = document.getElementById('question-review-container');
    const template = document.getElementById('review-item-template');
    container.innerHTML = '';

    questions.forEach((q, index) => {
        const reviewItem = template.content.cloneNode(true);
        reviewItem.querySelector('.review-question-text').textContent = `${index + 1}. ${q.question}`;
        
        const optionsContainer = reviewItem.querySelector('.review-options');
        q.options.forEach((opt, optIndex) => {
            const optionEl = document.createElement('div');
            optionEl.className = 'option';
            optionEl.textContent = opt;

            if (optIndex === q.correctAnswerIndex) {
                optionEl.classList.add('correct');
            } else if (optIndex === userAnswers[index]) {
                optionEl.classList.add('incorrect');
            }
            if (optIndex === userAnswers[index]) {
                optionEl.classList.add('user-answer');
            }
            optionsContainer.appendChild(optionEl);
        });

        reviewItem.querySelector('.review-explanation p').textContent = q.explanation;
        
        const saveBtn = reviewItem.querySelector('.save-question-btn');
        if (isQuestionSaved(q)) {
            saveBtn.classList.add('saved');
            saveBtn.disabled = true;
        } else {
            saveBtn.addEventListener('click', () => {
                if (saveQuestion(q)) {
                    saveBtn.classList.add('saved');
                    saveBtn.disabled = true;
                    toastService.show('Question saved to library!');
                }
            });
        }
        container.appendChild(reviewItem);
    });
    
    initializeCardGlow();
}

export function init(appState) {
    appStateRef = appState;
    renderResults();
}

export function destroy() {
    if (retakeBtn) {
        retakeBtn.removeEventListener('click', handleRetakeQuiz);
    }
    if (toggleReviewBtn) {
        toggleReviewBtn.removeEventListener('click', handleToggleReview);
    }
    endQuiz(); // Clear the quiz state after leaving the results page
    appStateRef = null;
    console.log("Results module destroyed.");
}
