import { GUEST_LIBRARY_KEY } from '../constants.js';
import { isGuest } from './authService.js';

async function getLibrary() {
    if (!isGuest()) {
        console.warn("Firebase library is disabled.");
        return [];
    }
    const libraryStr = localStorage.getItem(GUEST_LIBRARY_KEY);
    return libraryStr ? JSON.parse(libraryStr) : [];
}

async function saveLibrary(library) {
    if (isGuest()) {
        localStorage.setItem(GUEST_LIBRARY_KEY, JSON.stringify(library));
    }
}

export async function saveQuizToLibrary(quizData, quizContext) {
    const library = await getLibrary();
    const newEntry = {
        id: `lib_${Date.now()}`,
        savedAt: new Date().toISOString(),
        topic: quizContext.topicName,
        questionCount: quizData.length,
        quizData,
        quizContext
    };
    library.unshift(newEntry); // Add to the beginning
    await saveLibrary(library);
}

export async function getSavedQuizzes() {
    return await getLibrary();
}

export async function getQuizFromLibrary(quizId) {
    const library = await getLibrary();
    return library.find(q => q.id === quizId);
}

export async function deleteQuizFromLibrary(quizId) {
    let library = await getLibrary();
    library = library.filter(q => q.id !== quizId);
    await saveLibrary(library);
}