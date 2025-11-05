const QUIZ_STATE_KEY = 'quizInProgress';

/**
 * Initializes and saves the state for a brand new quiz.
 * This makes the quiz start process resilient to page reloads.
 * @param {Array} quizData - The array of question objects from the API.
 * @param {object} quizContext - The context (topic, level, etc.) for the quiz.
 */
export const startNewQuizState = (quizData, quizContext) => {
    const newState = {
        quizData,
        quizContext,
        currentQuestionIndex: 0,
        userAnswers: new Array(quizData.length).fill(null)
    };
    saveQuizState(newState);
};

export const saveQuizState = (state) => {
    try {
        const stateString = JSON.stringify(state);
        localStorage.setItem(QUIZ_STATE_KEY, stateString);
    } catch (e) {
        console.error("Could not save quiz state to localStorage", e);
    }
};

export const loadQuizState = () => {
    try {
        const stateString = localStorage.getItem(QUIZ_STATE_KEY);
        if (stateString === null) {
            return null;
        }
        return JSON.parse(stateString);
    } catch (e) {
        console.error("Could not load quiz state from localStorage", e);
        return null;
    }
};

export const clearQuizState = () => {
    try {
        localStorage.removeItem(QUIZ_STATE_KEY);
    } catch (e) {
        console.error("Could not clear quiz state from localStorage", e);
    }
};

export const hasSavedState = () => {
    return localStorage.getItem(QUIZ_STATE_KEY) !== null;
};