import { GUEST_LIBRARY_KEY } from '../constants.js';

function getLibrary() {
    // FIX #7: Wrap localStorage access
    try {
        const saved = localStorage.getItem(GUEST_LIBRARY_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.warn("Could not access library from localStorage.", error);
        return [];
    }
}

function saveLibrary(library) {
     // FIX #7: Wrap localStorage access
    try {
        localStorage.setItem(GUEST_LIBRARY_KEY, JSON.stringify(library));
    } catch (error) {
        console.warn("Could not save library to localStorage.", error);
    }
}

export const libraryService = {
    getSavedQuestions() {
        return getLibrary();
    },

    saveQuestion(questionData) {
        const library = getLibrary();
        // Avoid duplicates
        if (!library.some(q => q.question === questionData.question)) {
            library.push(questionData);
            saveLibrary(library);
            return true;
        }
        return false;
    },

    removeQuestion(questionText) {
        let library = getLibrary();
        library = library.filter(q => q.question !== questionText);
        saveLibrary(library);
    }
};