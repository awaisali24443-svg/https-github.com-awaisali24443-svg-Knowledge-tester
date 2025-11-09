import { getLearningPathById } from '../../services/learningPathService.js';
import { startQuizFlow } from '../../services/navigationService.js';
import { NUM_QUESTIONS, UNLOCK_SCORE } from '../../constants.js';
import { initModuleScene, cleanupModuleScene } from '../../services/moduleHelper.js';

let sceneManager;
let currentPathData = null;

function renderPath(pathData) {
    currentPathData = pathData;
    const { title, steps, currentStep } = pathData;

    // Update header
    document.getElementById('path-title').textContent = title;
    const progressPercentage = steps.length > 0 ? (currentStep / steps.length) * 100 : 0;
    document.getElementById('path-progress-bar').style.width = `${progressPercentage}%`;
    
    if (currentStep >= steps.length) {
         document.getElementById('path-progress-text').textContent = `Path Complete!`;
         document.getElementById('path-progress-bar').style.width = `100%`;
    } else {
         document.getElementById('path-progress-text').textContent = `Step ${currentStep + 1} of ${steps.length}`;
    }


    // Render steps
    const stepsContainer = document.getElementById('learning-path-steps-container');
    stepsContainer.innerHTML = steps.map((step, index) => {
        let status = 'locked';
        let icon = '🔒';
        if (index < currentStep) {
            status = 'completed';
            icon = '✅';
        } else if (index === currentStep) {
            status = 'current';
            icon = '▶️';
        }
        
        // Handle path completion view
        if (currentStep >= steps.length) {
            status = 'completed';
            icon = '✅';
        }

        return `
            <div class="path-step-card ${status}" data-step-index="${index}" data-topic="${step.title}">
                <div class="step-status-icon">${icon}</div>
                <div class="step-info">
                    <h3>${step.title}</h3>
                    <p>${step.description}</p>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listener to the current step
    const currentStepEl = document.querySelector('.path-step-card.current');
    currentStepEl?.addEventListener('click', handleStartStepQuiz);
}

async function handleStartStepQuiz(e) {
    const card = e.currentTarget;
    const topic = card.dataset.topic;
    const stepIndex = parseInt(card.dataset.stepIndex, 10);

    // Create a quiz context specifically for this learning path step
    const prompt = `Generate a quiz with ${NUM_QUESTIONS} multiple-choice questions about "${topic}". This is step ${stepIndex + 1} of a learning path, so the difficulty should be introductory.`;
    
    const quizContext = {
        topicName: topic,
        isLeveled: false, // Path progress is separate from topic levels
        prompt: prompt,
        generationType: 'quiz',
        returnHash: '#learning-path', // Return to this path view after the quiz
        learningPathInfo: { // Attach path info to the context
            pathId: currentPathData.id,
            stepIndex: stepIndex,
            totalSteps: currentPathData.steps.length
        }
    };
    
    await startQuizFlow(quizContext);
}


async function init() {
    const contextString = sessionStorage.getItem('moduleContext');
    if (!contextString) {
        window.showToast("Could not load learning path.", "error");
        window.location.hash = '#home';
        return;
    }

    try {
        const { pathId } = JSON.parse(contextString);
        const pathData = await getLearningPathById(pathId);
        if (pathData) {
            renderPath(pathData);
        } else {
            throw new Error("Learning path not found.");
        }
    } catch (error) {
        console.error("Error initializing learning path module:", error);
        window.showToast(error.message, "error");
        document.getElementById('learning-path-steps-container').innerHTML = `<p>Could not load the learning path. Please try again from the home screen.</p>`;
    }
    
    sceneManager = initModuleScene('.background-canvas', 'atomicStructure');
}

function cleanup() {
    sceneManager = cleanupModuleScene(sceneManager);
}

const observer = new MutationObserver((mutationsList, obs) => {
    if (!document.querySelector('.learning-path-view-container')) {
        cleanup();
        obs.disconnect();
    }
});
observer.observe(document.getElementById('root-container'), { childList: true, subtree: true });

init();
