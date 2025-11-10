import { generateQuiz } from '../../services/geminiService.js';
import { NUM_QUESTIONS } from '../../constants.js';

const messages = [
    "Contacting AI Oracle...",
    "Compiling Knowledge Matrix...",
    "Reticulating Splines...",
    "Generating Question Constructs...",
    "Finalizing Explanations...",
    "Almost there..."
];

let messageInterval;

async function startQuizGeneration(appState) {
    const statusEl = document.getElementById('loading-status');
    const errorContainer = document.getElementById('error-message-container');
    const errorText = errorContainer.querySelector('.error-text');
    const loadingText = document.querySelector('.loading-text');

    let messageIndex = 0;
    statusEl.textContent = messages[messageIndex];
    messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % messages.length;
        statusEl.textContent = messages[messageIndex];
    }, 2500);

    try {
        const topic = appState.context?.topic || "a random interesting topic";
        const quizData = await generateQuiz(topic, NUM_QUESTIONS);

        // Pass the generated data to the next module
        appState.context = { quizData };
        window.location.hash = '#quiz';

    } catch (error) {
        console.error("Failed to generate quiz:", error);
        loadingText.style.display = 'none';
        errorText.textContent = `Error: ${error.message}`;
        errorContainer.style.display = 'block';
    }
}


export function init(appState) {
    console.log("Loading module initialized.");
    startQuizGeneration(appState);
}

export function destroy() {
    clearInterval(messageInterval);
    console.log("Loading module destroyed.");
}