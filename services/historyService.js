import { LOCAL_STORAGE_KEYS } from '../constants.js';
import { showToast } from './toastService.js';
import * as gamificationService from './gamificationService.js';

let history = [];

/**
 * Loads the quiz history from localStorage.
 * @private
 */
function loadHistory() {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.HISTORY);
        history = stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Failed to load quiz history:", e);
        history = [];
    }
}

/**
 * Saves the current quiz history to localStorage.
 * @private
 */
function saveHistory() {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
        console.error("Failed to save quiz history:", e);
    }
}

/**
 * Initializes the history service by loading data from localStorage.
 * Should be called once on application startup.
 */
export function init() {
    loadHistory();
}

/**
 * Retrieves the entire history, sorted with the most recent attempts first.
 * @returns {Array<object>} A sorted array of history objects.
 */
export function getHistory() {
    return [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Retrieves the most recent history items.
 * @param {number} [count=3] - The number of items to retrieve.
 * @returns {Array<object>}
 */
export function getRecentHistory(count = 3) {
    return getHistory().slice(0, count);
}


/**
 * Adds a completed quiz attempt to the history.
 * @param {object} quizState - The final state object of the completed quiz.
 */
export function addQuizAttempt(quizState) {
    if (!quizState || !quizState.questions || quizState.questions.length === 0) {
        return;
    }

    const attemptId = `quiz_${quizState.startTime}`;

    if (history.some(attempt => attempt.id === attemptId)) return;

    const newAttempt = {
        id: attemptId,
        type: 'quiz',
        topic: quizState.topic,
        score: quizState.score,
        totalQuestions: quizState.questions.length,
        difficulty: quizState.difficulty || 'medium',
        date: new Date(quizState.endTime).toISOString(),
        xpGained: quizState.xpGained,
    };

    history.unshift(newAttempt);
    if (history.length > 50) history.pop();
    saveHistory();
    
    gamificationService.updateStatsOnQuizCompletion(newAttempt, getHistory());
}

/**
 * Adds a completed Aural Tutor session to the history.
 * @param {object} sessionData - Data about the conversation.
 */
export function addAuralSession(sessionData) {
    if (!sessionData || !sessionData.transcript || sessionData.transcript.length === 0) return;

    const newSession = {
        id: `aural_${Date.now()}`,
        type: 'aural',
        topic: 'Aural Tutor Session',
        date: new Date().toISOString(),
        duration: sessionData.duration, // in seconds
        transcript: sessionData.transcript, // Array of {sender, text}
        xpGained: sessionData.xpGained || 0
    };

    history.unshift(newSession);
    if (history.length > 50) history.pop();
    saveHistory();
    
    if (newSession.xpGained > 0) {
        // Optionally trigger generic XP update if gamification service supports it directly
        // For now we just save it.
    }
}

/**
 * Clears all entries from the history.
 */
export function clearHistory() {
    history = [];
    saveHistory();
    showToast('History cleared.');
}