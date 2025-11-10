import { playSound } from './soundService.js';
import * as quizState from './quizStateService.js';

/**
 * Saves the quiz context to session storage and navigates to the loading screen,
 * or starts a quiz directly if quiz data is provided.
 * @param {object} quizContext - The context object for the quiz.
 * @param {Array|null} existingQuizData - Optional. If provided, starts quiz with this data.
 */
export async function startQuizFlow(quizContext, existingQuizData = null) {
    if (!quizContext) {
        console.error("startQuizFlow called with invalid context:", quizContext);
        window.showToast("Cannot start quiz due to an internal error.", "error");
        return;
    }
    
    try {
        playSound('start');
        if (existingQuizData) {
            // If we're replaying a quiz from the library, load it directly
            quizState.startNewQuizState(existingQuizData, quizContext);
            window.location.hash = '#quiz';
        } else {
            // Otherwise, go to the loading screen to generate a new quiz
            if (!quizContext.prompt) {
                 console.error("startQuizFlow requires a prompt for new quiz generation.");
                 window.showToast("Cannot generate quiz due to a missing prompt.", "error");
                 return;
            }
            sessionStorage.setItem('quizContext', JSON.stringify(quizContext));
            window.location.hash = '#loading';
        }
    } catch (error) {
        console.error("Failed to save quiz context:", error);
        window.showToast("Could not prepare the quiz session.", "error");
    }
}