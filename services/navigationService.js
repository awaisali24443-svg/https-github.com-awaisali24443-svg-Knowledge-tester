import { playSound } from './soundService.js';

/**
 * Saves the quiz context to session storage and navigates to the loading screen.
 * This centralizes the logic for starting any quiz or study guide generation.
 * @param {object} quizContext - The context object for the quiz.
 */
export async function startQuizFlow(quizContext) {
    if (!quizContext || !quizContext.prompt) {
        console.error("startQuizFlow called with invalid context:", quizContext);
        window.showToast("Cannot start quiz due to an internal error.", "error");
        return;
    }
    
    try {
        playSound('start');
        sessionStorage.setItem('quizContext', JSON.stringify(quizContext));
        window.location.hash = '#loading';
    } catch (error) {
        console.error("Failed to save quiz context:", error);
        window.showToast("Could not prepare the quiz session.", "error");
    }
}
