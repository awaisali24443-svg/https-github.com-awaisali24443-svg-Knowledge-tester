import { LIBRARY_KEY_GUEST } from '../constants.js';

let savedQuestions = [];

// A simple hashing function for more robust duplicate checking
function hashQuestion(question) {
    const str = `${question.question}|${question.options.join(',')}|${question.correctAnswerIndex}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}


function loadLibrary() {
    // FIX #6: Prepare for authenticated users by separating guest logic.
    // FIX #7: Wrap localStorage access in try...catch.
    try {
        const storedLibrary = localStorage.getItem(LIBRARY_KEY_GUEST);
        if (storedLibrary) {
            savedQuestions = JSON.parse(storedLibrary);
        } else {
            savedQuestions = [];
        }
    } catch (error) {
        console.warn("Could not access localStorage for library.", error);
        savedQuestions = [];
    }
}

function saveLibrary() {
    try {
        localStorage.setItem(LIBRARY_KEY_GUEST, JSON.stringify(savedQuestions));
    } catch (error) {
        console.warn("Could not save library to localStorage.", error);
    }
}

export function getSavedQuestions() {
    return [...savedQuestions];
}

export function saveQuestion(question) {
    if (!isQuestionSaved(question)) {
        savedQuestions.push(question);
        saveLibrary();
        return true;
    }
    return false;
}

export function removeQuestion(questionToRemove) {
    const hashToRemove = hashQuestion(questionToRemove);
    savedQuestions = savedQuestions.filter(q => hashQuestion(q) !== hashToRemove);
    saveLibrary();
}

export function isQuestionSaved(question) {
    const newQuestionHash = hashQuestion(question);
    // FIX #16: Use hash for more robust duplicate checking
    return savedQuestions.some(savedQ => hashQuestion(savedQ) === newQuestionHash);
}

// Initialize library on load
loadLibrary();
