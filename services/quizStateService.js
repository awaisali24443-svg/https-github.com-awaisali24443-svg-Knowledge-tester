// services/quizStateService.js

let quiz = {
    questions: [],
    userAnswers: [],
    currentQuestionIndex: 0,
    score: 0
};

export function startQuiz(quizData) {
    quiz = {
        questions: quizData.questions || [],
        userAnswers: new Array(quizData.questions.length).fill(null),
        currentQuestionIndex: 0,
        score: 0
    };
}

export function getCurrentQuestion() {
    if (quiz.questions.length === 0) return null;
    return quiz.questions[quiz.currentQuestionIndex];
}

export function answerQuestion(answerIndex) {
    if (quiz.userAnswers[quiz.currentQuestionIndex] !== null) {
        return; // Question already answered
    }

    quiz.userAnswers[quiz.currentQuestionIndex] = answerIndex;
    const currentQuestion = getCurrentQuestion();
    if (currentQuestion && answerIndex === currentQuestion.correctAnswerIndex) {
        quiz.score++;
    }
}

export function nextQuestion() {
    if (quiz.currentQuestionIndex < quiz.questions.length - 1) {
        quiz.currentQuestionIndex++;
        return true;
    }
    return false;
}

// FIX #23: Renamed for clarity
export function isLastQuestion() {
    return quiz.currentQuestionIndex >= quiz.questions.length - 1;
}

export function getQuizState() {
    return { ...quiz };
}

export function endQuiz() {
    // Reset state to prevent stale data on next quiz
    quiz = {
        questions: [],
        userAnswers: [],
        currentQuestionIndex: 0,
        score: 0
    };
}
