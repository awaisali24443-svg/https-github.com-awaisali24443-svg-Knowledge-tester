
// ... imports
import * as apiService from '../../services/apiService.js';
import * as learningPathService from '../../services/learningPathService.js';
import * as markdownService from '../../services/markdownService.js';
import * as soundService from '../../services/soundService.js';
import * as historyService from '../../services/historyService.js';
import * as levelCacheService from '../../services/levelCacheService.js';
import { showConfirmationModal } from '../../services/modalService.js';
import * as stateService from '../../services/stateService.js';
import * as libraryService from '../../services/libraryService.js';
import { showToast } from '../../services/toastService.js';
import * as gamificationService from '../../services/gamificationService.js'; // Added import

// ... rest of code ...

function showResults(isInteractive = false, isAntiCheatForfeit = false) {
    removeAntiCheat(); 
    
    let passed = false;
    let totalQuestions = 1;
    let scoreDisplay = score;

    if (isInteractive) {
        passed = score === 1;
        totalQuestions = 1;
    } else {
        totalQuestions = currentQuestions.length;
        const scorePercent = totalQuestions > 0 ? (score / totalQuestions) : 0;
        passed = scorePercent >= PASS_THRESHOLD;
        scoreDisplay = score;
    }
    
    if (isAntiCheatForfeit) {
        passed = false;
    }

    soundService.playSound(passed ? 'finish' : 'incorrect');
    
    historyService.addQuizAttempt({
        topic: `${levelContext.topic} - Level ${levelContext.level}`,
        score: score,
        totalQuestions: totalQuestions,
        startTime: Date.now() - (60000), 
        endTime: Date.now(),
        xpGained: isAntiCheatForfeit ? 0 : xpGainedThisLevel,
    });

    if (!isInteractive && !isAntiCheatForfeit) {
        let mistakesSaved = 0;
        currentQuestions.forEach((q, index) => {
            if (userAnswers[index] !== q.correctAnswerIndex && userAnswers[index] !== undefined) {
                if (!libraryService.isQuestionSaved(q)) {
                    libraryService.saveQuestion(q); 
                    mistakesSaved++;
                }
            }
        });
        if (mistakesSaved > 0) {
            showToast(`${mistakesSaved} mistake(s) saved to Library.`, 'info', 4000);
        }
    }

    const xpGained = isAntiCheatForfeit ? 0 : xpGainedThisLevel;
    if (xpGained > 0) {
        elements.xpGainText.textContent = `+${xpGained} XP`;
        elements.xpGainText.style.display = 'inline-block';
    } else {
        elements.xpGainText.style.display = 'none';
    }

    const reviewBtnHTML = (isInteractive || isAntiCheatForfeit) ? '' : `<button id="review-answers-btn" class="btn">Review Answers</button>`;

    if (passed) {
        elements.resultsIcon.innerHTML = `<svg><use href="/assets/icons/feather-sprite.svg#check-circle"/></svg>`;
        elements.resultsIcon.className = 'results-icon passed';
        
        if (levelContext.isBoss) {
             elements.resultsTitle.textContent = `Boss Defeated!`;
             elements.resultsDetails.textContent = `You conquered Chapter ${Math.ceil(levelContext.level / LEVELS_PER_CHAPTER)}!`;
             // NEW: Track Boss Win
             gamificationService.incrementStat('bossBattlesWon', 1);
        } else {
             elements.resultsTitle.textContent = `Level ${levelContext.level} Complete!`;
             elements.resultsDetails.textContent = isInteractive ? 'Challenge Mastered!' : `You scored ${score} out of ${totalQuestions}.`;
        }
        
        elements.resultsActions.innerHTML = `<a href="#/game/${encodeURIComponent(levelContext.topic)}" class="btn btn-primary">Continue Journey</a> ${reviewBtnHTML}`;
        
        const journey = learningPathService.getJourneyById(levelContext.journeyId);
        if (journey && journey.currentLevel === levelContext.level) learningPathService.completeLevel(levelContext.journeyId);

        fireConfetti();
        preloadNextLevel();

    } else {
        // ... fail state logic ...
        elements.resultsIcon.innerHTML = `<svg><use href="/assets/icons/feather-sprite.svg#x-circle"/></svg>`;
        elements.resultsIcon.className = 'results-icon failed';
        
        if (levelContext.isBoss) {
             if (isAntiCheatForfeit) {
                 elements.resultsTitle.textContent = 'FOCUS LOST';
                 elements.resultsDetails.textContent = `Anti-Cheat Protocol engaged. You left the battlefield.`;
             } else {
                 elements.resultsTitle.textContent = 'Boss Fight Failed';
                 elements.resultsDetails.textContent = `The boss survived. Try again.`;
             }
        } else {
             elements.resultsTitle.textContent = 'Keep Practicing!';
             elements.resultsDetails.textContent = isInteractive ? 'Solution Incorrect.' : `You scored ${score} out of ${totalQuestions}. Review the lesson.`;
        }
       
        const canInstantRetry = !levelContext.isBoss && !isInteractive && !isAntiCheatForfeit && ((currentAttemptSet + 1) * STANDARD_QUESTIONS_PER_ATTEMPT < masterQuestionsList.length);
        const retryText = canInstantRetry ? "Try Again (Instant)" : "Try Again";
        
        elements.resultsActions.innerHTML = `<a href="#/game/${encodeURIComponent(levelContext.topic)}" class="btn">Back to Map</a> <button id="retry-level-btn" class="btn btn-primary">${retryText}</button> ${reviewBtnHTML}`;
        
        const retryBtn = document.getElementById('retry-level-btn');
        if(retryBtn) {
            retryBtn.onclick = handleRetryClick;
        }
    }
    
    if (document.getElementById('review-answers-btn')) {
        document.getElementById('review-answers-btn').addEventListener('click', handleReviewAnswers);
    }
    switchState('level-results-state');
}

// ... rest of code ...
