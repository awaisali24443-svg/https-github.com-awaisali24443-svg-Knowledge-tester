import * as progressService from '../../services/progressService.js';
import { NUM_QUESTIONS, MAX_LEVEL } from '../../constants.js';

console.log("Science Quiz module loaded.");

const levelDescriptors = {
    1: "Noob", 10: "Beginner", 20: "Intermediate", 
    30: "Advanced", 40: "Expert", 50: "Master"
};

function getLevelDescriptor(level) {
    const keys = Object.keys(levelDescriptors).map(Number).sort((a, b) => b - a);
    for (const key of keys) {
        if (level >= key) {
            return levelDescriptors[key];
        }
    }
    return "Noob";
}

function handleTopicSelect(event) {
    const card = event.currentTarget;
    const topic = card.dataset.topic;
    if (!topic) return;

    const level = progressService.getCurrentLevel(topic);
    const descriptor = getLevelDescriptor(level);

    // Store context for the quiz and results page
    const quizContext = {
        topicName: topic,
        level: level,
        returnHash: '#science-quiz'
    };
    sessionStorage.setItem('quizContext', JSON.stringify(quizContext));

    // Create a more detailed, conversational prompt for the AI
    const prompt = `
        You are an AI quiz maker for "Knowledge Tester".
        Your goal is to make learning fun and engaging, so use a natural, human-like, conversational tone as if you're a friendly teacher or quiz host.
        Avoid robotic, academic language.
        
        Please create a quiz with ${NUM_QUESTIONS} multiple-choice questions for the topic "${topic}".
        The difficulty should be tailored for a user at Level ${level} out of ${MAX_LEVEL} (${descriptor} level).
        For each question, provide 4 clear options and ensure one is correct.
        Before finalizing, please re-read your questions to ensure they sound natural and conversational.
    `;
    sessionStorage.setItem('quizTopicPrompt', prompt);
    sessionStorage.setItem('quizTopicName', topic); // For loading messages

    // Navigate to loading screen
    window.location.hash = '#loading';
}


function initializeTopicCards() {
    const topicCards = document.querySelectorAll('.topic-card-flipper');
    topicCards.forEach(card => {
        const topic = card.dataset.topic;
        const level = progressService.getCurrentLevel(topic);
        const descriptor = getLevelDescriptor(level);

        const levelDisplays = card.querySelectorAll('.level-display');
        const levelDescriptorEl = card.querySelector('.level-descriptor');
        
        levelDisplays.forEach(el => el.textContent = `Level ${level}`);
        if (levelDescriptorEl) levelDescriptorEl.textContent = descriptor;
        
        card.addEventListener('click', handleTopicSelect);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                handleTopicSelect(e);
            }
        });
    });
}

// Initial setup
initializeTopicCards();