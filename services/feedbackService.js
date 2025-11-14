const FEEDBACK_KEY = 'knowledge-tester-feedback';

let feedbackData = {};

/**
 * Loads feedback data from localStorage.
 * @private
 */
function loadFeedback() {
    try {
        const stored = localStorage.getItem(FEEDBACK_KEY);
        feedbackData = stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error("Failed to load feedback data:", e);
        feedbackData = {};
    }
}

/**
 * Saves the current feedback data to localStorage.
 * @private
 */
function saveFeedback() {
    try {
        localStorage.setItem(FEEDBACK_KEY, JSON.stringify(feedbackData));
    } catch (e) {
        console.error("Failed to save feedback data:", e);
    }
}

// Load feedback data when the module is initialized.
loadFeedback();

/**
 * Records user feedback for a specific question.
 * @param {string} questionId - The unique ID of the question.
 * @param {'good' | 'bad'} feedback - The feedback value.
 */
export function addFeedback(questionId, feedback) {
    feedbackData[questionId] = feedback;
    saveFeedback();
}

/**
 * Retrieves the feedback for a specific question.
 * @param {string} questionId - The unique ID of the question.
 * @returns {string | null} The feedback ('good' or 'bad'), or null if none exists.
 */
export function getFeedback(questionId) {
    return feedbackData[questionId] || null;
}