import { generateQuiz } from '../../services/geminiService.js';
import * as quizState from '../../services/quizStateService.js';

const loadingContainer = document.querySelector('.loading-container');
const spinnerWrapper = document.getElementById('spinner-wrapper');
const errorContainer = document.getElementById('error-container');
const loadingTextElement = document.getElementById('loading-text');
const topicTitleElement = document.getElementById('loading-topic-title');


const topicMessages = {
    'science': [
        "Calibrating the microscope...",
        "Mixing the perfect chemical solution for questions...",
        "Consulting with Nobel laureates...",
        "Splitting atoms for quiz data..."
    ],
    'biology': [
        "Sequencing the DNA of this quiz...",
        "Observing the subject in its natural habitat...",
        "Classifying questions into the right phylum..."
    ],
    'chemistry': [
        "Titrating the difficulty level...",
        "Bonding elements into challenging questions...",
        "Waiting for the reaction to complete..."
    ],
    'history': [
        "Dusting off ancient scrolls...",
        "Consulting the annals of time...",
        "Synchronizing with the historical timeline...",
        "Avoiding any temporal paradoxes..."
    ],
    'ancient rome': [
        "Consulting the Sibylline Books...",
        "Assembling the legions of trivia...",
        "Building the aqueducts of knowledge..."
    ],
    'programming': [
        "Compiling the code of knowledge...",
        "Debugging the final question...",
        "Querying the master database of syntax...",
        "Running lint checks on the answers..."
    ],
     'python': [
        "Wrangling data pythons for facts...",
        "Importing knowledge from the global scope...",
        "Avoiding indentation errors in your quiz..."
    ],
    'javascript': [
        "Awaiting promises from the knowledge server...",
        "Fetching trivia from the DOM of history...",
        "Running `npm install more-questions`..."
    ],
    'technology': [
        "Upgrading the trivia servers to quantum...",
        "Polishing the chrome on futuristic facts...",
        "Downloading data from the cloud..."
    ],
    'space and astronomy': [
        "Gazing through the cosmic telescope...",
        "Calculating orbital mechanics of trivia...",
        "Receiving data transmissions from deep space..."
    ],
    'default': [
        "Asking the silicon brain...", "Reticulating splines for maximum quizitude...",
        "Translating universal knowledge...", "Aligning the knowledge crystals...",
        "Constructing cognitive challenges...", "Sorting bytes of pure wisdom...",
        "Summoning the quiz spirits...", "Charging the neural networks...",
        "Engaging the AI's creative mode..."
    ]
};

let messageInterval;
let quizContext = {};

function showLoadingState() {
    if (topicTitleElement && quizContext.topicName) {
        topicTitleElement.textContent = `Forging your quiz on "${quizContext.topicName}"`;
    }
    spinnerWrapper.classList.remove('hidden');
    errorContainer.classList.add('hidden');
    startLoadingMessages();
}

function showErrorState(errorMessage) {
    clearInterval(messageInterval);
    spinnerWrapper.classList.add('hidden');
    errorContainer.classList.remove('hidden');

    const errorDetails = errorContainer.querySelector('#error-details');
    errorDetails.textContent = errorMessage;

    const tryAgainBtn = errorContainer.querySelector('#try-again-btn');
    const goBackBtn = errorContainer.querySelector('#go-back-btn');

    tryAgainBtn.onclick = () => {
        showLoadingState();
        startQuizGeneration();
    };

    goBackBtn.onclick = () => {
        window.location.hash = quizContext.returnHash || '#home';
    };
}

function startLoadingMessages() {
    if (!loadingTextElement) return;
    const topicName = quizContext.topicName?.toLowerCase();
    let messages = (topicName && topicMessages[topicName]) ? [...topicMessages[topicName]] : [...topicMessages.default];
    messages.sort(() => Math.random() - 0.5);

    let messageIndex = 0;
    loadingTextElement.textContent = messages[messageIndex];

    messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % messages.length;
        loadingTextElement.style.opacity = '0';
        setTimeout(() => {
            loadingTextElement.textContent = messages[messageIndex];
            loadingTextElement.style.opacity = '1';
        }, 300);
    }, 2500);
}

async function startQuizGeneration() {
    const topicPrompt = sessionStorage.getItem('quizTopicPrompt');
    if (!topicPrompt) {
        showErrorState('Something went wrong. The quiz topic was not found. Please select a topic again.');
        return;
    }

    try {
        const systemInstruction = `You are an AI quiz maker for "Knowledge Tester". Your goal is to make learning fun and engaging, so use a natural, human-like, conversational tone as if you're a friendly teacher or quiz host. Avoid robotic, academic language. Before finalizing, please re-read your questions to ensure they sound natural and conversational.`;
        const quizData = await generateQuiz(topicPrompt, systemInstruction);
        
        // **IMPROVEMENT**: Save directly to the robust quizStateService (localStorage)
        quizState.startNewQuizState(quizData, quizContext);
        
        // Clean up session storage now, as it's no longer needed for the quiz flow
        sessionStorage.removeItem('quizTopicPrompt');
        sessionStorage.removeItem('quizContext');
        
        window.location.hash = '#quiz';

    } catch (error) {
        console.error("Failed to generate quiz:", error);
        showErrorState(error.message || 'An unknown error occurred. Please try another topic.');
    }
}

function init() {
    const quizContextString = sessionStorage.getItem('quizContext');
    if (!quizContextString) {
        showErrorState("Could not initialize quiz. No context found.");
        return;
    }
    quizContext = JSON.parse(quizContextString);

    showLoadingState();
    startQuizGeneration();
}

// Cleanup interval when the user navigates away
window.addEventListener('hashchange', () => {
    if (messageInterval) clearInterval(messageInterval);
}, { once: true });

init();