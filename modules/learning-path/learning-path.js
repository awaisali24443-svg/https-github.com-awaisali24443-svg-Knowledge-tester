import { getLearningPath, getProgressForPath } from '../../services/learningPathService.js';

let appStateRef;

function renderPath(pathId) {
    const path = getLearningPath(pathId);
    if (!path) {
        document.getElementById('path-steps-container').innerHTML = '<p>Learning path not found.</p>';
        return;
    }

    const progress = getProgressForPath(pathId);

    document.getElementById('path-title').textContent = path.name;
    document.getElementById('path-description').textContent = path.description;

    const stepsContainer = document.getElementById('path-steps-container');
    let currentStepFound = false;

    stepsContainer.innerHTML = path.steps.map((step, index) => {
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
            <div class="path-step ${stateClass}">
                <div class="step-marker">${isCompleted ? '✓' : index + 1}</div>
                <div class="step-content">
                    <h3>${step.name}</h3>
                    <button class="btn btn-primary start-quiz-btn" data-topic="${step.topic}" data-path-id="${path.id}" data-step-id="${step.id}" ${!isCurrent ? 'disabled' : ''}>
                        Start Quiz
                    </button>
                </div>
            </div>
        `;
    }).join('');

    stepsContainer.querySelectorAll('.start-quiz-btn').forEach(btn => {
        btn.addEventListener('click', handleStartQuiz);
    });
}

function handleStartQuiz(e) {
    const { topic, pathId, stepId } = e.target.dataset;
    
    // Pass both the quiz topic and the learning path context to the next module
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
    // For now, hardcode to the single available path.
    // A future 'paths' module would let the user choose.
    const pathId = "javascript-basics"; 
    
    // FIX #22: Handle empty state
    if (!getLearningPath(pathId)) {
        const container = document.getElementById('path-steps-container');
        if (container) {
            container.innerHTML = `
                <div class="card">
                    <h3>No Learning Paths Available</h3>
                    <p>Check back soon for guided learning journeys!</p>
                </div>
            `;
        }
        document.getElementById('path-title').textContent = "Learning Paths";
        document.getElementById('path-description').textContent = "No paths found.";
        return;
    }

    renderPath(pathId);
}

export function destroy() {
    console.log("Learning Path module destroyed.");
}
