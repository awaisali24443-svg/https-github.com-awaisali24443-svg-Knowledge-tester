import { getLearningPath, getProgressForPath } from '../../services/learningPathService.js';
import { initializeCardGlow } from '../../global/global.js';

let appStateRef;
let container;

function renderPath(pathId) {
    const path = getLearningPath(pathId);
    if (!path) {
        if(container) container.innerHTML = '<p class="card">Learning path not found. It may have been deleted.</p>';
        document.getElementById('path-title').textContent = "Path Not Found";
        document.getElementById('path-description').textContent = "Please generate a new path.";
        return;
    }

    const progress = getProgressForPath(pathId);

    document.getElementById('path-title').textContent = path.name;
    document.getElementById('path-description').textContent = path.description;

    let currentStepFound = false;

    container.innerHTML = path.steps.map((step, index) => {
        let stateClass = 'locked';
        let isCurrent = false;

        const isCompleted = progress.completedSteps.includes(step.id);

        if (isCompleted) {
            stateClass = 'completed';
        } else if (!currentStepFound) {
            stateClass = 'current';
            isCurrent = true;
            currentStepFound = true;
        }

        return `
            <div class="path-step ${stateClass} stagger-in" style="animation-delay: ${index * 100}ms;">
                <div class="step-marker">${isCompleted ? '✓' : index + 1}</div>
                <div class="step-content card">
                    <h3>${step.name}</h3>
                    <button class="btn btn-primary start-quiz-btn" data-topic="${step.topic}" data-path-id="${path.id}" data-step-id="${step.id}" ${!isCurrent ? 'disabled' : ''}>
                        Start Quiz
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.start-quiz-btn').forEach(btn => {
        btn.addEventListener('click', handleStartQuiz);
    });
    
    initializeCardGlow();
}

function handleStartQuiz(e) {
    const { topic, pathId, stepId } = e.target.dataset;
    
    appStateRef.context = { 
        topic,
        learningPathContext: {
            pathId,
            stepId
        }
    };
    window.location.hash = '#loading';
}

export function init(appState) {
    appStateRef = appState;
    container = document.getElementById('path-steps-container');
    const pathId = appState.context.params?.pathId;

    if (!pathId) {
        if(container) container.innerHTML = `
            <div class="card">
                <h3>Invalid Path</h3>
                <p>No learning path was specified. Please generate one from the Explore page.</p>
                <a href="#paths" class="btn">Generate a Path</a>
            </div>
        `;
        return;
    }

    renderPath(pathId);
}

export function destroy() {
    console.log("Learning Path module destroyed.");
    appStateRef = null;
    container = null;
}