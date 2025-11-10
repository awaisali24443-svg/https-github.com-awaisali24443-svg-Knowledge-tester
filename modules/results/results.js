const scoreMessages = {
    perfect: { title: "Flawless Victory!", subtitle: "Your knowledge is unparalleled!" },
    great: { title: "Excellent Work!", subtitle: "You have a strong command of this topic." },
    good: { title: "Well Done!", subtitle: "A solid performance. Keep up the great work!" },
    average: { title: "Not Bad!", subtitle: "You're on the right track. A little more study will make a big difference." },
    poor: { title: "Room for Improvement", subtitle: "Every master was once a beginner. This is a great learning opportunity!" },
};

function displayResults(results) {
    const { score, totalQuestions, quizData, userAnswers } = results;
    
    // --- 1. Calculate Score and Get Messages ---
    const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
    let messageKey = 'poor';
    if (percentage === 100) messageKey = 'perfect';
    else if (percentage >= 80) messageKey = 'great';
    else if (percentage >= 60) messageKey = 'good';
    else if (percentage >= 40) messageKey = 'average';

    // --- 2. Update Summary UI ---
    document.getElementById('results-title').textContent = scoreMessages[messageKey].title;
    document.getElementById('results-subtitle').textContent = scoreMessages[messageKey].subtitle;
    document.getElementById('score-text').textContent = `${score}/${totalQuestions}`;
    document.getElementById('results-message').textContent = `You scored ${percentage.toFixed(0)}%.`;

    // --- 3. Update Score Ring Animation ---
    const scoreRingFg = document.getElementById('score-ring-fg');
    // Use setTimeout to ensure the transition plays after the element is rendered
    setTimeout(() => {
        scoreRingFg.style.strokeDasharray = `${percentage}, 100`;
    }, 100);

    // --- 4. Populate Question Review ---
    const reviewContainer = document.getElementById('review-container');
    reviewContainer.innerHTML = ''; // Clear previous content

    quizData.questions.forEach((q, index) => {
        const userAnswerIndex = userAnswers[index];
        const correctAnswerIndex = q.correctAnswerIndex;
        
        const optionsHtml = q.options.map((option, optIndex) => {
            let className = '';
            if (optIndex === correctAnswerIndex) {
                className = 'correct-answer';
            } else if (optIndex === userAnswerIndex) {
                className = 'incorrect-answer';
            }
            return `<li class="${className}">${option}</li>`;
        }).join('');

        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        reviewItem.innerHTML = `
            <p class="review-question">${index + 1}. ${q.question}</p>
            <ul class="review-options">${optionsHtml}</ul>
            <p class="review-explanation"><strong>Explanation:</strong> ${q.explanation}</p>
        `;
        reviewContainer.appendChild(reviewItem);
    });
}

export function init(appState) {
    console.log("Results module initialized.");
    const results = appState.context?.results;

    if (!results) {
        console.error("No results data found!");
        window.location.hash = '#home'; // Redirect if no data
        return;
    }

    displayResults(results);
}

export function destroy() {
    console.log("Results module destroyed.");
}