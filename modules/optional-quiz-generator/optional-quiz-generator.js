// optional-quiz-generator.js - Logic for the quiz topic selection

const topicForm = document.getElementById('topic-form');
const topicInput = document.getElementById('topic-input');
const generateQuizBtn = document.getElementById('generate-quiz-btn');
const difficultyButtonsContainer = document.querySelector('.difficulty-buttons');

if (topicForm) {
    generateQuizBtn.disabled = true;

    topicInput.addEventListener('input', () => {
        generateQuizBtn.disabled = !topicInput.value.trim();
    });

    // Handle difficulty selection
    let selectedDifficulty = 'Medium'; // Default
    if (difficultyButtonsContainer) {
        difficultyButtonsContainer.addEventListener('click', (e) => {
            const target = e.target.closest('.difficulty-btn');
            if (!target) return;

            difficultyButtonsContainer.querySelectorAll('.difficulty-btn').forEach(btn => btn.classList.remove('active'));
            target.classList.add('active');

            selectedDifficulty = target.dataset.difficulty;
        });
    }


    topicForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const topic = topicInput.value.trim();
        if (!topic) return;

        // Construct prompt with difficulty
        const fullTopic = `Generate an ${selectedDifficulty.toLowerCase()} quiz about "${topic}"`;
        sessionStorage.setItem('quizTopic', fullTopic);
        
        window.location.hash = '#loading';
    });
}