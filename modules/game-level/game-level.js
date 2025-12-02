
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
import * as gamificationService from '../../services/gamificationService.js'; 

let levelContext;
let currentQuestions = [];
let currentLesson = '';
let score = 0;
let currentState = 'loading'; 
let userAnswers = []; 
let currentAttemptSet = 0;
let masterQuestionsList = [];
let xpGainedThisLevel = 0;
let antiCheatTimer = null;
let timerInterval = null;
let timeRemaining = 0;
let isTimerActive = false;
const PASS_THRESHOLD = 0.6; // 60%
const STANDARD_QUESTIONS_PER_ATTEMPT = 5;
const LEVELS_PER_CHAPTER = 50;

// ... element refs ...
let elements = {};

// ... helper functions ...

function switchState(stateId) {
    currentState = stateId;
    document.querySelectorAll('.game-level-state').forEach(el => el.classList.remove('active'));
    document.getElementById(stateId).classList.add('active');
    window.scrollTo(0, 0);
}

// ... main logic ...

async function initializeLevel() {
    try {
        switchState('level-loading-state');
        
        // 1. Check Cache
        const cachedData = levelCacheService.getLevel(levelContext.topic, levelContext.level);
        if (cachedData) {
            processLevelData(cachedData);
            return;
        }

        // 2. Fetch from API with Safety Timeout
        const fetchPromise = (async () => {
            const questionsData = levelContext.isBoss 
                ? await apiService.generateBossBattle({ 
                    topic: levelContext.topic, 
                    chapter: Math.ceil(levelContext.level / LEVELS_PER_CHAPTER) 
                  })
                : await apiService.generateLevelQuestions({ 
                    topic: levelContext.topic, 
                    level: levelContext.level, 
                    totalLevels: levelContext.totalLevels 
                  });

            // Interactive check logic... (simplified for brevity, assume normal flow)
            
            let lessonData = {};
            if (!levelContext.isBoss) {
                lessonData = await apiService.generateLevelLesson({ 
                    topic: levelContext.topic, 
                    level: levelContext.level, 
                    totalLevels: levelContext.totalLevels, 
                    questions: questionsData.questions 
                });
            }

            return { ...questionsData, ...lessonData };
        })();

        // Race against a timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Generation timed out")), 45000)
        );

        const levelData = await Promise.race([fetchPromise, timeoutPromise]);

        // 3. Cache & Process
        levelCacheService.saveLevel(levelContext.topic, levelContext.level, levelData);
        processLevelData(levelData);

    } catch (error) {
        console.error("Level init error:", error);
        document.getElementById('loading-status-text').innerHTML = `
            <span style="color:var(--color-error)">Connection interrupted.</span><br>
            The neural link was unstable.
        `;
        const retryBtn = document.createElement('button');
        retryBtn.className = 'btn btn-primary';
        retryBtn.style.marginTop = '15px';
        retryBtn.textContent = 'Retry Connection';
        retryBtn.onclick = () => window.location.reload();
        document.getElementById('loading-text-container').appendChild(retryBtn);
        document.getElementById('cancel-generation-btn').style.display = 'none';
    }
}

function processLevelData(data) {
    if (data.lesson) {
        currentLesson = data.lesson;
        renderLesson();
        switchState('level-lesson-state');
    } else {
        // Direct to quiz (Boss or Interactive)
        startQuiz(data.questions || []); 
    }
    masterQuestionsList = data.questions || [];
}

function renderLesson() {
    elements.lessonTitle.textContent = `${levelContext.topic}: Level ${levelContext.level}`;
    elements.lessonBody.innerHTML = markdownService.render(currentLesson);
    // Initialize Mermaid diagrams if any
    if (window.mermaid) window.mermaid.init(undefined, document.querySelectorAll('.mermaid'));
}

// ... quiz logic ...
// ... result logic ...

function showResults(isInteractive = false, isAntiCheatForfeit = false) {
    // ... (same as before) ...
    // ensure removeAntiCheat is called
    if(antiCheatTimer) clearTimeout(antiCheatTimer);
    window.removeEventListener('blur', handleWindowBlur);
    
    let passed = false;
    let totalQuestions = 1;
    
    if (isInteractive) {
        passed = score === 1;
        totalQuestions = 1;
    } else {
        totalQuestions = currentQuestions.length;
        const scorePercent = totalQuestions > 0 ? (score / totalQuestions) : 0;
        passed = scorePercent >= PASS_THRESHOLD;
    }
    
    if (isAntiCheatForfeit) passed = false;

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
             gamificationService.incrementStat('bossBattlesWon', 1);
        } else {
             elements.resultsTitle.textContent = `Level ${levelContext.level} Complete!`;
             elements.resultsDetails.textContent = isInteractive ? 'Challenge Mastered!' : `You scored ${score} out of ${totalQuestions}.`;
        }
        
        elements.resultsActions.innerHTML = `<a href="#/game/${encodeURIComponent(levelContext.topic)}" class="btn btn-primary">Continue Journey</a> ${reviewBtnHTML}`;
        
        const journey = learningPathService.getJourneyById(levelContext.journeyId);
        if (journey && journey.currentLevel === levelContext.level) learningPathService.completeLevel(levelContext.journeyId);

        // Simple confetti effect (optional placeholder)
        // fireConfetti(); 
        
        // Preload next level logic
        const nextLvl = levelContext.level + 1;
        if (nextLvl <= levelContext.totalLevels) {
             apiService.generateLevelQuestions({ 
                topic: levelContext.topic, 
                level: nextLvl, 
                totalLevels: levelContext.totalLevels 
            }).then(q => {
                apiService.generateLevelLesson({
                    topic: levelContext.topic,
                    level: nextLvl,
                    totalLevels: levelContext.totalLevels,
                    questions: q.questions
                }).then(l => {
                    levelCacheService.saveLevel(levelContext.topic, nextLvl, { ...q, ...l });
                });
            }).catch(() => {});
        }

    } else {
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
            retryBtn.onclick = () => {
                if (canInstantRetry) {
                    currentAttemptSet++;
                    startQuiz(masterQuestionsList); // Uses next set of questions
                } else {
                    window.location.reload();
                }
            };
        }
    }
    
    if (document.getElementById('review-answers-btn')) {
        document.getElementById('review-answers-btn').addEventListener('click', () => {
             stateService.setNavigationContext({
                topic: levelContext.topic,
                level: levelContext.level,
                questions: currentQuestions,
                userAnswers: userAnswers
            });
            window.location.hash = '#/review';
        });
    }
    switchState('level-results-state');
}

// ... other functions ...

// --- Start Quiz (Simplified) ---
function startQuiz(allQuestions) {
    if (levelContext.isBoss) {
        currentQuestions = allQuestions; 
    } else {
        const start = currentAttemptSet * STANDARD_QUESTIONS_PER_ATTEMPT;
        currentQuestions = allQuestions.slice(start, start + STANDARD_QUESTIONS_PER_ATTEMPT);
    }
    
    if (currentQuestions.length === 0) {
        // Fallback if we ran out of questions
        window.location.reload();
        return;
    }

    userAnswers = new Array(currentQuestions.length).fill(undefined);
    score = 0;
    // ... setup timer, UI, etc ...
    switchState('level-quiz-state');
    // ... load first question ...
}

// --- Lifecycle ---

export function init() {
    const { navigationContext } = stateService.getState();
    levelContext = navigationContext;

    if (!levelContext || !levelContext.topic) {
        window.location.hash = '/topics';
        return;
    }

    elements = {
        lessonTitle: document.getElementById('lesson-title'),
        lessonBody: document.getElementById('lesson-body'),
        resultsTitle: document.getElementById('results-title'),
        resultsDetails: document.getElementById('results-details'),
        resultsIcon: document.getElementById('results-icon'),
        resultsActions: document.getElementById('results-actions'),
        xpGainText: document.getElementById('xp-gain-text'),
        // ... add other element refs as needed
    };

    document.getElementById('start-quiz-btn').addEventListener('click', () => {
        const cached = levelCacheService.getLevel(levelContext.topic, levelContext.level);
        if (cached && cached.questions) startQuiz(cached.questions);
    });
    
    document.getElementById('cancel-generation-btn').addEventListener('click', () => {
        window.history.back();
    });

    initializeLevel();
}

export function destroy() {
    if(timerInterval) clearInterval(timerInterval);
    if(antiCheatTimer) clearTimeout(antiCheatTimer);
    window.removeEventListener('blur', handleWindowBlur);
}

function handleWindowBlur() {
    // Anti-cheat logic implementation place holder
}
