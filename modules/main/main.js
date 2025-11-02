
import { GoogleGenAI, Type } from "https://aistudiocdn.com/@google/genai@^1.28.0";

// --- Constants ---
const NUM_QUESTIONS = 5;
const API_KEY = process.env.API_KEY;

// --- State ---
let quizData = null;
let userAnswers = [];
let currentQuestionIndex = 0;

// --- DOM Elements ---
const views = {
    loading: document.getElementById('loading-view'),
    quiz: document.getElementById('quiz-view'),
    results: document.getElementById('results-view'),
};
const quizContainer = document.getElementById('quiz-container');

// --- Gemini API Service ---
async function generateQuiz(topic) {
    if (!API_KEY) {
        throw new Error("API_KEY environment variable is not set.");
    }
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const quizSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswerIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING }
            },
            required: ['question', 'options', 'correctAnswerIndex', 'explanation'],
        }
    };

    const prompt = `Generate a fun and challenging quiz with ${NUM_QUESTIONS} multiple-choice questions about "${topic}". Each question must have exactly 4 options. Provide a brief explanation for each correct answer.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: quizSchema,
            },
        });
        const jsonText = response.text.trim();
        const data = JSON.parse(jsonText);
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Invalid quiz data format from API.");
        }
        return data;
    } catch (error) {
        console.error("Error generating quiz with Gemini:", error);
        throw new Error("Failed to generate quiz. The topic might be too specific or there was a network issue. Please try another topic.");
    }
}

// --- UI Rendering ---

function updateView(currentView) {
    Object.entries(views).forEach(([key, view]) => {
        if (view) {
            view.classList.toggle('hidden', key !== currentView);
        }
    });
}

function renderQuiz() {
    const question = quizData[currentQuestionIndex];
    const optionsHtml = question.options.map((option, index) =>
        `<button data-option-index="${index}" class="quiz-option">${option}</button>`
    ).join('');

    views.quiz.innerHTML = `
        <div class="progress-bar-container">
            <div class="progress-bar">
                <div class="progress-bar-inner" style="width: ${((currentQuestionIndex + 1) / NUM_QUESTIONS) * 100}%"></div>
            </div>
        </div>
        <div class="question-header">
            <span>Question ${currentQuestionIndex + 1} / ${NUM_QUESTIONS}</span>
        </div>
        <h3 class="question-text">${question.question}</h3>
        <div class="options-grid">${optionsHtml}</div>
        <div id="quiz-feedback"></div>
    `;

    document.querySelectorAll('.quiz-option').forEach(button => {
        button.addEventListener('click', handleAnswerSelect);
    });
}

function renderResults() {
    const score = userAnswers.reduce((acc, answer, index) =>
        (answer === quizData[index].correctAnswerIndex ? acc + 1 : acc), 0
    );
    const scorePercentage = Math.round((score / quizData.length) * 100);

    const getResultColor = () => {
        if (scorePercentage >= 80) return 'score-green';
        if (scorePercentage >= 50) return 'score-yellow';
        return 'score-red';
    };

    const questionsReviewHtml = quizData.map((question, index) => {
        const userAnswer = userAnswers[index];
        const optionsHtml = question.options.map((option, optIndex) => {
            let itemClass = '';
            if (optIndex === question.correctAnswerIndex) itemClass = 'review-correct';
            else if (optIndex === userAnswer) itemClass = 'review-incorrect';
            return `<div class="review-option ${itemClass}">${option}</div>`;
        }).join('');
        
        return `
            <div class="review-item">
                <h4 class="review-question">${index + 1}. ${question.question}</h4>
                <div class="review-options">${optionsHtml}</div>
                <p class="review-explanation"><strong>Explanation:</strong> ${question.explanation}</p>
            </div>
        `;
    }).join('');

    views.results.innerHTML = `
        <h2 class="results-title">Quiz Complete!</h2>
        <p class="results-score ${getResultColor()}">${score} / ${quizData.length}</p>
        <p class="results-summary">That's ${scorePercentage}%!</p>
        <div class="review-container">${questionsReviewHtml}</div>
        <button id="restart-btn" class="btn btn-primary">Try Another Quiz</button>
    `;

    document.getElementById('restart-btn').addEventListener('click', () => {
        window.location.hash = '#guest';
    });
}

function renderError(message) {
    if (quizContainer) {
        quizContainer.innerHTML = `
            <div style="text-align: center;">
                <h2 style="color:var(--color-danger); margin-bottom: 1rem;">Oops! Something went wrong.</h2>
                <p style="color:var(--color-text-muted); margin-bottom: 2rem;">${message}</p>
                <a href="#guest" class="btn btn-primary">Try a Different Topic</a>
            </div>
        `;
    }
}

// --- Event Handlers ---

function handleAnswerSelect(e) {
    const selectedButton = e.currentTarget;
    const selectedAnswerIndex = parseInt(selectedButton.dataset.optionIndex, 10);
    userAnswers[currentQuestionIndex] = selectedAnswerIndex;

    const question = quizData[currentQuestionIndex];
    const correctIndex = question.correctAnswerIndex;

    document.querySelectorAll('.quiz-option').forEach((button, index) => {
        button.disabled = true;
        if (index === correctIndex) button.classList.add('correct');
        else if (index === selectedAnswerIndex) button.classList.add('incorrect');
    });

    const feedbackDiv = document.getElementById('quiz-feedback');
    const isLastQuestion = currentQuestionIndex === quizData.length - 1;
    feedbackDiv.innerHTML = `
        <button id="next-btn" class="btn btn-primary">
            ${isLastQuestion ? 'Finish Quiz' : 'Next Question'}
        </button>
    `;
    document.getElementById('next-btn').addEventListener('click', handleNext);
}

function handleNext() {
    if (currentQuestionIndex < quizData.length - 1) {
        currentQuestionIndex++;
        renderQuiz();
    } else {
        updateView('results');
        renderResults();
    }
}

// --- Initialization ---

async function initMainModule() {
    const topic = sessionStorage.getItem('quizTopic');

    if (!topic) {
        renderError("No topic was selected. Please go back and choose a topic.");
        return;
    }

    try {
        updateView('loading');
        const data = await generateQuiz(topic);
        quizData = data;
        userAnswers = new Array(data.length).fill(null);
        currentQuestionIndex = 0;
        updateView('quiz');
        renderQuiz();
    } catch (err) {
        renderError(err.message);
    }
}

// Start the main quiz module
initMainModule();

    