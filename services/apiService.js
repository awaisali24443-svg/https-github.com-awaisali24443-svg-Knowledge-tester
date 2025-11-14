import { showToast } from './toastService.js';

/**
 * Handles the response from a fetch request.
 * Throws an error if the response is not ok.
 * @param {Response} response - The fetch response object.
 * @returns {Promise<object>} The JSON response data.
 * @throws {Error} If the API response is not ok.
 * @private
 */
async function handleResponse(response) {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred.', details: response.statusText }));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'API request failed');
    }
    return response.json();
}

/**
 * Fetches the list of quiz topics and categories.
 * @returns {Promise<Array<object>>} A promise that resolves to the topics data.
 * @throws {Error} If the fetch fails.
 */
export async function fetchTopics() {
    try {
        const response = await fetch('/api/topics');
        return await handleResponse(response);
    } catch (error) {
        showToast('Error fetching topics.', 'error');
        throw error;
    }
}

/**
 * Sends a request to the backend to generate a new quiz, potentially based on provided context.
 * @param {object} params - The quiz generation parameters.
 * @param {string} params.topic - The topic of the quiz.
 * @param {number} params.numQuestions - The number of questions for the quiz.
 * @param {string} params.difficulty - The difficulty level of the quiz.
 * @param {string} [params.learningContext] - Optional learning text to base the quiz on.
 * @returns {Promise<object>} A promise that resolves to the generated quiz data.
 * @throws {Error} If the quiz generation fails.
 */
export async function generateQuiz({ topic, numQuestions, difficulty, learningContext }) {
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, numQuestions, difficulty, learningContext })
        });
        return await handleResponse(response);
    } catch (error) {
        // The error will be handled by the loading module
        throw error;
    }
}

/**
 * Sends a request to the backend to generate a "synthesis package" for a topic.
 * @param {object} params - The parameters.
 * @param {string} params.topic - The topic to learn about.
 * @returns {Promise<object>} A promise that resolves to the generated learning content.
 * @throws {Error} If the generation fails.
 */
export async function generateSynthesis({ topic }) {
    try {
        const response = await fetch('/api/generate-synthesis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic })
        });
        return await handleResponse(response);
    } catch (error) {
        showToast(error.message || 'Failed to generate learning content.', 'error');
        throw error;
    }
}

/**
 * Sends a request to the backend to generate audio from text.
 * @param {object} params - The parameters.
 * @param {string} params.text - The text to convert to speech.
 * @returns {Promise<object>} A promise that resolves to the generated audio data.
 * @throws {Error} If the generation fails.
 */
export async function generateSpeech({ text }) {
     try {
        const response = await fetch('/api/generate-speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        return await handleResponse(response);
    } catch (error) {
        console.warn('Could not generate speech, proceeding without it.', error.message);
        throw error;
    }
}


/**
 * Sends a request to the backend to generate a new learning path.
 * @param {object} params - The learning path generation parameters.
 * @param {string} params.goal - The learning goal.
 * @returns {Promise<object>} A promise that resolves to the generated learning path data.
 * @throws {Error} If the generation fails.
 */
export async function generateLearningPath({ goal }) {
     try {
        const response = await fetch('/api/generate-path', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal })
        });
        return await handleResponse(response);
    } catch (error) {
        showToast(error.message || 'Failed to generate learning path.', 'error');
        throw error;
    }
}

/**
 * Sends the user's quiz history to the backend for analysis.
 * @param {Array<object>} history - The user's quiz history.
 * @returns {Promise<object>} A promise that resolves to the analysis (e.g., weak topics).
 * @throws {Error} If the analysis fails.
 */
export async function analyzePerformance(history) {
    try {
        const response = await fetch('/api/analyze-performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history })
        });
        return await handleResponse(response);
    } catch (error) {
        console.error('Performance analysis failed:', error.message);
        // Silently fail, don't show a toast. Let caller handle UI.
        throw error;
    }
}

/**
 * Sends a message to the Socratic chat endpoint.
 * @param {string} summary - The lesson summary for context.
 * @param {Array<object>} history - The current chat history.
 * @returns {Promise<object>} A promise that resolves to the AI's response.
 * @throws {Error} If the request fails.
 */
export async function sendSocraticMessage({ summary, history }) {
    try {
        const response = await fetch('/api/socratic-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ summary, history })
        });
        return await handleResponse(response);
    } catch (error) {
        // Let the Socratic module handle displaying the error
        throw error;
    }
}