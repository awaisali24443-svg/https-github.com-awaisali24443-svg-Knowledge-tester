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
let quizGeneration; // To hold the promise and abort controller

async function startQuizGeneration(appState) {
    const statusEl = document.getElementById('loading-status');
    const errorContainer = document.getElementById('error-message-container');
    const errorText = errorContainer.querySelector('.error-text');
    const loadingText = document.querySelector('.loading-text');
    const tryAgainBtn = errorContainer.querySelector('.btn');
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
        quizGeneration = generateQuiz(topic, NUM_QUESTIONS);
        const quizData = await quizGeneration.promise;

        // Pass the generated data to the next module
        appState.context = { quizData };
        window.location.hash = '#quiz';

    } catch (error) {
        console.error("Failed to generate quiz:", error);
        loadingText.style.display = 'none';
        cancelBtn.style.display = 'none';

        // FIX #21: Provide more specific error messages
        let userFriendlyError = "An unexpected error occurred.";
        if (error.name === 'AbortError') {
             userFriendlyError = "The request was cancelled."
        } else if (error.message.toLowerCase().includes('safety')) {
            userFriendlyError = "The topic was blocked for safety reasons. Please choose another one.";
        } else if (error.message.toLowerCase().includes('failed to fetch')) {
            userFriendlyError = "Could not connect to the server. Please check your network connection.";
        } else if (error.message.includes("malformed question")){
            userFriendlyError = "The AI generated an invalid quiz. Please try a slightly different topic."
        }
        
        errorText.textContent = userFriendlyError;
        errorContainer.style.display = 'block';
    } finally {
        clearTimeout(cancelTimeout); // Clean up timeout
    }
}

function handleCancel() {
    if (quizGeneration && quizGeneration.abort) {
        quizGeneration.abort();
    }
    window.location.hash = '#custom-quiz';
}

export function init(appState) {
    document.getElementById('cancel-btn').addEventListener('click', handleCancel);
    startQuizGeneration(appState);
    console.log("Loading module initialized.");
}

export function destroy() {
    clearInterval(messageInterval);
    // If the user navigates away, cancel the ongoing request.
    if (quizGeneration && quizGeneration.abort) {
        quizGeneration.abort();
    }
    const cancelBtn = document.getElementById('cancel-btn');
    if(cancelBtn) {
        cancelBtn.removeEventListener('click', handleCancel);
    }
    console.log("Loading module destroyed.");
}