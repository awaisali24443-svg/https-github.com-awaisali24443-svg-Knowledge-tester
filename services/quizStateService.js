// services/quizStateService.js

let _quizData = null;
let _userAnswers = [];
let _currentQuestionIndex = 0;
let _score = 0;

export const quizStateService = {
    /**
     * Starts a new quiz.
     * @param {object} quizData - The quiz object from the Gemini API.
     */
    startQuiz(quizData) {
        _quizData = quizData;
        _userAnswers = new Array(quizData.questions.length).fill(null);
        _currentQuestionIndex = 0;
        _score = 0;
        console.log("Quiz state initialized:", _quizData);
    },

    /**
     * Gets the current question object.
     * @returns {object|null} The current question or null if quiz is not started.
     */
    getCurrentQuestion() {
        if (!_quizData) return null;
        return _quizData.questions[_currentQuestionIndex];
    },

    /**
     * Submits an answer for the current question and advances the state.
     * @param {number} answerIndex - The index of the user's selected option.
     * @returns {{isCorrect: boolean, correctAnswerIndex: number}} Feedback for the answer.
     */
    submitAnswer(answerIndex) {
        if (!_quizData) throw new Error("Quiz not started.");
        
        const currentQuestion = this.getCurrentQuestion();
        const correctAnswerIndex = currentQuestion.correctAnswerIndex;
        const isCorrect = answerIndex === correctAnswerIndex;

        _userAnswers[_currentQuestionIndex] = answerIndex;
        if (isCorrect) {
            _score++;
        }
        
        return { isCorrect, correctAnswerIndex };
    },

    /**
     * Moves to the next question.
     * @returns {boolean} True if there is a next question, false if the quiz is over.
     */
    nextQuestion() {
        if (_currentQuestionIndex < _quizData.questions.length - 1) {
            _currentQuestionIndex++;
            return true;
        }
        return false;
    },

    /**
     * Checks if the quiz is complete.
     * @returns {boolean}
     */
    isQuizOver() {
        return _currentQuestionIndex >= _quizData.questions.length -1;
    },

    /**
     * Gets the current progress of the quiz.
     * @returns {{current: number, total: number}}
     */
    getProgress() {
        if (!_quizData) return { current: 0, total: 0 };
        return {
            current: _currentQuestionIndex + 1,
            total: _quizData.questions.length
        };
    },

    /**
     * Gets the final results of the quiz.
     * @returns {{score: number, totalQuestions: number, quizData: object, userAnswers: Array<number>}}
     */
    getResults() {
        return {
            score: _score,
            totalQuestions: _quizData.questions.length,
            quizData: _quizData,
            userAnswers: _userAnswers
        };
    },

    /**
     * Resets the quiz state.
     */
    endQuiz() {
        _quizData = null;
        _userAnswers = [];
        _currentQuestionIndex = 0;
        _score = 0;
    }
};