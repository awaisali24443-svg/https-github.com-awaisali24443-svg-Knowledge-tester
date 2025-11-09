// This service now acts as a client for our own server-side Gemini API proxy.

/**
 * A generic fetch handler for our API proxy.
 * @param {string} type - The type of generation to perform (e.g., 'quiz', 'path').
 * @param {object} payload - The data needed for the generation.
 * @returns {Promise<any>} The JSON response from the server.
 */
async function fetchFromProxy(type, payload) {
    try {
        const response = await fetch('/api/gemini/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, payload })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `API request failed with status ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error fetching from proxy for type '${type}':`, error);
        throw error;
    }
}

/**
 * Generates a quiz by calling our server-side proxy.
 * @param {string} prompt - The prompt detailing the quiz requirements.
 * @returns {Promise<Array<object>>} A promise that resolves to the quiz data.
 */
export async function generateQuiz(prompt) {
    try {
        const quizData = await fetchFromProxy('quiz', { prompt });
        if (!Array.isArray(quizData) || quizData.length === 0) {
            throw new Error("Generated quiz data is not a valid array.");
        }
        return quizData;
    } catch (error) {
        throw new Error("Failed to generate quiz. The AI might be busy or the topic is restricted. Please try again later.");
    }
}

/**
 * Generates a study guide as a stream of text chunks by calling our server-side proxy.
 * @param {string} prompt - The prompt for the study guide.
 * @returns {AsyncGenerator<string, void, unknown>} An async generator that yields text chunks.
 */
export async function* generateStudyGuideStream(prompt) {
    const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'study', payload: { prompt } })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate study guide.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        yield decoder.decode(value);
    }
}

/**
 * Generates flashcards from the content of a study guide by calling our server-side proxy.
 * @param {string} guideContent - The text content of the study guide.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of flashcard objects.
 */
export async function generateFlashcardsFromGuide(guideContent) {
    try {
        const flashcards = await fetchFromProxy('flashcards', { guideContent });
        if (!Array.isArray(flashcards)) {
            throw new Error("Generated flashcard data is not a valid array.");
        }
        return flashcards;
    } catch (error) {
        throw new Error("Failed to generate flashcards. The guide might be too short or complex.");
    }
}

/**
 * Generates a structured learning path based on a user's goal by calling our server-side proxy.
 * @param {string} goal - The user's learning objective.
 * @returns {Promise<object>} A promise that resolves to the learning path data.
 */
export async function generateLearningPath(goal) {
     try {
        const pathData = await fetchFromProxy('path', { goal });
        if (!pathData.title || !Array.isArray(pathData.steps) || pathData.steps.length === 0) {
            throw new Error("Invalid learning path format received from AI.");
        }
        return pathData;
    } catch (error) {
        throw new Error("Failed to generate a learning path. The AI might be busy or the topic is too complex. Please try a different goal.");
    }
}

/**
 * Creates a prompt for a "Nemesis Quiz" based on user's missed concepts.
 * @param {string} topicName - The name of the topic.
 * @param {string} missedConcepts - A comma-separated string of concepts the user struggled with.
 * @returns {string} The generated prompt string.
 */
export function generateNemesisQuiz(topicName, missedConcepts) {
    return `Generate a targeted quiz with 5 multiple-choice questions about "${topicName}". Focus specifically on these tricky concepts that the user has struggled with before: ${missedConcepts}. The questions should test understanding of these specific areas to help the user improve.`;
}