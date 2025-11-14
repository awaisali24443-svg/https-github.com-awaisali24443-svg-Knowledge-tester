import * as learningPathService from '../../services/learningPathService.js';
import * as apiService from '../../services/apiService.js';
import { showConfirmationModal } from '../../services/modalService.js';
import * as markdownService from '../../services/markdownService.js';

let appState;
let path;

// DOM Elements
let elements = {};

// State for the active step modal
let stepSession = {
    isActive: false,
    isReview: false,
    stepIndex: -1, // Represents either step index in flat path OR cluster index
    stage: 'loading', // 'loading', 'learn', 'quiz', 'results'
    learningContent: null,
    quizQuestions: [],
    currentQuestionIndex: 0,
    score: 0,
};

// --- Main Rendering ---

function renderPath() {
    elements.goalTitle.textContent = path.goal;
    const completedSteps = path.path.length === path.currentStep ? path.currentStep : path.currentStep;
    elements.progressSummary.textContent = `Progress: ${completedSteps} / ${path.path.length} steps completed`;
    
    elements.galaxyMap.innerHTML = '';
    let stepCounter = 0;
    let isPathLocked = false;

    path.clusters.forEach((cluster, clusterIndex) => {
        const clusterEl = elements.clusterTemplate.content.cloneNode(true);
        const clusterGroup = clusterEl.querySelector('.cluster-group');
        clusterGroup.querySelector('.cluster-title').textContent = cluster.name;
        const stepsContainer = clusterGroup.querySelector('.cluster-steps');

        if (isPathLocked) {
            clusterGroup.classList.add('locked');
        }

        cluster.steps.forEach((step) => {
            const stepNode = elements.stepNodeTemplate.content.cloneNode(true);
            const nodeEl = stepNode.querySelector('.step-node');
            const iconUse = nodeEl.querySelector('use');
            nodeEl.querySelector('.step-node-label').textContent = step.name;
            nodeEl.dataset.index = stepCounter;
            
            if (isPathLocked) {
                nodeEl.classList.add('locked');
                iconUse.setAttribute('href', '/assets/icons/feather-sprite.svg#lock');
            } else if (stepCounter < path.currentStep) {
                nodeEl.classList.add('completed');
                iconUse.setAttribute('href', '/assets/icons/feather-sprite.svg#check-circle');
            } else if (stepCounter === path.currentStep) {
                nodeEl.classList.add('current', 'start-step-btn');
                iconUse.setAttribute('href', '/assets/icons/feather-sprite.svg#target');
            } else {
                nodeEl.classList.add('locked');
                iconUse.setAttribute('href', '/assets/icons/feather-sprite.svg#lock');
            }
            stepsContainer.appendChild(stepNode);
            stepCounter++;
        });

        const reviewNode = elements.clusterReviewTemplate.content.cloneNode(true);
        const reviewEl = reviewNode.querySelector('.cluster-review-node');
        reviewEl.querySelector('.review-node-label').textContent = `Review: ${cluster.name}`;
        reviewEl.dataset.clusterIndex = clusterIndex;
        
        const allStepsInClusterDone = path.currentStep >= stepCounter;
        const reviewScore = path.clusterReviewScores?.[clusterIndex];
        const reviewPassed = reviewScore && (reviewScore.score / reviewScore.totalQuestions) >= 0.8;
        
        if (isPathLocked) {
            reviewEl.classList.add('locked');
        } else if (reviewPassed) {
            reviewEl.classList.add('completed');
        } else if (allStepsInClusterDone) {
            reviewEl.classList.add('current', 'start-cluster-review-btn');
            isPathLocked = true;
        } else {
            reviewEl.classList.add('locked');
        }
        stepsContainer.appendChild(reviewNode);
        elements.galaxyMap.appendChild(clusterEl);
    });
}


// --- Step Session Modal Logic ---

function resetStepSession() {
    stepSession = {
        isActive: false, isReview: false, stepIndex: -1, stage: 'loading',
        learningContent: null, quizQuestions: [], currentQuestionIndex: 0, score: 0
    };
}

function openModal(index, isReview) {
    resetStepSession();
    stepSession.isActive = true;
    stepSession.isReview = isReview;
    stepSession.stepIndex = index;

    elements.modalContainer.innerHTML = elements.stepModalTemplate.innerHTML;
    elements.modalContainer.classList.add('visible');
    
    elements.modalContainer.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    elements.modalContainer.querySelector('.step-modal-close-btn').addEventListener('click', closeModal);
    
    if (isReview) {
        loadQuizStage();
    } else {
        loadLearnStage();
    }
}

function closeModal() {
    elements.modalContainer.classList.remove('visible');
    elements.modalContainer.innerHTML = '';
    resetStepSession();
}

function setModalContent(title, html) {
    const modalTitle = elements.modalContainer.querySelector('#step-modal-title');
    const modalBody = elements.modalContainer.querySelector('#step-modal-body');
    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.innerHTML = html;
}

// --- Modal Stages ---

async function loadLearnStage() {
    stepSession.stage = 'loading';
    const step = path.path[stepSession.stepIndex];
    setModalContent(`Step ${stepSession.stepIndex + 1}: ${step.name}`, `
        <div class="modal-view-content loading">
            <p>The AI is preparing your lesson...</p>
            <div class="spinner"></div>
        </div>
    `);

    try {
        stepSession.learningContent = await apiService.generateLearningContent({ topic: step.topic });
        stepSession.stage = 'learn';
        const contentHtml = `
            <div class="modal-view-content learn-view">
                ${markdownService.render(stepSession.learningContent.summary)}
                <div class="learn-view-footer">
                    <button class="btn" id="ask-tutor-btn">
                        <svg class="icon"><use href="/assets/icons/feather-sprite.svg#mic"/></svg>
                        <span>Ask the Tutor</span>
                    </button>
                    <button class="btn btn-primary" id="ready-for-quiz-btn">I'm Ready for the Quiz!</button>
                </div>
            </div>
        `;
        setModalContent(stepSession.learningContent.title, contentHtml);
        elements.modalContainer.querySelector('#ready-for-quiz-btn').addEventListener('click', () => loadQuizStage());
        elements.modalContainer.querySelector('#ask-tutor-btn').addEventListener('click', () => {
            appState.context.auralContext = {
                from: `learning-path/${path.id}`,
                systemInstruction: `You are an expert AI tutor helping a user with the topic: "${step.name}". The user has just read a lesson about it. Be ready to answer specific questions they might have.`
            };
            window.location.hash = '/aural';
            closeModal();
        });

    } catch (error) {
        setModalContent('Error', `<p>Could not load learning content. Please try again.</p>`);
    }
}

async function loadQuizStage() {
    stepSession.stage = 'loading';
    const title = stepSession.isReview 
        ? `Review: ${path.clusters[stepSession.stepIndex].name}` 
        : `Quiz: ${path.path[stepSession.stepIndex].name}`;

    setModalContent(title, `
        <div class="modal-view-content loading">
            <p>The AI is crafting your questions...</p>
            <div class="spinner"></div>
        </div>
    `);

    try {
        let topic, numQuestions, difficulty, learningContext;
        if (stepSession.isReview) {
            const cluster = path.clusters[stepSession.stepIndex];
            topic = `A review quiz for the topic: ${cluster.name}`;
            numQuestions = Math.max(5, cluster.steps.length * 2);
            difficulty = 'hard';
            learningContext = (await Promise.all(
                cluster.steps.map(step => apiService.generateLearningContent({ topic: step.topic }))
            )).map(content => content.summary).join(' \n\n ');
        } else {
            const step = path.path[stepSession.stepIndex];
            topic = step.topic;
            numQuestions = 5;
            difficulty = 'medium';
            learningContext = stepSession.learningContent.summary;
        }

        const quizData = await apiService.generateQuiz({ topic, numQuestions, difficulty, learningContext });
        stepSession.quizQuestions = quizData.questions;
        stepSession.stage = 'quiz';
        renderQuizQuestion();
    } catch (error) {
        setModalContent('Error', `<p>Could not generate the quiz. Please try again.</p>`);
    }
}

function renderQuizQuestion() {
    const question = stepSession.quizQuestions[stepSession.currentQuestionIndex];
    const questionHtml = `
        <div class="modal-view-content quiz-view">
            <h3 class="step-quiz-question">${stepSession.currentQuestionIndex + 1}. ${question.question}</h3>
            <div class="step-quiz-options">
                ${question.options.map((opt, i) => `<button class="btn step-quiz-option-btn" data-index="${i}">${opt}</button>`).join('')}
            </div>
            <div class="step-quiz-feedback" style="display: none;"></div>
        </div>
    `;
    setModalContent(`Question ${stepSession.currentQuestionIndex + 1} of ${stepSession.quizQuestions.length}`, questionHtml);
    elements.modalContainer.querySelector('.step-quiz-options').addEventListener('click', handleQuizAnswer);
}

function handleQuizAnswer(event) {
    const button = event.target.closest('.step-quiz-option-btn');
    if (!button || button.disabled) return;

    const selectedIndex = parseInt(button.dataset.index, 10);
    const question = stepSession.quizQuestions[stepSession.currentQuestionIndex];
    const isCorrect = selectedIndex === question.correctAnswerIndex;

    if (isCorrect) stepSession.score++;

    const optionButtons = elements.modalContainer.querySelectorAll('.step-quiz-option-btn');
    optionButtons.forEach(btn => {
        const index = parseInt(btn.dataset.index, 10);
        if (index === question.correctAnswerIndex) btn.classList.add('correct');
        else if (index === selectedIndex) btn.classList.add('incorrect');
        btn.disabled = true;
    });

    const feedbackContainer = elements.modalContainer.querySelector('.step-quiz-feedback');
    const isLastQuestion = stepSession.currentQuestionIndex === stepSession.quizQuestions.length - 1;
    feedbackContainer.innerHTML = `
        <p>${question.explanation}</p>
        <button class="btn btn-primary" id="next-quiz-btn">${isLastQuestion ? 'Finish' : 'Next Question'}</button>
    `;
    feedbackContainer.style.display = 'block';
    elements.modalContainer.querySelector('#next-quiz-btn').addEventListener('click', () => {
        if (isLastQuestion) {
            loadResultsStage();
        } else {
            stepSession.currentQuestionIndex++;
            renderQuizQuestion();
        }
    });
}

function loadResultsStage() {
    stepSession.stage = 'results';
    const passThreshold = 0.8;
    const scoreRatio = stepSession.score / stepSession.quizQuestions.length;
    const hasPassed = scoreRatio >= passThreshold;
    
    let resultsHtml = `
        <div class="modal-view-content step-results-view">
            <h3>${hasPassed ? 'Passed!' : 'Keep Trying!'}</h3>
            <p>You answered ${stepSession.score} out of ${stepSession.quizQuestions.length} questions correctly.</p>
            ${!hasPassed && stepSession.isReview ? '<p>You must score at least 80% to unlock the next cluster.</p>' : ''}
            <div class="btn-group">
                ${hasPassed 
                    ? `<button class="btn btn-primary" id="complete-step-btn">Continue</button>`
                    : `<button class="btn" id="retry-step-btn">Try Again</button>
                       <button class="btn" id="return-to-path-btn">Return to Path</button>`
                }
            </div>
        </div>
    `;
    setModalContent('Results', resultsHtml);
    
    if(hasPassed) {
        if (stepSession.isReview) {
            learningPathService.recordClusterReviewScore(path.id, stepSession.stepIndex, stepSession.score, stepSession.quizQuestions.length);
        } else {
            learningPathService.recordStepScore(path.id, stepSession.stepIndex, stepSession.score, stepSession.quizQuestions.length);
        }
        elements.modalContainer.querySelector('#complete-step-btn').addEventListener('click', () => {
            if (!stepSession.isReview) {
                learningPathService.completeStep(path.id);
            }
            closeModal();
            path = learningPathService.getPathById(path.id); // Re-fetch path to get updated scores
            renderPath();
        });
    } else {
        elements.modalContainer.querySelector('#retry-step-btn').addEventListener('click', () => {
            openModal(stepSession.stepIndex, stepSession.isReview);
        });
        elements.modalContainer.querySelector('#return-to-path-btn').addEventListener('click', closeModal);
    }
}

// --- Event Handlers & Init ---

async function handleDeletePath() {
    const confirmed = await showConfirmationModal({
        title: 'Delete Learning Path',
        message: `Are you sure you want to permanently delete the path for "${path.goal}"? This action cannot be undone.`,
        confirmText: 'Yes, Delete Path'
    });
    if (confirmed) {
        learningPathService.deletePath(path.id);
        window.location.hash = '/profile';
    }
}

function handleClick(event) {
    const stepBtn = event.target.closest('.start-step-btn');
    if (stepBtn) {
        const stepIndex = parseInt(stepBtn.dataset.index, 10);
        openModal(stepIndex, false);
    }

    const reviewBtn = event.target.closest('.start-cluster-review-btn');
    if (reviewBtn) {
        const clusterIndex = parseInt(reviewBtn.dataset.clusterIndex, 10);
        openModal(clusterIndex, true);
    }
}

export function init(globalState) {
    appState = globalState;
    const pathId = appState.context.params.id;
    path = learningPathService.getPathById(pathId);

    if (!path) {
        window.location.hash = '/topics';
        return;
    }

    elements = {
        goalTitle: document.getElementById('path-goal-title'),
        progressSummary: document.getElementById('path-progress-summary'),
        galaxyMap: document.getElementById('galaxy-map'),
        deleteBtn: document.getElementById('delete-path-btn'),
        clusterTemplate: document.getElementById('cluster-template'),
        stepNodeTemplate: document.getElementById('step-node-template'),
        clusterReviewTemplate: document.getElementById('cluster-review-template'),
        modalContainer: document.getElementById('step-modal-container'),
        stepModalTemplate: document.getElementById('step-modal-template').content,
    };

    renderPath();

    elements.galaxyMap.addEventListener('click', handleClick);
    elements.deleteBtn.addEventListener('click', handleDeletePath);
}

export function destroy() {
    if (stepSession.isActive) {
        closeModal();
    }
    if (elements.galaxyMap) {
       elements.galaxyMap.removeEventListener('click', handleClick);
    }
    if (elements.deleteBtn) {
        elements.deleteBtn.removeEventListener('click', handleDeletePath);
    }
}