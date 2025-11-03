console.log("Historical Knowledge module loaded.");

const topicGrid = document.querySelector('.topic-grid');

if (topicGrid) {
    topicGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.topic-card');
        const difficultyBtn = e.target.closest('.difficulty-btn');

        if (difficultyBtn) {
            const topic = card.dataset.topic;
            const difficulty = difficultyBtn.dataset.difficulty;
            
            const fullTopic = `Generate an ${difficulty.toLowerCase()} quiz on the key events, figures, and concepts of ${topic}`;
            sessionStorage.setItem('quizTopic', fullTopic);
            window.location.hash = '#loading';
            return; 
        }
        
        if (card) {
            const isSelected = card.classList.contains('selected');
            document.querySelectorAll('.topic-card').forEach(c => c.classList.remove('selected'));
            
            if (!isSelected) {
                card.classList.add('selected');
                topicGrid.classList.add('selection-active');
            } else {
                topicGrid.classList.remove('selection-active');
            }

        } else {
            document.querySelectorAll('.topic-card').forEach(c => c.classList.remove('selected'));
            topicGrid.classList.remove('selection-active');
        }
    });
}