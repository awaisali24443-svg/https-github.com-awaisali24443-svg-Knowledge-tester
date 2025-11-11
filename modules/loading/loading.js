
import { generateQuiz } from '../../services/geminiService.js';
import { NUM_QUESTIONS } from '../../constants.js';

const messages = [
    "Engaging AI Core...",
    "Calibrating Neural Net...",
    "Compiling Quiz Matrix...",
    "Injecting Knowledge Vectors...",
    "Finalizing Question Constructs...",
    "Boot Sequence Complete..."
];

let messageInterval;
let isCancelled = false;

async function startQuizGeneration(appState) {
    const statusEl = document.getElementById('loading-status');
    const errorContainer = document.getElementById('error-message-container');
    const errorText = errorContainer.querySelector('.error-text');
    const loadingText = document.querySelector('.loading-text');
    const cancelBtn = document.getElementById('cancel-btn');

    // Show cancel button after a delay
    const cancelTimeout = setTimeout(() => {
        if(cancelBtn) cancelBtn.style.display = 'inline-flex';
    }, 5000);

    let messageIndex = 0;
    statusEl.textContent = messages[messageIndex];
    messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % messages.length;
        statusEl.textContent = messages[messageIndex];
    }, 2500);

    try {
        const topic = appState.context?.topic || "a random interesting topic";
        const topicId = appState.context?.topicId; // Get ID for curated topics
        const quizData = await generateQuiz(topic, topicId, NUM_QUESTIONS);
        
        if (isCancelled) return; // Don't navigate if user cancelled while waiting

        // Pass the generated data to the next module
        appState.context = { quizData };
        window.location.hash = '#quiz';

    } catch (error) {
        if (isCancelled) return;
        
        console.error("Failed to generate quiz:", error);
        loadingText.style.display = 'none';
        cancelBtn.style.display = 'none';

        let userFriendlyError = "An unexpected error occurred.";
        if (error.message.toLowerCase().includes('safety')) {
            userFriendlyError = "The topic was blocked for safety reasons. Please choose another one.";
        } else if (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('fetch')) {
            userFriendlyError = "Could not connect to the AI service. Please check your network connection.";
        } else if (error.message.includes("malformed question")){
            userFriendlyError = "The AI generated an invalid quiz. Please try a slightly different topic."
        } else if (error.message) {
            userFriendlyError = error.message;
        }
        
        errorText.textContent = userFriendlyError;
        errorContainer.style.display = 'block';
    } finally {
        clearTimeout(cancelTimeout); // Clean up timeout
    }
}

function handleCancel() {
    isCancelled = true;
    window.location.hash = '#custom-quiz';
}

export function init(appState) {
    isCancelled = false;
    document.getElementById('cancel-btn').addEventListener('click', handleCancel);
    startQuizGeneration(appState);
    console.log("Loading module initialized.");
}

export function destroy() {
    clearInterval(messageInterval);
    isCancelled = true; // Mark as cancelled on navigation
    const cancelBtn = document.getElementById('cancel-btn');
    if(cancelBtn) {
        cancelBtn.removeEventListener('click', handleCancel);
    }
    console.log("Loading module destroyed.");
}
