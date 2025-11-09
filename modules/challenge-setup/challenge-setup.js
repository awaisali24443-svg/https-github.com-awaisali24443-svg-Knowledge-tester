import { startQuizFlow } from '../../services/navigationService.js';
import { playSound } from '../../services/soundService.js';
import { SceneManager } from '../../services/threeManager.js';

let sceneManager;

const startBtn = document.getElementById('start-challenge-btn');

async function handleStartChallenge() {
    playSound('start');

    // Generate a larger set of questions for variety during the timed challenge
    const prompt = `Generate a large quiz with 20 varied multiple-choice questions from different fields like Programming, Science, and Technology. The difficulty should be mixed (Easy to Hard).`;
    
    const quizContext = {
        topicName: 'Challenge Mode',
        isLeveled: false,
        isChallenge: true, // Flag this as a challenge quiz
        prompt: prompt,
        returnHash: '#home',
        generationType: 'quiz'
    };
    
    await startQuizFlow(quizContext);
}

function init() {
    if (startBtn) {
        startBtn.addEventListener('click', handleStartChallenge);
    }
    const canvas = document.querySelector('.background-canvas');
    if (canvas && window.THREE) {
        sceneManager = new SceneManager(canvas);
        sceneManager.init('dataStream');
    }
}

window.addEventListener('hashchange', () => {
    if (sceneManager) {
        sceneManager.destroy();
        sceneManager = null;
    }
}, { once: true });


init();